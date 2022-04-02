# @version 0.2.16
"""
@title Token Minter with vesting
@author Mimo Protocol
@license MIT
"""

interface LiquidityGauge:
    # Presumably, other gauges will provide the same interfaces
    def integrate_fraction(addr: address) -> uint256: view
    def user_checkpoint(addr: address) -> bool: nonpayable

interface MERC20:
    def mint(_to: address, _value: uint256) -> bool: nonpayable
    def approve(_spender: address, _value: uint256) -> bool: nonpayable

interface GaugeController:
    def gauge_types(addr: address) -> int128: view

interface VestingMaster:
    def lock(_addr: address, _value: uint256) -> bool: nonpayable
    def lockedPeriodAmount() -> uint256: view

interface VotingEscrow:
    def token() -> address: view
    def locked__end(addr: address) -> uint256: view
    def create_lock_for(addr: address, _value: uint256, _unlock_time: uint256): nonpayable
    def deposit_for(addr: address, _value: uint256, _wallet: address): nonpayable


event Minted:
    recipient: indexed(address)
    gauge: address
    minted: uint256

event VestingMasterSetted:
    vestingMaster: indexed(address)

event UpdateMiningParameters:
    time: uint256
    rate: uint256

event CommitOwnership:
    admin: address

event ApplyOwnership:
    admin: address


WEEK: constant(uint256) = 604800
RATE_CHANGE_TIME: constant(uint256) = WEEK


token: public(address)
controller: public(address)
vesting_master: public(address)

# Mining variables
start_change_time: public(uint256)
future_rate: public(uint256)
rate: public(uint256)

# user -> gauge -> value
minted: public(HashMap[address, HashMap[address, uint256]])

# minter -> user -> can mint?
allowed_to_mint_for: public(HashMap[address, HashMap[address, bool]])

admin: public(address)
future_admin: public(address)  # Can and will be a smart contract


# compound variables
voting_escrow: public(address)
compound_lock_duration: public(uint256)
compound_user: public(HashMap[address, bool])


@external
def __init__(_token: address, _controller: address, _rate: uint256):
    self.token = _token
    self.controller = _controller
    self.admin = msg.sender
    
    self.start_change_time = block.timestamp
    self.future_rate = _rate


@internal
def _mint_for(gauge_addr: address, _for: address):
    assert GaugeController(self.controller).gauge_types(gauge_addr) >= 0, "gauge is not added"

    LiquidityGauge(gauge_addr).user_checkpoint(_for)
    total_mint: uint256 = LiquidityGauge(gauge_addr).integrate_fraction(_for)
    to_mint: uint256 = total_mint - self.minted[_for][gauge_addr]

    if to_mint != 0:
        if self.compound_lock_duration > 0 and self.compound_user[_for]:
            MERC20(self.token).mint(self, to_mint)
            lock_end: uint256 = VotingEscrow(self.voting_escrow).locked__end(_for)
            if lock_end == 0:
                VotingEscrow(self.voting_escrow).create_lock_for(_for, to_mint, block.timestamp + self.compound_lock_duration)
            else:
                assert lock_end >= block.timestamp + self.compound_lock_duration, "Can't compound by too short lock time"
                VotingEscrow(self.voting_escrow).deposit_for(_for, to_mint, self)
        else:
            locked: uint256 = 0
            if self.vesting_master != ZERO_ADDRESS:
                period_amount: uint256 = VestingMaster(self.vesting_master).lockedPeriodAmount()
                locked = to_mint * period_amount / (period_amount + 1)
            
            MERC20(self.token).mint(_for, to_mint - locked)
            if locked > 0:
                MERC20(self.token).mint(self.vesting_master, locked)
                VestingMaster(self.vesting_master).lock(_for, locked)

            self.minted[_for][gauge_addr] = total_mint
            log Minted(_for, gauge_addr, total_mint)


@external
@nonreentrant('lock')
def mint(gauge_addr: address):
    """
    @notice Mint everything which belongs to `msg.sender` and send to them
    @param gauge_addr `LiquidityGauge` address to get mintable amount from
    """
    self._mint_for(gauge_addr, msg.sender)


