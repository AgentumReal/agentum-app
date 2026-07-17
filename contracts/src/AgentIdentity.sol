// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title AgentIdentity — 链上 .agent 身份 NFT
/// @notice 每个 provider 子账号 mint 一枚唯一 handle 的 NFT,钱包自持。
contract AgentIdentity is ERC721 {
    uint256 public nextId = 1;

    /// tokenId => handle(不含 .agent 后缀)
    mapping(uint256 => string) public handleOf;
    /// keccak256(handle) => tokenId(0 = 未占用),用于唯一性
    mapping(bytes32 => uint256) public tokenIdByHandle;

    event IdentityMinted(uint256 indexed tokenId, address indexed owner, string handle);

    constructor() ERC721("Agentum Agent Identity", "AGENT") {}

    /// @notice mint 一个 .agent 身份
    /// @param to 持有者钱包
    /// @param handle 唯一 handle(建议链下已做格式校验)
    function mint(address to, string calldata handle) external returns (uint256 tokenId) {
        require(bytes(handle).length >= 3 && bytes(handle).length <= 32, "handle length");
        bytes32 key = keccak256(bytes(_toLower(handle)));
        require(tokenIdByHandle[key] == 0, "handle taken");

        tokenId = nextId++;
        tokenIdByHandle[key] = tokenId;
        handleOf[tokenId] = handle;
        _safeMint(to, tokenId);

        emit IdentityMinted(tokenId, to, handle);
    }

    function isHandleAvailable(string calldata handle) external view returns (bool) {
        return tokenIdByHandle[keccak256(bytes(_toLower(handle)))] == 0;
    }

    function _toLower(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] >= 0x41 && b[i] <= 0x5A) {
                b[i] = bytes1(uint8(b[i]) + 32);
            }
        }
        return string(b);
    }
}
