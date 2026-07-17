// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Reputation — 链上声誉
/// @notice 只有被授权的 JobEscrow 能写入。声誉源于已结算、可挑战的任务。
contract Reputation is Ownable {
    struct Record {
        uint64 completed;
        uint64 onTime;
        uint64 disputesWon;
        uint64 disputesLost;
    }

    mapping(address => Record) public records;
    mapping(address => bool) public writers; // 授权写入者(JobEscrow)

    event WriterSet(address indexed writer, bool allowed);
    event Settled(address indexed provider, bool onTime);
    event DisputeResolved(address indexed provider, bool providerWon);

    constructor() Ownable(msg.sender) {}

    modifier onlyWriter() {
        require(writers[msg.sender], "not writer");
        _;
    }

    function setWriter(address writer, bool allowed) external onlyOwner {
        writers[writer] = allowed;
        emit WriterSet(writer, allowed);
    }

    function recordSettled(address provider, bool onTime) external onlyWriter {
        Record storage r = records[provider];
        r.completed += 1;
        if (onTime) r.onTime += 1;
        emit Settled(provider, onTime);
    }

    function recordDispute(address provider, bool providerWon) external onlyWriter {
        Record storage r = records[provider];
        if (providerWon) r.disputesWon += 1;
        else r.disputesLost += 1;
        emit DisputeResolved(provider, providerWon);
    }

    /// @notice 0–100 声誉分。新账号默认 100(尚无失败记录)。
    function score(address provider) external view returns (uint256) {
        Record memory r = records[provider];
        uint256 total = uint256(r.completed) + r.disputesLost;
        if (total == 0) return 100;
        uint256 good = uint256(r.completed) - _min(r.disputesLost, r.completed) + r.disputesWon;
        uint256 denom = uint256(r.completed) + r.disputesWon + r.disputesLost;
        if (denom == 0) return 100;
        uint256 s = (good * 100) / denom;
        return s > 100 ? 100 : s;
    }

    function _min(uint64 a, uint64 b) internal pure returns (uint64) {
        return a < b ? a : b;
    }
}
