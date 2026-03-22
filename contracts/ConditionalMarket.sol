// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IPredictionMarket.sol";

/// @title ConditionalMarket
/// @notice Prediction markets resolved from chained conditions ("if-then").
/// @dev MVP supports AND conditions over external IPredictionMarket outcomes.
contract ConditionalMarket {
    enum MarketStatus {
        Open,
        Locked,
        Resolved,
        Cancelled
    }

    enum Outcome {
        Undecided,
        Yes,
        No
    }

    struct Condition {
        address marketContract;
        uint256 marketId;
        Outcome expectedOutcome; // Yes/No
    }

    struct Market {
        string question;
        uint256 closeTime;
        uint256 resolveTime;
        MarketStatus status;
        Outcome outcome;
        uint256 totalYesStake;
        uint256 totalNoStake;
        address creator;
        Condition[] conditions;
    }

    address public immutable owner;
    address public resolver;

    uint256 private _nextMarketId = 1;
    mapping(uint256 => Market) private _markets;
    mapping(uint256 => mapping(address => uint256)) private _yesStakes;
    mapping(uint256 => mapping(address => uint256)) private _noStakes;
    mapping(uint256 => mapping(address => bool)) private _claimed;

    event ConditionalMarketCreated(uint256 indexed marketId, address indexed creator, string question);
    event ConditionAdded(uint256 indexed marketId, address indexed marketContract, uint256 indexed conditionMarketId);
    event BetPlaced(uint256 indexed marketId, address indexed user, Outcome outcome, uint256 amount);
    event MarketLocked(uint256 indexed marketId);
    event MarketResolved(uint256 indexed marketId, Outcome outcome);
    event PayoutClaimed(uint256 indexed marketId, address indexed user, uint256 amount);

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

    function setResolver(address newResolver) external onlyOwner {
        resolver = newResolver;
    }

    function createConditionalMarket(
        string calldata question,
        uint256 closeTime,
        uint256 resolveTime,
        Condition[] calldata conditions
    ) external returns (uint256 marketId) {
        require(bytes(question).length > 0, "Empty question");
        require(closeTime > block.timestamp, "closeTime in past");
        require(resolveTime > closeTime, "resolveTime must be after closeTime");
        require(conditions.length > 0, "No conditions");

        marketId = _nextMarketId++;

        Market storage m = _markets[marketId];
        m.question = question;
        m.closeTime = closeTime;
        m.resolveTime = resolveTime;
        m.status = MarketStatus.Open;
        m.outcome = Outcome.Undecided;
        m.creator = msg.sender;

        for (uint256 i = 0; i < conditions.length; i++) {
            require(conditions[i].expectedOutcome == Outcome.Yes || conditions[i].expectedOutcome == Outcome.No, "Bad expected");
            m.conditions.push(conditions[i]);
            emit ConditionAdded(marketId, conditions[i].marketContract, conditions[i].marketId);
        }

        emit ConditionalMarketCreated(marketId, msg.sender, question);
    }

    function placeBet(uint256 marketId, Outcome outcome) external payable {
        require(msg.value > 0, "Zero stake");
        require(outcome == Outcome.Yes || outcome == Outcome.No, "Invalid outcome");

        Market storage m = _markets[marketId];
        require(m.creator != address(0), "Market missing");
        require(m.status == MarketStatus.Open, "Market not open");
        require(block.timestamp < m.closeTime, "Market closed");

        if (outcome == Outcome.Yes) {
            _yesStakes[marketId][msg.sender] += msg.value;
            m.totalYesStake += msg.value;
        } else {
            _noStakes[marketId][msg.sender] += msg.value;
            m.totalNoStake += msg.value;
        }

        emit BetPlaced(marketId, msg.sender, outcome, msg.value);
    }

    function lockMarket(uint256 marketId) external onlyResolver {
        Market storage m = _markets[marketId];
        require(m.creator != address(0), "Market missing");
        require(m.status == MarketStatus.Open, "Not open");
        m.status = MarketStatus.Locked;
        emit MarketLocked(marketId);
    }

    function resolveMarket(uint256 marketId) external onlyResolver {
        Market storage m = _markets[marketId];
        require(m.creator != address(0), "Market missing");
        require(m.status != MarketStatus.Resolved, "Already resolved");
        require(block.timestamp >= m.resolveTime, "Too early");

        bool allMatch = true;
        for (uint256 i = 0; i < m.conditions.length; i++) {
            Condition storage c = m.conditions[i];
            IPredictionMarket.MarketView memory ext = IPredictionMarket(c.marketContract).getMarket(c.marketId);
            require(ext.status == IPredictionMarket.MarketStatus.Resolved, "Condition not resolved");

            // Map external Outcome to local Outcome
            Outcome extOutcome = ext.outcome == IPredictionMarket.Outcome.Yes ? Outcome.Yes : Outcome.No;
            if (extOutcome != c.expectedOutcome) {
                allMatch = false;
                break;
            }
        }

        m.status = MarketStatus.Resolved;
        m.outcome = allMatch ? Outcome.Yes : Outcome.No;
        emit MarketResolved(marketId, m.outcome);
    }

    function claimPayout(uint256 marketId) external {
        Market storage m = _markets[marketId];
        require(m.status == MarketStatus.Resolved, "Not resolved");
        require(!_claimed[marketId][msg.sender], "Already claimed");

        uint256 userYes = _yesStakes[marketId][msg.sender];
        uint256 userNo = _noStakes[marketId][msg.sender];

        uint256 payout;
        uint256 pool = m.totalYesStake + m.totalNoStake;
        if (m.outcome == Outcome.Yes && m.totalYesStake > 0 && userYes > 0) {
            payout = (userYes * pool) / m.totalYesStake;
        } else if (m.outcome == Outcome.No && m.totalNoStake > 0 && userNo > 0) {
            payout = (userNo * pool) / m.totalNoStake;
        }

        _claimed[marketId][msg.sender] = true;
        if (payout > 0) {
            (bool sent, ) = msg.sender.call{value: payout}("");
            require(sent, "Transfer failed");
        }
        emit PayoutClaimed(marketId, msg.sender, payout);
    }

    function getMarket(uint256 marketId) external view returns (string memory question, MarketStatus status, Outcome outcome, uint256 conditionsCount) {
        Market storage m = _markets[marketId];
        require(m.creator != address(0), "Market missing");
        return (m.question, m.status, m.outcome, m.conditions.length);
    }
}

