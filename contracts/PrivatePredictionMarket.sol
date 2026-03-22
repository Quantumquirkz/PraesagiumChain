// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IPredictionMarket.sol";

/// @title PrivatePredictionMarket
/// @notice Prediction market with commit-reveal for private positions (Chainlink Confidential Compute use case).
/// @dev Positions are hidden until reveal; resolution uses CRE/oracle same as PredictionMarket.
contract PrivatePredictionMarket is ReentrancyGuard {
    struct MarketInternal {
        string question;
        uint256 closeTime;
        uint256 resolveTime;
        IPredictionMarket.MarketStatus status;
        IPredictionMarket.Outcome outcome;
        uint256 totalYesStake;
        uint256 totalNoStake;
        uint256 totalCommitted; // total ETH committed (pool for payouts)
        address creator;
    }

    struct Commitment {
        uint256 value;
        bytes32 hash;
    }

    struct RevealedStake {
        uint256 amount;
        bool claimed;
    }

    uint256 private _nextMarketId = 1;
    mapping(uint256 => MarketInternal) private _markets;
    mapping(uint256 => mapping(address => Commitment[])) private _commitments;
    mapping(uint256 => mapping(address => mapping(uint256 => RevealedStake))) private _revealed; // marketId => user => outcome (1=Yes,2=No) => amount

    address public resolver;
    address public immutable owner;

    event MarketCreated(
        uint256 indexed marketId,
        string question,
        uint256 closeTime,
        uint256 resolveTime,
        address indexed creator
    );
    event BetCommitted(uint256 indexed marketId, address indexed user, uint256 index, uint256 value, bytes32 commitment);
    event BetRevealed(uint256 indexed marketId, address indexed user, uint8 outcome, uint256 amount);
    event MarketResolved(uint256 indexed marketId, IPredictionMarket.Outcome outcome, uint256 totalYesStake, uint256 totalNoStake);
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

    function createMarket(
        string calldata question,
        uint256 closeTime,
        uint256 resolveTime
    ) external returns (uint256 marketId) {
        require(bytes(question).length > 0, "Empty question");
        require(closeTime > block.timestamp, "closeTime in past");
        require(resolveTime > closeTime, "resolveTime must be after closeTime");

        marketId = _nextMarketId++;
        _markets[marketId] = MarketInternal({
            question: question,
            closeTime: closeTime,
            resolveTime: resolveTime,
            status: IPredictionMarket.MarketStatus.Open,
            outcome: IPredictionMarket.Outcome.Undecided,
            totalYesStake: 0,
            totalNoStake: 0,
            totalCommitted: 0,
            creator: msg.sender
        });
        emit MarketCreated(marketId, question, closeTime, resolveTime, msg.sender);
        return marketId;
    }

    /// @notice Commit a bet (privacy-preserving). commitment = keccak256(abi.encode(outcome, amount, nonce))
    function commitBet(uint256 marketId, bytes32 commitment) external payable {
        require(msg.value > 0, "Zero stake");
        MarketInternal storage m = _markets[marketId];
        require(bytes(m.question).length > 0, "Market does not exist");
        require(m.status == IPredictionMarket.MarketStatus.Open, "Market closed");
        require(block.timestamp < m.closeTime, "Market already closed");

        m.totalCommitted += msg.value;
        _commitments[marketId][msg.sender].push(Commitment({ value: msg.value, hash: commitment }));
        emit BetCommitted(marketId, msg.sender, _commitments[marketId][msg.sender].length - 1, msg.value, commitment);
    }

    /// @notice Reveal a committed bet. Call after market is resolved to claim if winner.
    function revealBet(uint256 marketId, uint256 index, uint8 outcome, uint256 amount, bytes32 nonce) external {
        require(outcome == 1 || outcome == 2, "Invalid outcome"); // 1=Yes, 2=No
        MarketInternal storage m = _markets[marketId];
        require(bytes(m.question).length > 0, "Market does not exist");
        require(m.status == IPredictionMarket.MarketStatus.Resolved, "Market not resolved");

        Commitment[] storage comms = _commitments[marketId][msg.sender];
        require(index < comms.length, "Invalid index");
        Commitment storage c = comms[index];
        require(c.value != 0, "Already revealed");

        bytes32 expectedHash = keccak256(abi.encode(outcome, amount, nonce));
        require(c.hash == expectedHash, "Invalid commitment");
        require(c.value == amount, "Amount mismatch");

        IPredictionMarket.Outcome out = outcome == 1 ? IPredictionMarket.Outcome.Yes : IPredictionMarket.Outcome.No;
        _revealed[marketId][msg.sender][outcome].amount += amount;
        _revealed[marketId][msg.sender][outcome].claimed = false;
        c.value = 0; // mark as revealed
        c.hash = bytes32(0);

        if (out == IPredictionMarket.Outcome.Yes) {
            m.totalYesStake += amount;
        } else {
            m.totalNoStake += amount;
        }
        emit BetRevealed(marketId, msg.sender, outcome, amount);
    }

    /// @notice Resolve market (called by CRE/Oracle). Same interface as PredictionMarket. rawOutcome: 0=No, 1=Yes.
    function resolveMarket(uint256 marketId, uint8 rawOutcome) external onlyResolver {
        IPredictionMarket.Outcome outcome = rawOutcome == 1 ? IPredictionMarket.Outcome.Yes : IPredictionMarket.Outcome.No;
        require(outcome == IPredictionMarket.Outcome.Yes || outcome == IPredictionMarket.Outcome.No, "Invalid outcome");

        MarketInternal storage m = _markets[marketId];
        require(bytes(m.question).length > 0, "Market does not exist");
        require(m.status != IPredictionMarket.MarketStatus.Resolved, "Already resolved");
        require(block.timestamp >= m.resolveTime, "Market not ready");

        m.status = IPredictionMarket.MarketStatus.Resolved;
        m.outcome = outcome;
        emit MarketResolved(marketId, outcome, m.totalYesStake, m.totalNoStake);
    }

    /// @notice Claim payout after revealing. Only winners can claim.
    function claimPayout(uint256 marketId) external nonReentrant {
        MarketInternal storage m = _markets[marketId];
        require(bytes(m.question).length > 0, "Market does not exist");
        require(m.status == IPredictionMarket.MarketStatus.Resolved, "Market not resolved");

        uint8 winningOutcome = m.outcome == IPredictionMarket.Outcome.Yes ? 1 : 2;
        RevealedStake storage rs = _revealed[marketId][msg.sender][winningOutcome];
        require(rs.amount > 0, "No winning stake");
        require(!rs.claimed, "Already claimed");

        uint256 totalWinning = m.outcome == IPredictionMarket.Outcome.Yes ? m.totalYesStake : m.totalNoStake;
        uint256 pool = m.totalCommitted;
        require(totalWinning > 0 && pool > 0, "No pool");

        uint256 payout = (rs.amount * pool) / totalWinning;
        rs.claimed = true;

        (bool sent, ) = msg.sender.call{value: payout}("");
        require(sent, "Transfer failed");
        emit PayoutClaimed(marketId, msg.sender, payout);
    }

    function getMarket(uint256 marketId) external view returns (
        uint256 id,
        string memory question,
        uint256 closeTime,
        uint256 resolveTime,
        IPredictionMarket.MarketStatus status,
        IPredictionMarket.Outcome outcome,
        uint256 totalYesStake,
        uint256 totalNoStake
    ) {
        MarketInternal storage m = _markets[marketId];
        require(bytes(m.question).length > 0, "Market does not exist");
        return (
            marketId,
            m.question,
            m.closeTime,
            m.resolveTime,
            m.status,
            m.outcome,
            m.totalYesStake,
            m.totalNoStake
        );
    }

    function getTotalCommitted(uint256 marketId) external view returns (uint256) {
        MarketInternal storage m = _markets[marketId];
        require(bytes(m.question).length > 0, "Market does not exist");
        return m.totalCommitted;
    }

    function getCommitmentCount(uint256 marketId, address user) external view returns (uint256) {
        return _commitments[marketId][user].length;
    }
}
