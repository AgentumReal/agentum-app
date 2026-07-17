#!/usr/bin/env bash
# 在 BSC 测试网验证竞价流程:postRequest→placeBid→acceptBid(托管)→deliver→settle
cd "$(dirname "$0")"
set -a; source .env; set +a
# 用更稳的公共 RPC(官方 data-seed 常过载丢包)
RPC="https://bsc-testnet-rpc.publicnode.com"
# 从前端 .env 读最新合约地址(单一真相源)
FE=../.env
USDT=$(grep NEXT_PUBLIC_MOCK_USDT_ADDRESS $FE | sed 's/.*="//;s/"//')
ESCROW=$(grep NEXT_PUBLIC_JOB_ESCROW_ADDRESS $FE | sed 's/.*="//;s/"//')
REP=$(grep NEXT_PUBLIC_REPUTATION_ADDRESS $FE | sed 's/.*="//;s/"//')
echo "USDT=$USDT  ESCROW=$ESCROW"

# cast send 默认等 receipt;legacy gas 价避开 EIP-1559 tip 下限;transient RPC 失败重试
send() {
  local out tx i
  for i in 1 2 3 4 5; do
    out=$(cast send --legacy --gas-price 3gwei "$@" --rpc-url "$RPC" 2>&1)
    tx=$(echo "$out" | awk '/transactionHash/{print $2}')
    if [ -n "$tx" ]; then echo "$tx"; return 0; fi
    # revert(逻辑错误)不重试;仅对网络/gas 类瞬时错误重试
    if echo "$out" | grep -qiE "execution reverted"; then
      echo "  ✗ revert: $(echo "$out" | grep -oiE 'reverted: [a-z ]+' | head -1)" >&2; return 1
    fi
    sleep 4
  done
  echo "  ✗ tx 失败(重试耗尽): $(echo "$out" | grep -iE 'error' | head -1)" >&2; return 1
}

echo "→ provider 账号 + gas(0.003 tBNB 足够跑多笔)"
PK=$(cast wallet new 2>/dev/null | awk '/Private key/{print $NF}')
PROV=$(cast wallet address --private-key "$PK")
send "$PROV" --value 0.003ether --private-key "$DEPLOYER_PRIVATE_KEY" >/dev/null || exit 1
echo "  provider tBNB = $(cast balance $PROV --rpc-url $RPC)"

RID=$(cast call "$ESCROW" "nextRequestId()(uint256)" --rpc-url "$RPC")
echo "→ ① client postRequest — requestId=$RID"
send "$ESCROW" "postRequest(string)" "Audit my staking contract" --private-key "$DEPLOYER_PRIVATE_KEY" >/dev/null; sleep 2

echo "→ ② provider placeBid(50 USDT, 5d) — bidIndex=0"
send "$ESCROW" "placeBid(uint256,uint256,uint64)" "$RID" 50000000000000000000 5 --private-key "$PK" >/dev/null; sleep 2
echo "   bidCount = $(cast call "$ESCROW" "bidCount(uint256)(uint256)" "$RID" --rpc-url "$RPC")"

echo "→ client 授权 escrow"
send "$USDT" "approve(address,uint256)" "$ESCROW" "$(cast max-uint)" --private-key "$DEPLOYER_PRIVATE_KEY" >/dev/null; sleep 2

JID=$(cast call "$ESCROW" "nextJobId()(uint256)" --rpc-url "$RPC")
echo "→ ③ client acceptBid(req=$RID, bid=0) → 托管 + 建单 jobId=$JID"
send "$ESCROW" "acceptBid(uint256,uint256)" "$RID" 0 --private-key "$DEPLOYER_PRIVATE_KEY" >/dev/null; sleep 2
echo "   escrow USDT 余额 = $(cast call "$USDT" "balanceOf(address)(uint256)" "$ESCROW" --rpc-url "$RPC" | awk '{print $1}')"

echo "→ ④ provider deliver(job=$JID)"
send "$ESCROW" "deliver(uint256,bytes32)" "$JID" "$(cast keccak 'audit report v1')" --private-key "$PK" >/dev/null; sleep 2

echo "→ ⑤ client settle(job=$JID)"
STX=$(send "$ESCROW" "settle(uint256)" "$JID" --private-key "$DEPLOYER_PRIVATE_KEY"); sleep 2

echo ""
echo "=== 链上核对 ==="
echo "  provider USDT 余额  = $(cast call "$USDT" "balanceOf(address)(uint256)" "$PROV" --rpc-url "$RPC" | awk '{print $1}')  (期望 49e18 = 50 - 2%)"
echo "  provider 声誉分     = $(cast call "$REP" "score(address)(uint256)" "$PROV" --rpc-url "$RPC")"
echo "  settle tx: https://testnet.bscscan.com/tx/$STX"
