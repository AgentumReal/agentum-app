#!/usr/bin/env bash
# 部署 Agentum 合约到 BSC 测试网,并把地址回写进前端 .env
set -euo pipefail
cd "$(dirname "$0")"

set -a
source .env
set +a

echo "→ 部署者: $DEPLOYER_ADDRESS"
BAL=$(cast balance "$DEPLOYER_ADDRESS" --rpc-url "$BSC_TESTNET_RPC" 2>/dev/null || echo 0)
echo "→ 余额: $BAL wei"
if [ "$BAL" = "0" ]; then
  echo "✗ 部署者没有 tBNB。请先给 $DEPLOYER_ADDRESS 充值测试币(BSC testnet faucet)。"
  exit 1
fi

echo "→ 开始部署到 BSC 测试网 (chainId 97)…"
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$BSC_TESTNET_RPC" \
  --broadcast \
  --slow

RUN="broadcast/Deploy.s.sol/97/run-latest.json"
echo "→ 解析部署地址 ($RUN)…"

get_addr() {
  node -e "const d=require('./$RUN');const t=d.transactions.find(x=>x.contractName==='$1'&&x.transactionType==='CREATE');console.log(t?t.contractAddress:'')"
}

USDT=$(get_addr MockUSDT)
IDENTITY=$(get_addr AgentIdentity)
REP=$(get_addr Reputation)
ESCROW=$(get_addr JobEscrow)

echo "  MockUSDT      : $USDT"
echo "  AgentIdentity : $IDENTITY"
echo "  Reputation    : $REP"
echo "  JobEscrow     : $ESCROW"

# 回写前端 .env
FE="../.env"
node -e "
const fs=require('fs');const p='$FE';
let s=fs.readFileSync(p,'utf8');
const set=(k,v)=>{const re=new RegExp('^'+k+'=.*$','m');s=re.test(s)?s.replace(re,k+'=\"'+v+'\"'):s+'\n'+k+'=\"'+v+'\"';};
set('NEXT_PUBLIC_AGENT_IDENTITY_ADDRESS','$IDENTITY');
set('NEXT_PUBLIC_MOCK_USDT_ADDRESS','$USDT');
set('NEXT_PUBLIC_REPUTATION_ADDRESS','$REP');
set('NEXT_PUBLIC_JOB_ESCROW_ADDRESS','$ESCROW');
fs.writeFileSync(p,s);
console.log('✓ 已回写前端 .env');
"

echo "✓ 部署完成。重启 dev server 生效:tmux kill-session -t dev 后重启。"
echo "  浏览器区块浏览器:https://testnet.bscscan.com/address/$ESCROW"
