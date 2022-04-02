// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IVotingEscrow {
    function token() external view returns (address);
    function migrate(address _addr) external returns (uint256);
}

interface ive {
    function token() external view returns (address);
    function deposit_for(uint256 _tokenId, uint256 _value) external;
    function create_lock_for(
        uint256 _value,
        uint256 _lock_duration,
        address _to
    ) external returns (uint256);
}

contract SimpleMigrator is ReentrancyGuard {
    address public origin;
    address public target;

    constructor(
        address _origin,
        address _target
    ) {
        require(
            IVotingEscrow(_origin).token() == ive(_target).token(),
            "SimpleMigrator: Not the same ve"
        );
        origin = _origin;
        target = _target;
    }

    function destroyOrigin() internal returns (uint256) {
        IERC20 _token = IERC20(IVotingEscrow(origin).token());
        uint256 balance = _token.balanceOf(address(this));
        uint256 _value = IVotingEscrow(origin).migrate(msg.sender);
        require(
            _value > 0,
            "SimpleMigrator: migrate amount can't be zero"
        );
        require(
            balance + _value == _token.balanceOf(address(this)),
            "SimpleMigrator: migrate amount dismatch"
        );
        return _value;
    }

    function create_lock(uint256 _lock_duration) external nonReentrant {
        uint256 _value = destroyOrigin();
        ive(target).create_lock_for(_value, _lock_duration, msg.sender);
    }

    function deposit_for(uint256 _tokenId) external nonReentrant {
        uint256 _value = destroyOrigin();
        ive(target).deposit_for(_tokenId, _value);
    }
}
