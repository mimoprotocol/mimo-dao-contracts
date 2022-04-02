// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IVotingEscrow.sol";
    
contract VeBatchLocker {
    IVotingEscrow public ve;

    constructor (address _ve) {
        ve = IVotingEscrow(_ve);
        require(
            IERC20(ve.token()).approve(address(ve), type(uint256).max),
            "VeBatchLocker: approve token to ve failure"
        );
    }

    function lock(
        address[] calldata addrs,
        uint256[] calldata amounts,
        uint256 duration
    ) external {
        require(addrs.length == amounts.length, "VeBatchLocker: dismatch lock data");
        require(duration >= 604800, "VeBatchLocker: duration less than a week");
        require(duration <= 126144000, "VeBatchLocker: duration greater than four years");
        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(addrs[i] != address(0), "VeBatchLocker: lock address can't be zero");
            require(amounts[i] > 0, "VeBatchLocker: lock amount can't be zero");
            total += amounts[i];
        }
        require(
            IERC20(ve.token()).transferFrom(msg.sender, address(this), total),
            "VeBatchLocker: transfer token failure"
        );
        
        uint256 unlockTime = block.timestamp + duration;
        for (uint256 i = 0; i < addrs.length; i++) {
            (int128 amount, ) = ve.locked(addrs[i]);
            if (amount == 0) {
                ve.create_lock_for(addrs[i], amounts[i], unlockTime);
            } else {
                ve.deposit_for(addrs[i], amounts[i], address(this));
            }
        }
    }
}
