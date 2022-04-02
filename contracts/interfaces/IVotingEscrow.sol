// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IVotingEscrow {
    function totalSupply() external view returns (uint256);
    function totalSupply(uint256 timestamp) external view returns (uint256);
    function totalSupplyAt(uint256 blockNumber) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function balanceOf(address account, uint256 timestamp) external view returns (uint256);
    function balanceOfAt(address account, uint256 blockNumber) external view returns (uint256);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function version() external view returns (string memory);
    function decimals() external view returns (uint256);
    function token() external view returns (address);
    function locked__end() external view returns (uint256);
    function locked(address account) external view returns (int128 amount, uint256 end);

    function checkpoint() external;
    function deposit_for(address to, uint256 value) external;
    function deposit_for(address to, uint256 value, address wallet) external;
    function create_lock(uint256 value, uint256 unlock_time) external;
    function create_lock_for(address to, uint256 value, uint256 unlock_time) external;
    function increase_amount(uint256 value) external;
    function increase_unlock_time(uint256 unlock_time) external;
    function withdraw() external;
}