@external
@nonreentrant('lock')
def mint_many(gauge_addrs: address[8]):
    """
    @notice Mint everything which belongs to `msg.sender` across multiple gauges
    @param gauge_addrs List of `LiquidityGauge` addresses
    """
    for i in range(8):
        if gauge_addrs[i] == ZERO_ADDRESS:
            break
        self._mint_for(gauge_addrs[i], msg.sender)


@external
@nonreentrant('lock')
def mint_for(gauge_addr: address, _for: address):
    """
    @notice Mint tokens for `_for`
    @dev Only possible when `msg.sender` has been approved via `toggle_approve_mint`
    @param gauge_addr `LiquidityGauge` address to get mintable amount from
    @param _for Address to mint to
    """
    if self.allowed_to_mint_for[msg.sender][_for]:
        self._mint_for(gauge_addr, _for)


@external
def set_rate(_rate: uint256):
    assert msg.sender == self.admin, "admin only"
    self.start_change_time = block.timestamp + RATE_CHANGE_TIME
    self.future_rate = _rate


@external
def set_vesting_master(addr: address):
    """
    @notice set vesting master to `addr`
    @param addr Address set vesting master
    """
    assert msg.sender == self.admin, "admin only"
    self.vesting_master = addr
    log VestingMasterSetted(addr)


@external
def toggle_approve_mint(minting_user: address):
    """
    @notice allow `minting_user` to mint for `msg.sender`
    @param minting_user Address to toggle permission for
    """
    self.allowed_to_mint_for[minting_user][msg.sender] = not self.allowed_to_mint_for[minting_user][msg.sender]


@external
def commit_transfer_ownership(addr: address):
    """
    @notice Transfer ownership of Minter to `addr`
    @param addr Address to have ownership transferred to
    """
    assert msg.sender == self.admin, "admin only"
    self.future_admin = addr
    log CommitOwnership(addr)


@external
def apply_transfer_ownership():
    """
    @notice Apply pending ownership transfer
    """
    assert msg.sender == self.admin, "admin only"
    _admin: address = self.future_admin
    assert _admin != ZERO_ADDRESS, "admin not set"
    self.admin = _admin
    log ApplyOwnership(_admin)


@internal
def _update_mining_parameters():
    """
    @dev Update mining rate
         Any modifying mining call must also call this
    """

    if self.future_rate > 0:
        self.rate = self.future_rate
        self.future_rate = 0
        log UpdateMiningParameters(block.timestamp, self.rate)


@external
def update_mining_parameters():
    """
    @notice Update mining rate and supply at the start of the epoch
    @dev Callable by any address, but only once per epoch
         Total supply becomes slightly larger if this function is called late
    """
    assert block.timestamp >= self.start_change_time,  "too soon!"
    self._update_mining_parameters()


@external
def future_change_time_write() -> uint256:
    """
    @notice Get timestamp of the next mining epoch start
            while simultaneously updating mining parameters
    @return Timestamp of the next epoch
    """
    if self.future_rate > 0 and block.timestamp >= self.start_change_time:
        self._update_mining_parameters()
    
    return block.timestamp + RATE_CHANGE_TIME


@external
def set_compound_parameters(_voting_escrow: address, _compound_lock_duration: uint256):
    """
    @notice Set compound lock duration. If set to zero, then stop compound feature.
    @param _voting_escrow Address for VotingEscrow
    @param _compound_lock_duration Minimum duration for locked
    """
    assert msg.sender == self.admin, "admin only"
    assert _voting_escrow != ZERO_ADDRESS, "VotingEscrow address can't be zero"
    assert VotingEscrow(_voting_escrow).token() == self.token, "VotingEscrow token isn't mint token"
    if _compound_lock_duration == 0:
        self.voting_escrow = ZERO_ADDRESS
        MERC20(self.token).approve(_voting_escrow, 0)
    else:
        self.voting_escrow = _voting_escrow
        MERC20(self.token).approve(_voting_escrow, MAX_UINT256)

    self.compound_lock_duration = _compound_lock_duration


@external
def register_compound():
    """
    @notice Register to use compound for rewards
    """
    assert self.compound_lock_duration > 0, "Compound mode is closed"
    if not self.compound_user[msg.sender]:
        self.compound_user[msg.sender] = True


@external
def cancel_compound():
    """
    @notice Cancel compound for rewards
    """
    if self.compound_user[msg.sender]:
        self.compound_user[msg.sender] = False
