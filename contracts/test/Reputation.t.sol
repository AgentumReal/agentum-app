// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Reputation} from "../src/Reputation.sol";

contract ReputationTest is Test {
    Reputation rep;
    address writer = address(0x7217E4);
    address provider = address(0x9803D);

    function setUp() public {
        rep = new Reputation();
        rep.setWriter(writer, true);
    }

    function test_DefaultScore_Is100() public view {
        assertEq(rep.score(provider), 100);
    }

    function test_RecordSettled_KeepsScore100() public {
        vm.startPrank(writer);
        rep.recordSettled(provider, true);
        rep.recordSettled(provider, false);
        vm.stopPrank();
        assertEq(rep.score(provider), 100);
        (uint64 completed, uint64 onTime,,) = rep.records(provider);
        assertEq(completed, 2);
        assertEq(onTime, 1);
    }

    function test_DisputeLost_LowersScore() public {
        vm.startPrank(writer);
        rep.recordSettled(provider, true); // 1 good
        rep.recordDispute(provider, false); // 1 lost
        vm.stopPrank();
        // good = completed(1) - min(lost1,completed1)=0 +won0 =0? denom = 1+0+1=2 => 0
        uint256 s = rep.score(provider);
        assertLt(s, 100);
    }

    function test_Revert_NonWriter() public {
        vm.expectRevert(bytes("not writer"));
        vm.prank(address(0xBAD));
        rep.recordSettled(provider, true);
    }

    function test_OnlyOwner_SetWriter() public {
        vm.expectRevert();
        vm.prank(address(0xBAD));
        rep.setWriter(address(0x1), true);
    }
}
