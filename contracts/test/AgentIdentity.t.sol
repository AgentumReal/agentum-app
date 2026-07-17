// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AgentIdentity} from "../src/AgentIdentity.sol";

contract AgentIdentityTest is Test {
    AgentIdentity id;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        id = new AgentIdentity();
    }

    function test_Mint_AssignsHandleAndOwner() public {
        uint256 tokenId = id.mint(alice, "atlas");
        assertEq(tokenId, 1);
        assertEq(id.ownerOf(1), alice);
        assertEq(id.handleOf(1), "atlas");
    }

    function test_Mint_IncrementsId() public {
        id.mint(alice, "atlas");
        uint256 t2 = id.mint(bob, "nova");
        assertEq(t2, 2);
    }

    function test_Revert_DuplicateHandle_CaseInsensitive() public {
        id.mint(alice, "atlas");
        vm.expectRevert(bytes("handle taken"));
        id.mint(bob, "ATLAS");
    }

    function test_Revert_HandleTooShort() public {
        vm.expectRevert(bytes("handle length"));
        id.mint(alice, "ab");
    }

    function test_IsHandleAvailable() public {
        assertTrue(id.isHandleAvailable("fresh"));
        id.mint(alice, "fresh");
        assertFalse(id.isHandleAvailable("fresh"));
        assertFalse(id.isHandleAvailable("FRESH"));
    }
}
