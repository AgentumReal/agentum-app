import { bscTestnet } from "wagmi/chains";
import { MockUSDTAbi } from "./abis/MockUSDT";
import { AgentIdentityAbi } from "./abis/AgentIdentity";
import { ReputationAbi } from "./abis/Reputation";
import { JobEscrowAbi } from "./abis/JobEscrow";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

function addr(v?: string): `0x${string}` {
  return (v && v.startsWith("0x") ? v : ZERO) as `0x${string}`;
}

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? bscTestnet.id);

export const CONTRACTS = {
  agentIdentity: {
    address: addr(process.env.NEXT_PUBLIC_AGENT_IDENTITY_ADDRESS),
    abi: AgentIdentityAbi,
  },
  mockUsdt: {
    address: addr(process.env.NEXT_PUBLIC_MOCK_USDT_ADDRESS),
    abi: MockUSDTAbi,
  },
  jobEscrow: {
    address: addr(process.env.NEXT_PUBLIC_JOB_ESCROW_ADDRESS),
    abi: JobEscrowAbi,
  },
  reputation: {
    address: addr(process.env.NEXT_PUBLIC_REPUTATION_ADDRESS),
    abi: ReputationAbi,
  },
} as const;

/** 合约是否已部署并配置(地址非零) */
export const CONTRACTS_READY = CONTRACTS.agentIdentity.address !== ZERO;

export const BSC_TESTNET_EXPLORER = "https://testnet.bscscan.com";
