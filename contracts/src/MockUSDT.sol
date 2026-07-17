// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDT — 测试网稳定币,带公开水龙头
/// @notice 仅用于 BSC 测试网。任何人可调 faucet() 领取测试资金用于托管演示。
contract MockUSDT is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 1000 ether; // 1000 USDT(18 位小数)
    mapping(address => uint256) public lastFaucet;
    uint256 public constant FAUCET_COOLDOWN = 1 hours;

    constructor() ERC20("Agentum Mock USDT", "USDT") {
        _mint(msg.sender, 1_000_000 ether);
    }

    /// @notice 领取测试 USDT(每小时一次)
    function faucet() external {
        require(block.timestamp - lastFaucet[msg.sender] >= FAUCET_COOLDOWN, "faucet: cooldown");
        lastFaucet[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice 测试便捷:任意 mint(仅测试网,生产删掉)
    function mintTo(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
