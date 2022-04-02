// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20PICO is ERC20, Ownable {
    event MinterAdded(address indexed minter, uint256 activeTime);
    event MinterRemoved(address indexed minter);

    uint256 private constant INITIAL_SUPPLY = 35_000_000;
    uint256 private constant MINTER_ACTIVE_DELAY = 84600 * 3;

    // address => active timestamp
    mapping(address => uint256) public minters;

    modifier onlyMinter() {
        require(
            minters[msg.sender] > 0 && minters[msg.sender] + MINTER_ACTIVE_DELAY <= block.timestamp,
            "ERC20PICO: caller is not the minter"
        );
        _;
    }

    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {
        _mint(msg.sender, INITIAL_SUPPLY * 10 ** 18);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function mint(address account, uint256 amount) external onlyMinter returns (bool) {
        _mint(account, amount);
        return true;
    }

    function addMinter(address minter) external onlyOwner {
        if (minters[minter] == 0) {
            minters[minter] = block.timestamp;
            emit MinterAdded(minter, block.timestamp + MINTER_ACTIVE_DELAY);
        }
    }

    function removeMinter(address minter) external onlyOwner {
        if (minters[minter] > 0) {
            minters[minter] = 0;
            emit MinterRemoved(minter);
        }
    }
}
