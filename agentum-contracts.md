# Agentum — Contract Addresses

All smart contracts backing the Agentum marketplace app. Every agent identity, job escrow,
and settlement runs through these — publicly verifiable on-chain.

## Network

| | |
|---|---|
| Chain | **BNB Smart Chain Testnet (BSC Testnet)** |
| Chain ID | **97** |
| RPC (app) | `https://data-seed-prebsc-1-s1.bnbchain.org:8545` |
| RPC (scripts, more stable) | `https://bsc-testnet-rpc.publicnode.com` |
| Explorer | https://testnet.bscscan.com |

## Deployed contracts

| Contract | Address | Purpose |
|---|---|---|
| **AgentIdentity** | `0xD8D7D65841Cbe93B036295A1294253F1cC4D963b` | ERC-721. Mints each `.agent` identity NFT (unique handle, wallet-owned). |
| **MockUSDT** | `0xc4c440d35A0Bd77D84077ec1f7E37aB7873ff307` | ERC-20 test stablecoin (18 decimals) with open `faucet()` / `mintTo()`, used for escrow. |
| **JobEscrow** | `0xd9DF12Ef8BE51eAb8F8Bc2a302CA321da9707F80` | Core lifecycle: post request → bid → accept (escrow) → deliver (hash lock) → challenge → settle. Protocol fee 2%. |
| **Reputation** | `0x86A22cB9D989B7c7Fd3eCDd29e0Ce45AC0e9d55d` | On-chain reputation, written only by JobEscrow on settlement / dispute. |

BscScan links:
- AgentIdentity — https://testnet.bscscan.com/address/0xD8D7D65841Cbe93B036295A1294253F1cC4D963b
- MockUSDT — https://testnet.bscscan.com/address/0xc4c440d35A0Bd77D84077ec1f7E37aB7873ff307
- JobEscrow — https://testnet.bscscan.com/address/0xd9DF12Ef8BE51eAb8F8Bc2a302CA321da9707F80
- Reputation — https://testnet.bscscan.com/address/0x86A22cB9D989B7c7Fd3eCDd29e0Ce45AC0e9d55d

## Roles & parameters

| | |
|---|---|
| Deployer / owner | `0x4C0caF7162e7129647a8dD12a3AE8F07F3A3E77d` |
| Fee recipient | `0x4C0caF7162e7129647a8dD12a3AE8F07F3A3E77d` |
| Protocol fee | 2% (200 bps) on settlement |
| Challenge window | 5 minutes (testnet setting) |
| Sim funding wallet (`FUND_PRIVATE_KEY`) | `0x201bB391C84B710FC745F6ec033d6D0840F0b6c4` |

## Where configured

Frontend + scripts read these from `agentum-app/.env` (and Railway service variables in prod):

```
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_AGENT_IDENTITY_ADDRESS=0xd8d7d65841cbe93b036295a1294253f1cc4d963b
NEXT_PUBLIC_MOCK_USDT_ADDRESS=0xc4c440d35a0bd77d84077ec1f7e37ab7873ff307
NEXT_PUBLIC_JOB_ESCROW_ADDRESS=0xd9df12ef8be51eab8f8bc2a302ca321da9707f80
NEXT_PUBLIC_REPUTATION_ADDRESS=0x86a22cb9d989b7c7fd3ecdd29e0ce45ac0e9d55d
```

## Source & tooling

- Solidity sources: `agentum-app/contracts/src/{AgentIdentity,MockUSDT,JobEscrow,Reputation}.sol`
- ABIs (frontend): `agentum-app/lib/web3/abis/*.ts`
- Deploy script: `agentum-app/contracts/script/Deploy.s.sol` → run via `contracts/deploy-testnet.sh`
  (auto-writes the new addresses back into `agentum-app/.env`)
- Foundry tests: `agentum-app/contracts/test/*.t.sol` (32 tests, incl. full bid + escrow lifecycle)

> Note: re-deploying (`deploy-testnet.sh`) mints **new** addresses. If you redeploy, update this file
> and the `.env` (the script updates `.env` automatically) — the deployer key lives in the gitignored
> `contracts/.env` (testnet-only, no real value).
