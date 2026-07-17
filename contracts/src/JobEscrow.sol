// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Reputation} from "./Reputation.sol";

/// @title JobEscrow — Agentum 任务托管与结算
/// @notice 生命周期:开单托管 → 交付(哈希锁链上) → 挑战窗口 → 结算/裁决。
///         协议费 1–3%。声誉在结算/裁决时上链。
contract JobEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    enum Status {
        None,
        Escrowed,
        Delivered,
        Settled,
        Disputed,
        Refunded
    }

    struct Job {
        address client;
        address provider;
        uint256 amount;
        uint64 createdAt;
        uint64 deliveredAt;
        uint64 deadline; // 交付截止(用于 on-time 与超时退款)
        Status status;
        bytes32 deliverableHash;
    }

    IERC20 public immutable token;
    Reputation public immutable reputation;
    address public feeRecipient;
    uint16 public feeBps; // 200 = 2%
    uint64 public challengeWindow; // 挑战窗口(秒)

    uint256 public nextJobId = 1;
    mapping(uint256 => Job) public jobs;

    event JobOpened(
        uint256 indexed jobId, address indexed client, address indexed provider, uint256 amount, uint64 deadline
    );
    event JobDelivered(uint256 indexed jobId, bytes32 deliverableHash, uint64 deliveredAt);
    event JobSettled(uint256 indexed jobId, uint256 toProvider, uint256 fee);
    event JobChallenged(uint256 indexed jobId);
    event JobResolved(uint256 indexed jobId, bool providerWon);
    event JobCancelled(uint256 indexed jobId);

    constructor(address token_, address reputation_, address feeRecipient_, uint16 feeBps_, uint64 challengeWindow_)
        Ownable(msg.sender)
    {
        require(token_ != address(0) && feeRecipient_ != address(0), "zero addr");
        require(feeBps_ <= 300, "fee too high"); // 上限 3%
        token = IERC20(token_);
        reputation = Reputation(reputation_);
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;
        challengeWindow = challengeWindow_;
    }

    // ── 直接雇佣:客户端选定 provider,开单并托管资金 ──
    function openJob(address provider, uint256 amount, uint64 deliverySeconds)
        external
        nonReentrant
        returns (uint256 jobId)
    {
        return _createJob(msg.sender, provider, amount, deliverySeconds);
    }

    // ── 内部:建单 + 托管(直接雇佣与接受报价共用) ──
    function _createJob(address client, address provider, uint256 amount, uint64 deliverySeconds)
        internal
        returns (uint256 jobId)
    {
        require(provider != address(0) && provider != client, "bad provider");
        require(amount > 0, "amount=0");

        jobId = nextJobId++;
        jobs[jobId] = Job({
            client: client,
            provider: provider,
            amount: amount,
            createdAt: uint64(block.timestamp),
            deliveredAt: 0,
            deadline: uint64(block.timestamp) + deliverySeconds,
            status: Status.Escrowed,
            deliverableHash: bytes32(0)
        });

        token.safeTransferFrom(client, address(this), amount);
        emit JobOpened(jobId, client, provider, amount, jobs[jobId].deadline);
    }

    // ─────────────────────────────────────────────────────
    // Open Brief 竞价流程:发布需求 → provider 竞价 → client 接受报价(此时才托管)
    // ─────────────────────────────────────────────────────

    struct Bid {
        address provider;
        uint256 amount;
        uint64 deliveryDays;
        bool active;
    }

    struct Request {
        address client;
        bool open;
        uint256 acceptedJobId;
    }

    uint256 public nextRequestId = 1;
    mapping(uint256 => Request) public requests;
    mapping(uint256 => Bid[]) public bidsByRequest;

    event RequestPosted(uint256 indexed requestId, address indexed client, string brief);
    event BidPlaced(
        uint256 indexed requestId, uint256 indexed bidIndex, address indexed provider, uint256 amount, uint64 deliveryDays
    );
    event BidWithdrawn(uint256 indexed requestId, uint256 indexed bidIndex);
    event BidAccepted(uint256 indexed requestId, uint256 indexed bidIndex, uint256 indexed jobId);
    event RequestCancelled(uint256 indexed requestId);

    /// @notice ① 客户端发布公开需求(不动资金;brief 文本只上事件,省 gas)
    function postRequest(string calldata brief) external returns (uint256 requestId) {
        requestId = nextRequestId++;
        requests[requestId] = Request({client: msg.sender, open: true, acceptedJobId: 0});
        emit RequestPosted(requestId, msg.sender, brief);
    }

    /// @notice ② provider 对需求报价
    function placeBid(uint256 requestId, uint256 amount, uint64 deliveryDays) external returns (uint256 bidIndex) {
        Request storage r = requests[requestId];
        require(r.open, "request closed");
        require(msg.sender != r.client, "client cannot bid");
        require(amount > 0, "amount=0");

        bidIndex = bidsByRequest[requestId].length;
        bidsByRequest[requestId].push(
            Bid({provider: msg.sender, amount: amount, deliveryDays: deliveryDays, active: true})
        );
        emit BidPlaced(requestId, bidIndex, msg.sender, amount, deliveryDays);
    }

    /// @notice provider 撤回自己的报价
    function withdrawBid(uint256 requestId, uint256 bidIndex) external {
        Bid storage b = bidsByRequest[requestId][bidIndex];
        require(b.provider == msg.sender, "not your bid");
        require(b.active, "inactive");
        b.active = false;
        emit BidWithdrawn(requestId, bidIndex);
    }

    /// @notice ③ 客户端接受某个报价 —— 此刻才把资金托管、建单
    function acceptBid(uint256 requestId, uint256 bidIndex) external nonReentrant returns (uint256 jobId) {
        Request storage r = requests[requestId];
        require(r.open, "request closed");
        require(msg.sender == r.client, "not request owner");

        Bid storage b = bidsByRequest[requestId][bidIndex];
        require(b.active, "bid inactive");

        r.open = false;
        jobId = _createJob(r.client, b.provider, b.amount, uint64(b.deliveryDays) * 1 days);
        r.acceptedJobId = jobId;
        emit BidAccepted(requestId, bidIndex, jobId);
    }

    /// @notice 客户端在未接受任何报价前取消需求
    function cancelRequest(uint256 requestId) external {
        Request storage r = requests[requestId];
        require(msg.sender == r.client, "not request owner");
        require(r.open, "already closed");
        r.open = false;
        emit RequestCancelled(requestId);
    }

    function bidCount(uint256 requestId) external view returns (uint256) {
        return bidsByRequest[requestId].length;
    }

    // ── 服务方:交付,锁定交付物哈希 ──
    function deliver(uint256 jobId, bytes32 deliverableHash) external {
        Job storage j = jobs[jobId];
        require(j.status == Status.Escrowed, "not escrowed");
        require(msg.sender == j.provider, "not provider");
        require(deliverableHash != bytes32(0), "empty hash");

        j.deliverableHash = deliverableHash;
        j.deliveredAt = uint64(block.timestamp);
        j.status = Status.Delivered;
        emit JobDelivered(jobId, deliverableHash, j.deliveredAt);
    }

    // ── 结算:客户端可随时确认;或挑战窗口过后任何人可触发 ──
    function settle(uint256 jobId) external nonReentrant {
        Job storage j = jobs[jobId];
        require(j.status == Status.Delivered, "not delivered");
        bool windowPassed = block.timestamp >= uint256(j.deliveredAt) + challengeWindow;
        require(msg.sender == j.client || windowPassed, "in challenge window");

        j.status = Status.Settled;
        bool onTime = j.deliveredAt <= j.deadline;
        _payout(jobId, j.provider, j.amount, onTime);
    }

    // ── 挑战:客户端在窗口内提出争议 ──
    function challenge(uint256 jobId) external {
        Job storage j = jobs[jobId];
        require(j.status == Status.Delivered, "not delivered");
        require(msg.sender == j.client, "not client");
        require(block.timestamp < uint256(j.deliveredAt) + challengeWindow, "window over");
        j.status = Status.Disputed;
        emit JobChallenged(jobId);
    }

    // ── 裁决:评估员面板(以 owner 作为链上预言机)给出终局裁定 ──
    function resolveDispute(uint256 jobId, bool providerWon) external nonReentrant onlyOwner {
        Job storage j = jobs[jobId];
        require(j.status == Status.Disputed, "not disputed");

        if (address(reputation) != address(0)) {
            reputation.recordDispute(j.provider, providerWon);
        }
        emit JobResolved(jobId, providerWon);

        if (providerWon) {
            j.status = Status.Settled;
            bool onTime = j.deliveredAt <= j.deadline;
            _payout(jobId, j.provider, j.amount, onTime);
        } else {
            j.status = Status.Refunded;
            token.safeTransfer(j.client, j.amount);
        }
    }

    // ── 取消:仅在交付前、由客户端发起,全额退款 ──
    function cancel(uint256 jobId) external nonReentrant {
        Job storage j = jobs[jobId];
        require(j.status == Status.Escrowed, "not cancellable");
        require(msg.sender == j.client, "not client");
        j.status = Status.Refunded;
        token.safeTransfer(j.client, j.amount);
        emit JobCancelled(jobId);
    }

    // ── 内部:扣费并放款,更新声誉 ──
    function _payout(uint256 jobId, address provider, uint256 amount, bool onTime) internal {
        uint256 fee = (amount * feeBps) / 10_000;
        uint256 toProvider = amount - fee;
        if (fee > 0) token.safeTransfer(feeRecipient, fee);
        token.safeTransfer(provider, toProvider);
        if (address(reputation) != address(0)) {
            reputation.recordSettled(provider, onTime);
        }
        emit JobSettled(jobId, toProvider, fee);
    }

    // ── 管理 ──
    function setFee(uint16 feeBps_) external onlyOwner {
        require(feeBps_ <= 300, "fee too high");
        feeBps = feeBps_;
    }

    function setChallengeWindow(uint64 seconds_) external onlyOwner {
        challengeWindow = seconds_;
    }

    function setFeeRecipient(address r) external onlyOwner {
        require(r != address(0), "zero addr");
        feeRecipient = r;
    }

    function getJob(uint256 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }
}
