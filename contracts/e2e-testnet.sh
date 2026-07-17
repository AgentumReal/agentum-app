#!/usr/bin/env bash
# 在 BSC 测试网跑一条完整任务生命周期(escrow→deliver→settle)并核对链上结果
cd "$(dirname "$0")"
set -a; source .env; set +a

RPC="$BSC_TESTNET_RPC"
USDT=0x0f5429e71A1871b808f052Fa13fB5FC03B59541f
ESCROW=0xDcf2146628f87F42DbDB528332862a7f04fEA398
REP=0x31A6E5812Ecc975139FcFF5eA20A7188E3606343

# 稳健发送:纯文本输出取 status/tx,失败自动重试
send() {
  local out tx st
  for i in 1 2 3; do
    out=$(cast send "$@" --rpc-url "$RPC" 2>&1) || true
    tx=$(echo "$out" | awk '/transactionHash/{print $2}')
    st=$(echo "$out" | awk '/^status/{print $2}')
    if [ -n "$tx" ]; then echo "$st $tx"; return 0; fi
    sleep 3
  done
  echo "FAILED"; return 1
}

echo "→ 生成 provider 账号"
PROV_KEY=$(cast wallet new 2>/dev/null | awk '/Private key/{print $NF}')
PROV=$(cast wallet address --private-key "$PROV_KEY")
echo "  provider = $PROV"

echo "→ client 转 0.02 tBNB 给 provider 做 gas"
echo "  $(send "$PROV" --value 0.02ether --private-key "$DEPLOYER_PRIVATE_KEY")"
sleep 3

echo "→ client 授权 escrow"
echo "  $(send "$USDT" "approve(address,uint256)" "$ESCROW" "$(cast max-uint)" --private-key "$DEPLOYER_PRIVATE_KEY")"
sleep 3

JOBID=$(cast call "$ESCROW" "nextJobId()(uint256)" --rpc-url "$RPC")
echo "→ openJob(provider, 100 USDT, 3d) — jobId = $JOBID"
echo "  $(send "$ESCROW" "openJob(address,uint256,uint64)" "$PROV" 100000000000000000000 259200 --private-key "$DEPLOYER_PRIVATE_KEY")"
sleep 3

echo "→ provider deliver(jobId=$JOBID)"
echo "  $(send "$ESCROW" "deliver(uint256,bytes32)" "$JOBID" "$(cast keccak 'final audit report')" --private-key "$PROV_KEY")"
sleep 3

echo "→ client settle(jobId=$JOBID)"
SETTLE=$(send "$ESCROW" "settle(uint256)" "$JOBID" --private-key "$DEPLOYER_PRIVATE_KEY")
echo "  $SETTLE"
SETTLE_TX=$(echo "$SETTLE" | awk '{print $2}')

echo ""
echo "=== 链上核对 ==="
echo "  provider USDT 余额  = $(cast call "$USDT" "balanceOf(address)(uint256)" "$PROV" --rpc-url "$RPC" | awk '{print $1}')  (期望 98e18)"
echo "  provider 链上声誉分 = $(cast call "$REP" "score(address)(uint256)" "$PROV" --rpc-url "$RPC")"
echo "  jobId = $JOBID"
echo "  settle tx: https://testnet.bscscan.com/tx/$SETTLE_TX"
