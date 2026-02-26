// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IReputationSystem.sol";

/// @title ReputationSystem
/// @notice Minimal, extensible reputation system for market creators.
/// @dev This is deliberately simple: it tracks counts and a score that can be evolved later.
contract ReputationSystem is IReputationSystem {
    address public owner;

    /// @notice Authorized caller (typically a market contract).
    mapping(address => bool) public authorizedCallers;

    struct CreatorStats {
        uint256 created;
        uint256 resolved;
        uint256 score;
    }

    mapping(address => CreatorStats) private _stats;
    mapping(uint256 => address) public marketCreator;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender], "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setAuthorizedCaller(address caller, bool allowed) external onlyOwner {
        authorizedCallers[caller] = allowed;
    }

    /// @inheritdoc IReputationSystem
    function onMarketCreated(uint256 marketId, address creator) external onlyAuthorized {
        marketCreator[marketId] = creator;
        _stats[creator].created += 1;
        emit MarketCreatorRegistered(marketId, creator);
    }

    /// @inheritdoc IReputationSystem
    function onMarketResolved(
        uint256 marketId,
        address creator,
        uint8 /* outcome */
    ) external onlyAuthorized {
        // Basic anti-spoof: ensure creator matches recorded creator, if present.
        address recorded = marketCreator[marketId];
        if (recorded != address(0)) {
            require(recorded == creator, "Creator mismatch");
        } else {
            marketCreator[marketId] = creator;
            emit MarketCreatorRegistered(marketId, creator);
        }

        _stats[creator].resolved += 1;

        // Simple scoring: +1 per resolved market.
        _stats[creator].score += 1;
        emit CreatorReputationUpdated(creator, _stats[creator].score);
    }

    /// @inheritdoc IReputationSystem
    function getCreatorStats(
        address creator
    )
        external
        view
        returns (uint256 marketsCreated, uint256 marketsResolved, uint256 reputationScore)
    {
        CreatorStats memory s = _stats[creator];
        return (s.created, s.resolved, s.score);
    }
}

