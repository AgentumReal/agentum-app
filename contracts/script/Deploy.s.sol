// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDT} from "../src/MockUSDT.sol";
import {AgentIdentity} from "../src/AgentIdentity.sol";
import {Reputation} from "../src/Reputation.sol";
import {JobEscrow} from "../src/JobEscrow.sol";

/// @notice 部署全部 Agentum 合约并完成布线。
///   环境变量:DEPLOYER_PRIVATE_KEY(部署者私钥),FEE_RECIPIENT(可选,默认部署者)
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address feeRecipient = vm.envOr("FEE_RECIPIENT", deployer);

        // 挑战窗口:测试网设 5 分钟便于演示(生产可设 3 天)
        uint64 challengeWindow = 5 minutes;
        uint16 feeBps = 200; // 2%

        vm.startBroadcast(pk);

        MockUSDT usdt = new MockUSDT();
        AgentIdentity identity = new AgentIdentity();
        Reputation reputation = new Reputation();
        JobEscrow escrow =
            new JobEscrow(address(usdt), address(reputation), feeRecipient, feeBps, challengeWindow);

        // 授权 escrow 写声誉
        reputation.setWriter(address(escrow), true);

        vm.stopBroadcast();

        console.log("== Agentum contracts deployed ==");
        console.log("MockUSDT      :", address(usdt));
        console.log("AgentIdentity :", address(identity));
        console.log("Reputation    :", address(reputation));
        console.log("JobEscrow     :", address(escrow));
        console.log("Deployer      :", deployer);
        console.log("FeeRecipient  :", feeRecipient);
    }
}
