// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IPredictionMarket
/// @notice Interfaz para el contrato de mercado de predicción.
interface IPredictionMarket {
    // ====== Tipos ======

    /// @notice Estado de un mercado de predicción.
    enum MarketStatus {
        Open,
        Locked,
        Resolved,
        Cancelled
    }

    /// @notice Resultado binario del mercado.
    enum Outcome {
        Undecided,
        Yes,
        No
    }

    /// @notice Información pública mínima de un mercado.
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

    // ====== Funciones de escritura ======

    /// @notice Crea un nuevo mercado de predicción binario.
    function createMarket(
        string calldata question,
        uint256 closeTime,
        uint256 resolveTime
    ) external returns (uint256 marketId);

    /// @notice Coloca una apuesta en un mercado abierto.
    function placeBet(uint256 marketId, Outcome outcome) external payable;

    /// @notice Reclama el pago de un mercado resuelto.
    function claimPayout(uint256 marketId) external;

    // ====== Funciones de lectura ======

    function getMarket(uint256 marketId) external view returns (MarketView memory);

    function getUserStake(
        uint256 marketId,
        address user
    ) external view returns (uint256 yesStake, uint256 noStake);
}

