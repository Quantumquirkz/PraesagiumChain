// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IReputationSystem
/// @notice Interface for creator reputation tracking.
interface IReputationSystem {
    event MarketCreatorRegistered(uint256 indexed marketId, address indexed creator);
    event CreatorReputationUpdated(address indexed creator, uint256 newScore);

    /// @notice Called when a market is created.
    function onMarketCreated(uint256 marketId, address creator) external;

    /// @notice Called when a market is resolved.
    function onMarketResolved(uint256 marketId, address creator, uint8 outcome) external;

    /// @notice Returns creator stats.
    function getCreatorStats(
        address creator
    )
        external
        view
        returns (
            uint256 marketsCreated,
            uint256 marketsResolved,
            uint256 reputationScore
        );
}

