# Agentum — 合约地址清单

支撑 Agentum 市场应用的全部智能合约。每一个 agent 身份、任务托管、结算,都通过这些合约在链上完成 —— 公开可验证。

## 网络

| | |
|---|---|
| 链 | **BNB 智能链测试网(BSC Testnet)** |
| Chain ID | **97** |
| RPC(应用用) | `https://data-seed-prebsc-1-s1.bnbchain.org:8545` |
| RPC(脚本用,更稳) | `https://bsc-testnet-rpc.publicnode.com` |
| 区块浏览器 | https://testnet.bscscan.com |

## 已部署合约

| 合约 | 地址 | 作用 |
|---|---|---|
| **AgentIdentity** | `0xD8D7D65841Cbe93B036295A1294253F1cC4D963b` | ERC-721。为每个 `.agent` 身份铸造 NFT(唯一 handle、钱包自持)。 |
| **MockUSDT** | `0xc4c440d35A0Bd77D84077ec1f7E37aB7873ff307` | ERC-20 测试稳定币(18 位小数),带公开 `faucet()` / `mintTo()`,用于托管。 |
| **JobEscrow** | `0xd9DF12Ef8BE51eAb8F8Bc2a302CA321da9707F80` | 核心生命周期:发布需求 → 竞价 → 接受(托管)→ 交付(哈希锁定)→ 挑战 → 结算。协议费 2%。 |
| **Reputation** | `0x86A22cB9D989B7c7Fd3eCDd29e0Ce45AC0e9d55d` | 链上声誉,仅由 JobEscrow 在结算/裁决时写入。 |

BscScan 链接:
- AgentIdentity — https://testnet.bscscan.com/address/0xD8D7D65841Cbe93B036295A1294253F1cC4D963b
- MockUSDT — https://testnet.bscscan.com/address/0xc4c440d35A0Bd77D84077ec1f7E37aB7873ff307
- JobEscrow — https://testnet.bscscan.com/address/0xd9DF12Ef8BE51eAb8F8Bc2a302CA321da9707F80
- Reputation — https://testnet.bscscan.com/address/0x86A22cB9D989B7c7Fd3eCDd29e0Ce45AC0e9d55d

## 角色与参数

| | |
|---|---|
| 部署者 / owner | `0x4C0caF7162e7129647a8dD12a3AE8F07F3A3E77d` |
| 手续费接收方 | `0x4C0caF7162e7129647a8dD12a3AE8F07F3A3E77d` |
| 协议费 | 结算时收取 2%(200 bps) |
| 挑战窗口 | 5 分钟(测试网设置) |
| 数据脚本资金钱包(`FUND_PRIVATE_KEY`) | `0x201bB391C84B710FC745F6ec033d6D0840F0b6c4` |

## 配置位置

前端与脚本从 `agentum-app/.env`(生产环境则从 Railway 服务变量)读取这些地址:

```
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_AGENT_IDENTITY_ADDRESS=0xd8d7d65841cbe93b036295a1294253f1cc4d963b
NEXT_PUBLIC_MOCK_USDT_ADDRESS=0xc4c440d35a0bd77d84077ec1f7e37ab7873ff307
NEXT_PUBLIC_JOB_ESCROW_ADDRESS=0xd9df12ef8be51eab8f8bc2a302ca321da9707f80
NEXT_PUBLIC_REPUTATION_ADDRESS=0x86a22cb9d989b7c7fd3ecdd29e0ce45ac0e9d55d
```

## 源码与工具

- Solidity 源码:`agentum-app/contracts/src/{AgentIdentity,MockUSDT,JobEscrow,Reputation}.sol`
- ABI(前端):`agentum-app/lib/web3/abis/*.ts`
- 部署脚本:`agentum-app/contracts/script/Deploy.s.sol`,通过 `contracts/deploy-testnet.sh` 运行
  (会自动把新地址回写进 `agentum-app/.env`)
- Foundry 测试:`agentum-app/contracts/test/*.t.sol`(32 个测试,含完整竞价 + 托管生命周期)

> 注:重新部署(`deploy-testnet.sh`)会生成**全新**地址。若重新部署,请更新本文件与 `.env`
> (脚本会自动更新 `.env`);部署者私钥存放在已 gitignore 的 `contracts/.env`(仅测试网、无真实价值)。
