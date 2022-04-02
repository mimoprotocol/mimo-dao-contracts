// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "./interfaces/IVestingMaster.sol";

contract VestingMaster is IVestingMaster, ReentrancyGuard, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    IERC20 public override vestingToken;
    mapping(address => LockedReward[]) public override userLockedRewards;
    uint256 public immutable override period;
    uint256 public immutable override lockedPeriodAmount;
    uint256 public override totalLockedRewards;

    EnumerableSet.AddressSet private lockers;

    event LockerAdded(address indexed locker);
    event LockerRemoved(address indexed locker);

    constructor(
        uint256 _period,
        uint256 _lockedPeriodAmount,
        address _vestingToken
    ) {
        require(
            _vestingToken != address(0),
            "VestingMaster::constructor: Zero address"
        );
        require(_period > 0, "VestingMaster::constructor: Period zero");
        require(
            _lockedPeriodAmount > 0,
            "VestingMaster::constructor: Period amount zero"
        );
        vestingToken = IERC20(_vestingToken);
        period = _period;
        lockedPeriodAmount = _lockedPeriodAmount;
    }

    function lock(
        address account, uint256 amount
    ) external override nonReentrant onlyLocker returns (bool) {
        LockedReward[] memory oldLockedRewards = userLockedRewards[account];
        uint256 currentTimestamp = block.timestamp;
        LockedReward memory lockedReward;
        uint256 claimableAmount;
        for (uint256 i = 0; i < oldLockedRewards.length; i++) {
            lockedReward = oldLockedRewards[i];
            if (
                lockedReward.locked > 0 &&
                currentTimestamp >= lockedReward.timestamp
            ) {
                claimableAmount = claimableAmount.add(lockedReward.locked);
                delete oldLockedRewards[i];
            }
        }

        uint256 newStartTimestamp = (currentTimestamp / period) * period;
        uint256 newTimestamp;
        LockedReward memory newLockedReward;
        uint256 jj = 0;
        delete userLockedRewards[account];
        if (claimableAmount > 0) {
            userLockedRewards[account].push(
                LockedReward({
                    locked: claimableAmount,
                    timestamp: newStartTimestamp
                })
            );
        }
        for (uint256 i = 0; i < lockedPeriodAmount; i++) {
            newTimestamp = newStartTimestamp.add((i + 1) * period);
            newLockedReward = LockedReward({
                locked: amount / lockedPeriodAmount,
                timestamp: newTimestamp
            });
            for (uint256 j = jj; j < oldLockedRewards.length; j++) {
                lockedReward = oldLockedRewards[j];
                if (lockedReward.timestamp == newTimestamp) {
                    newLockedReward.locked = newLockedReward.locked.add(
                        lockedReward.locked
                    );
                    jj = j + 1;
                    break;
                }
            }
            userLockedRewards[account].push(newLockedReward);
        }
        totalLockedRewards = totalLockedRewards.add(amount);
        emit Lock(account, amount);
        return true;
    }

    function claim() external override nonReentrant returns (bool) {
        LockedReward[] storage lockedRewards = userLockedRewards[msg.sender];
        uint256 currentTimestamp = block.timestamp;
        LockedReward memory lockedReward;
        uint256 claimableAmount;
        for (uint256 i = 0; i < lockedRewards.length; i++) {
            lockedReward = lockedRewards[i];
            if (
                lockedReward.locked > 0 &&
                currentTimestamp > lockedReward.timestamp
            ) {
                claimableAmount = claimableAmount.add(lockedReward.locked);
                delete lockedRewards[i];
            }
        }
        totalLockedRewards = totalLockedRewards.sub(claimableAmount);
        vestingToken.safeTransfer(msg.sender, claimableAmount);
        emit Claim(msg.sender, claimableAmount);
        return true;
    }

    function getVestingAmount(address account)
        external
        view
        override
        returns (uint256 lockedAmount, uint256 claimableAmount)
    {
        LockedReward[] memory lockedRewards = userLockedRewards[account];
        uint256 currentTimestamp = block.timestamp;
        LockedReward memory lockedReward;
        for (uint256 i = 0; i < lockedRewards.length; i++) {
            lockedReward = lockedRewards[i];
            if (currentTimestamp > lockedReward.timestamp) {
                claimableAmount = claimableAmount.add(lockedReward.locked);
            } else {
                lockedAmount = lockedAmount.add(lockedReward.locked);
            }
        }
    }

    modifier onlyLocker() {
        require(
            lockers.contains(msg.sender),
            "VestingMaster: caller is not the locker"
        );
        _;
    }

    function addLocker(address locker) external onlyOwner {
        if (!lockers.contains(locker)) {
            lockers.add(locker);
            emit LockerAdded(locker);
        }
    }

    function remiveLocker(address locker) external onlyOwner {
        if (lockers.contains(locker)) {
            lockers.remove(locker);
            emit LockerRemoved(locker);
        }
    }

    function getLocker(uint256 index) external view returns (address) {
        return lockers.at(index);
    }

    function getLockersCount() public view returns (uint256) {
        return lockers.length();
    }
}
