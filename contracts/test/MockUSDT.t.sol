// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {MockUSDT} from "../src/MockUSDT.sol";

contract MockUSDTTest is Test {
    MockUSDT usdt;
    address user = address(0x1234);

    function setUp() public {
        // 真实链上 timestamp 是 ~17 亿;Foundry 默认从 1 开始,会误触发冷却。
        vm.warp(1_700_000_000);
        usdt = new MockUSDT();
    }

    function test_Faucet_MintsAmount() public {
        vm.prank(user);
        usdt.faucet();
        assertEq(usdt.balanceOf(user), usdt.FAUCET_AMOUNT());
    }

    function test_Revert_Faucet_Cooldown() public {
        vm.startPrank(user);
        usdt.faucet();
        vm.expectRevert(bytes("faucet: cooldown"));
        usdt.faucet();
        vm.stopPrank();
    }

    function test_Faucet_AfterCooldown() public {
        vm.startPrank(user);
        usdt.faucet();
        vm.warp(block.timestamp + 1 hours);
        usdt.faucet();
        assertEq(usdt.balanceOf(user), usdt.FAUCET_AMOUNT() * 2);
        vm.stopPrank();
    }

    function test_Metadata() public view {
        assertEq(usdt.symbol(), "USDT");
        assertEq(usdt.decimals(), 18);
    }
}
