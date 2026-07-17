// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {JobEscrow} from "../src/JobEscrow.sol";
import {Reputation} from "../src/Reputation.sol";
import {MockUSDT} from "../src/MockUSDT.sol";

contract JobEscrowTest is Test {
    MockUSDT usdt;
    Reputation rep;
    JobEscrow escrow;

    address owner = address(this);
    address feeRecipient = address(0xFEE);
    address client = address(0xC11E17);
    address provider = address(0x9803D);

    uint16 constant FEE_BPS = 200; // 2%
    uint64 constant WINDOW = 1 hours;

    function setUp() public {
        usdt = new MockUSDT();
        rep = new Reputation();
        escrow = new JobEscrow(address(usdt), address(rep), feeRecipient, FEE_BPS, WINDOW);
        rep.setWriter(address(escrow), true);

        // 给 client 一些 USDT 并授权 escrow
        usdt.mintTo(client, 10_000 ether);
        vm.prank(client);
        usdt.approve(address(escrow), type(uint256).max);
    }

    function _open(uint256 amount) internal returns (uint256 jobId) {
        vm.prank(client);
        jobId = escrow.openJob(provider, amount, 3 days);
    }

    function test_OpenJob_EscrowsFunds() public {
        uint256 jobId = _open(1000 ether);
        assertEq(usdt.balanceOf(address(escrow)), 1000 ether);
        JobEscrow.Job memory j = escrow.getJob(jobId);
        assertEq(j.client, client);
        assertEq(j.provider, provider);
        assertEq(uint8(j.status), uint8(JobEscrow.Status.Escrowed));
    }

    function test_HappyPath_DeliverAndClientSettle() public {
        uint256 jobId = _open(1000 ether);

        vm.prank(provider);
        escrow.deliver(jobId, keccak256("deliverable"));

        vm.prank(client);
        escrow.settle(jobId);

        // 2% fee → provider 得 980,fee 得 20
        assertEq(usdt.balanceOf(provider), 980 ether);
        assertEq(usdt.balanceOf(feeRecipient), 20 ether);
        assertEq(usdt.balanceOf(address(escrow)), 0);
        assertEq(rep.score(provider), 100);
        (uint64 completed, uint64 onTime,,) = rep.records(provider);
        assertEq(completed, 1);
        assertEq(onTime, 1);
    }

    function test_Settle_AfterWindow_ByAnyone() public {
        uint256 jobId = _open(500 ether);
        vm.prank(provider);
        escrow.deliver(jobId, keccak256("d"));

        // 窗口内非 client 不能结算
        vm.expectRevert(bytes("in challenge window"));
        vm.prank(address(0xBEEF));
        escrow.settle(jobId);

        // 窗口过后任何人可结算
        vm.warp(block.timestamp + WINDOW + 1);
        vm.prank(address(0xBEEF));
        escrow.settle(jobId);
        assertEq(usdt.balanceOf(provider), 490 ether);
    }

    function test_Challenge_ThenProviderWins() public {
        uint256 jobId = _open(1000 ether);
        vm.prank(provider);
        escrow.deliver(jobId, keccak256("d"));

        vm.prank(client);
        escrow.challenge(jobId);

        // owner(评估员预言机)裁定 provider 胜
        escrow.resolveDispute(jobId, true);
        assertEq(usdt.balanceOf(provider), 980 ether);
        (,, uint64 won,) = rep.records(provider);
        assertEq(won, 1);
    }

    function test_Challenge_ThenClientWins_Refund() public {
        uint256 jobId = _open(1000 ether);
        vm.prank(provider);
        escrow.deliver(jobId, keccak256("d"));
        vm.prank(client);
        escrow.challenge(jobId);

        uint256 before = usdt.balanceOf(client);
        escrow.resolveDispute(jobId, false);
        assertEq(usdt.balanceOf(client), before + 1000 ether); // 全额退回
        assertEq(usdt.balanceOf(provider), 0);
        (,,, uint64 lost) = rep.records(provider);
        assertEq(lost, 1);
    }

    function test_Cancel_WhileEscrowed_Refunds() public {
        uint256 jobId = _open(700 ether);
        uint256 before = usdt.balanceOf(client);
        vm.prank(client);
        escrow.cancel(jobId);
        assertEq(usdt.balanceOf(client), before + 700 ether);
    }

    function test_Revert_DeliverByNonProvider() public {
        uint256 jobId = _open(100 ether);
        vm.expectRevert(bytes("not provider"));
        vm.prank(client);
        escrow.deliver(jobId, keccak256("d"));
    }

    function test_Revert_SettleBeforeDeliver() public {
        uint256 jobId = _open(100 ether);
        vm.expectRevert(bytes("not delivered"));
        vm.prank(client);
        escrow.settle(jobId);
    }

    function test_Revert_ChallengeAfterWindow() public {
        uint256 jobId = _open(100 ether);
        vm.prank(provider);
        escrow.deliver(jobId, keccak256("d"));
        vm.warp(block.timestamp + WINDOW + 1);
        vm.expectRevert(bytes("window over"));
        vm.prank(client);
        escrow.challenge(jobId);
    }

    function test_Revert_ResolveByNonOwner() public {
        uint256 jobId = _open(100 ether);
        vm.prank(provider);
        escrow.deliver(jobId, keccak256("d"));
        vm.prank(client);
        escrow.challenge(jobId);

        vm.expectRevert();
        vm.prank(address(0xBAD));
        escrow.resolveDispute(jobId, true);
    }

    function test_LateDelivery_NotOnTime() public {
        uint256 jobId = _open(1000 ether);
        vm.warp(block.timestamp + 4 days); // 超过 3 天 deadline
        vm.prank(provider);
        escrow.deliver(jobId, keccak256("d"));
        vm.prank(client);
        escrow.settle(jobId);
        (uint64 completed, uint64 onTime,,) = rep.records(provider);
        assertEq(completed, 1);
        assertEq(onTime, 0); // 迟交,不算 on-time
    }

    function testFuzz_FeeMath(uint96 amount) public {
        vm.assume(amount > 0 && amount < 1_000_000 ether);
        usdt.mintTo(client, amount);
        vm.prank(client);
        uint256 jobId = escrow.openJob(provider, amount, 1 days);
        vm.prank(provider);
        escrow.deliver(jobId, keccak256("d"));
        vm.prank(client);
        escrow.settle(jobId);

        uint256 fee = (uint256(amount) * FEE_BPS) / 10_000;
        assertEq(usdt.balanceOf(feeRecipient), fee);
        assertEq(usdt.balanceOf(provider), uint256(amount) - fee);
    }

    // ── Open Brief 竞价流程 ──

    function test_BidFlow_PostBidAcceptDeliverSettle() public {
        // ① client 发布需求
        vm.prank(client);
        uint256 reqId = escrow.postRequest("Audit my Solidity contract");

        // ② provider 竞价 200 USDT / 5 天
        vm.prank(provider);
        uint256 bidIdx = escrow.placeBid(reqId, 200 ether, 5);
        assertEq(escrow.bidCount(reqId), 1);

        // ③ client 接受报价 → 此刻托管
        vm.prank(client);
        uint256 jobId = escrow.acceptBid(reqId, bidIdx);
        assertEq(usdt.balanceOf(address(escrow)), 200 ether);

        // ④⑤ 交付 + 结算
        vm.prank(provider);
        escrow.deliver(jobId, keccak256("report"));
        vm.prank(client);
        escrow.settle(jobId);

        assertEq(usdt.balanceOf(provider), 196 ether); // 200 - 2%
        assertEq(usdt.balanceOf(feeRecipient), 4 ether);
    }

    function test_BidFlow_MultipleBids_PickOne() public {
        vm.prank(client);
        uint256 reqId = escrow.postRequest("Need a logo");

        vm.prank(provider);
        escrow.placeBid(reqId, 100 ether, 3);
        address prov2 = address(0xAAAA);
        vm.prank(prov2);
        uint256 chosen = escrow.placeBid(reqId, 80 ether, 4);
        assertEq(escrow.bidCount(reqId), 2);

        vm.prank(client);
        uint256 jobId = escrow.acceptBid(reqId, chosen);
        JobEscrow.Job memory j = escrow.getJob(jobId);
        assertEq(j.provider, prov2);
        assertEq(j.amount, 80 ether);
    }

    function test_Revert_ClientCannotBid() public {
        vm.prank(client);
        uint256 reqId = escrow.postRequest("x");
        vm.expectRevert(bytes("client cannot bid"));
        vm.prank(client);
        escrow.placeBid(reqId, 10 ether, 1);
    }

    function test_Revert_AcceptByNonClient() public {
        vm.prank(client);
        uint256 reqId = escrow.postRequest("x");
        vm.prank(provider);
        escrow.placeBid(reqId, 10 ether, 1);
        vm.expectRevert(bytes("not request owner"));
        vm.prank(provider);
        escrow.acceptBid(reqId, 0);
    }

    function test_Revert_BidOnClosedRequest() public {
        vm.prank(client);
        uint256 reqId = escrow.postRequest("x");
        vm.prank(provider);
        escrow.placeBid(reqId, 50 ether, 1);
        vm.prank(client);
        escrow.acceptBid(reqId, 0);
        // 需求已关闭
        vm.expectRevert(bytes("request closed"));
        vm.prank(address(0xAAAA));
        escrow.placeBid(reqId, 40 ether, 1);
    }

    function test_WithdrawBid_ThenCannotAccept() public {
        vm.prank(client);
        uint256 reqId = escrow.postRequest("x");
        vm.prank(provider);
        escrow.placeBid(reqId, 50 ether, 1);
        vm.prank(provider);
        escrow.withdrawBid(reqId, 0);
        vm.expectRevert(bytes("bid inactive"));
        vm.prank(client);
        escrow.acceptBid(reqId, 0);
    }
}
