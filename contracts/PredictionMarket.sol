// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IPredictionMarket.sol";
import "./interfaces/IReputationSystem.sol";

/// @title PredictionMarket
/// @notice Main contract for prediction markets in PraesagiumChain.
contract PredictionMarket is IPredictionMarket {
    // ====== Internal storage ======

    struct MarketInternal {
        string question;
        uint256 closeTime;
        uint256 resolveTime;
        MarketStatus status;
        Outcome outcome;
        uint256 totalYesStake;
        uint256 totalNoStake;
        address creator;
    }

    /// @notice Next market ID to assign.
    uint256 private _nextMarketId = 1;

    /// @notice Mercados por ID.
    mapping(uint256 => MarketInternal) private _markets;

    /// @notice Stake de cada usuario por mercado y resultado.
    mapping(uint256 => mapping(address => uint256)) private _yesStakes;
    mapping(uint256 => mapping(address => uint256)) private _noStakes;

    /// @notice Whether a user has already claimed their payout for a resolved market.
    mapping(uint256 => mapping(address => bool)) private _claimed;

    /// @notice Address authorized to resolve markets (e.g. CREWorkflow or oracle).
    address public resolver;

    /// @notice Owner/admin address.
    address public owner;

    /// @notice Optional reputation system contract.
    IReputationSystem public reputationSystem;

    // ====== Modificadores ======

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyResolver() {
        require(msg.sender == resolver, "Only resolver");
        _;
    }

    constructor(address _resolver) {
        owner = msg.sender;
        resolver = _resolver;
    }

    // ====== Admin functions ======

    function setResolver(address _resolver) external onlyOwner {
        resolver = _resolver;
    }

    function setReputationSystem(address rep) external onlyOwner {
        reputationSystem = IReputationSystem(rep);
    }

    // ====== Funciones IPredictionMarket ======

    /// @inheritdoc IPredictionMarket
    function createMarket(
        string calldata question,
        uint256 closeTime,
        uint256 resolveTime
    ) external override returns (uint256 marketId) {
        require(bytes(question).length > 0, "Empty question");
        require(closeTime > block.timestamp, "closeTime in past");
        require(resolveTime > closeTime, "resolveTime must be after closeTime");

        marketId = _nextMarketId++;

        _markets[marketId] = MarketInternal({
            question: question,
            closeTime: closeTime,
            resolveTime: resolveTime,
            status: MarketStatus.Open,
            outcome: Outcome.Undecided,
            totalYesStake: 0,
            totalNoStake: 0,
            creator: msg.sender
        });

        emit MarketCreated(marketId, question, closeTime, resolveTime, msg.sender);

        if (address(reputationSystem) != address(0)) {
            // Best-effort: reputation system may restrict callers; market deployer should authorize.
            try reputationSystem.onMarketCreated(marketId, msg.sender) {} catch {}
        }
    }

    /// @inheritdoc IPredictionMarket
    function placeBet(uint256 marketId, Outcome outcome) external payable override {
        if (msg.value == 0) revert ZeroStake();
        if (outcome != Outcome.Yes && outcome != Outcome.No) revert InvalidOutcome();

        MarketInternal storage m = _markets[marketId];
        if (bytes(m.question).length == 0) revert MarketDoesNotExist(marketId);
        if (m.status != MarketStatus.Open) revert MarketClosed(marketId);
        require(block.timestamp < m.closeTime, "Market already closed");

        if (outcome == Outcome.Yes) {
            _yesStakes[marketId][msg.sender] += msg.value;
            m.totalYesStake += msg.value;
        } else {
            _noStakes[marketId][msg.sender] += msg.value;
            m.totalNoStake += msg.value;
        }

        emit BetPlaced(marketId, msg.sender, outcome, msg.value);
    }

    /// @notice Locks a market to prevent new bets (typically called near `closeTime`).
    function lockMarket(uint256 marketId) external onlyResolver {
        MarketInternal storage m = _markets[marketId];
        if (bytes(m.question).length == 0) revert MarketDoesNotExist(marketId);
        require(m.status == MarketStatus.Open, "Not open");
        m.status = MarketStatus.Locked;

        emit MarketLocked(marketId);
    }

    /// @notice Resuelve un mercado con el resultado definitivo.
    /// @dev Intended to be called by the CRE flow or authorized oracle.
    function resolveMarket(uint256 marketId, Outcome outcome) external onlyResolver {
        if (outcome != Outcome.Yes && outcome != Outcome.No) revert InvalidOutcome();

        MarketInternal storage m = _markets[marketId];
        if (bytes(m.question).length == 0) revert MarketDoesNotExist(marketId);
        if (m.status == MarketStatus.Resolved) revert MarketAlreadyResolved(marketId);
        if (block.timestamp < m.resolveTime) revert MarketNotClosed(marketId);

        m.status = MarketStatus.Resolved;
        m.outcome = outcome;

        emit MarketResolved(marketId, outcome, m.totalYesStake, m.totalNoStake);

        if (address(reputationSystem) != address(0)) {
            try reputationSystem.onMarketResolved(marketId, m.creator, uint8(outcome)) {} catch {}
        }
    }

    /// @inheritdoc IPredictionMarket
    function claimPayout(uint256 marketId) external override {
        MarketInternal storage m = _markets[marketId];
        if (bytes(m.question).length == 0) revert MarketDoesNotExist(marketId);
        if (m.status != MarketStatus.Resolved) revert MarketNotClosed(marketId);
        if (_claimed[marketId][msg.sender]) {
            revert("Already claimed");
        }

        uint256 userYes = _yesStakes[marketId][msg.sender];
        uint256 userNo = _noStakes[marketId][msg.sender];

        uint256 payout;
        if (m.outcome == Outcome.Yes && m.totalYesStake > 0 && userYes > 0) {
            payout = (userYes * (m.totalYesStake + m.totalNoStake)) / m.totalYesStake;
        } else if (m.outcome == Outcome.No && m.totalNoStake > 0 && userNo > 0) {
            payout = (userNo * (m.totalYesStake + m.totalNoStake)) / m.totalNoStake;
        }

        _claimed[marketId][msg.sender] = true;

        if (payout > 0) {
            (bool sent, ) = msg.sender.call{value: payout}("");
            require(sent, "Transfer failed");
        }

        emit PayoutClaimed(marketId, msg.sender, payout);
    }

    /// @inheritdoc IPredictionMarket
    function getMarket(uint256 marketId) external view override returns (MarketView memory) {
        MarketInternal storage m = _markets[marketId];
        if (bytes(m.question).length == 0) revert MarketDoesNotExist(marketId);

        return
            MarketView({
                id: marketId,
                question: m.question,
                closeTime: m.closeTime,
                resolveTime: m.resolveTime,
                status: m.status,
                outcome: m.outcome,
                totalYesStake: m.totalYesStake,
                totalNoStake: m.totalNoStake
            });
    }

    /// @inheritdoc IPredictionMarket
    function getUserStake(
        uint256 marketId,
        address user
    ) external view override returns (uint256 yesStake, uint256 noStake) {
        yesStake = _yesStakes[marketId][user];
        noStake = _noStakes[marketId][user];
    }
}


