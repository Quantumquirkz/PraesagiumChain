// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IPredictionMarket
/// @notice Interface for the prediction market contract.
interface IPredictionMarket {
    // ====== Types ======

    /// @notice Status of a prediction market.
    enum MarketStatus {
        Open,
        Locked,
        Resolved,
        Cancelled
    }

    /// @notice Binary outcome of the market.
    enum Outcome {
        Undecided,
        Yes,
        No
    }

    /// @notice Minimal public information for a market.
    struct MarketView {
        uint256 id;
        string question;
        uint256 closeTime;
        uint256 resolveTime;
        MarketStatus status;
        Outcome outcome;
        uint256 totalYesStake;
        uint256 totalNoStake;
    }

    // ====== Errores ======

    error MarketDoesNotExist(uint256 marketId);
    error MarketAlreadyResolved(uint256 marketId);
    error MarketClosed(uint256 marketId);
    error MarketNotClosed(uint256 marketId);
    error InvalidOutcome();
    error ZeroStake();

    // ====== Eventos ======

    event MarketCreated(
        uint256 indexed marketId,
        string question,
        uint256 closeTime,
        uint256 resolveTime,
        address indexed creator
    );

    event MarketLocked(uint256 indexed marketId);

    event MarketResolved(
        uint256 indexed marketId,
        Outcome outcome,
        uint256 totalYesStake,
        uint256 totalNoStake
    );

    event BetPlaced(
        uint256 indexed marketId,
        address indexed user,
        Outcome outcome,
        uint256 amount
    );

    event PayoutClaimed(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount
    );

    // ====== Write functions ======

    /// @notice Creates a new binary prediction market.
    function createMarket(
        string calldata question,
        uint256 closeTime,
        uint256 resolveTime
    ) external returns (uint256 marketId);

    /// @notice Places a bet on an open market.
    function placeBet(uint256 marketId, Outcome outcome) external payable;

    /// @notice Claims the payout for a resolved market.
    function claimPayout(uint256 marketId) external;

    // ====== Read functions ======

    function getMarket(uint256 marketId) external view returns (MarketView memory);

    function getUserStake(
        uint256 marketId,
        address user
    ) external view returns (uint256 yesStake, uint256 noStake);
}

