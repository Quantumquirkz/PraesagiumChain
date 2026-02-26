// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IPredictionMarket.sol";

/// @title PrivateMarket
/// @notice Access-controlled prediction markets.
/// @dev Note: true confidentiality is not achievable on a public chain without specialized tech.
///      This contract enforces participation access, while the market description can be stored
///      as an encrypted URI/hash.
contract PrivateMarket {
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

    struct Market {
        bytes32 detailsHash; // hash of plaintext details (or encrypted blob)
        string encryptedURI; // e.g., IPFS CID to encrypted payload
        uint256 closeTime;
        uint256 resolveTime;
        MarketStatus status;
        Outcome outcome;
        uint256 totalYesStake;
        uint256 totalNoStake;
        address creator;
    }

    address public owner;
    address public resolver;

    uint256 private _nextMarketId = 1;
    mapping(uint256 => Market) private _markets;
    mapping(uint256 => mapping(address => bool)) public isParticipant;
    mapping(uint256 => mapping(address => uint256)) private _yesStakes;
    mapping(uint256 => mapping(address => uint256)) private _noStakes;
    mapping(uint256 => mapping(address => bool)) private _claimed;

    event PrivateMarketCreated(
        uint256 indexed marketId,
        bytes32 indexed detailsHash,
        string encryptedURI,
        uint256 closeTime,
        uint256 resolveTime,
        address indexed creator
    );

    event ParticipantAuthorized(uint256 indexed marketId, address indexed participant, bool allowed);
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

    modifier onlyParticipant(uint256 marketId) {
        require(isParticipant[marketId][msg.sender], "Not authorized");
        _;
    }

    constructor(address _resolver) {
        owner = msg.sender;
        resolver = _resolver;
    }

    function setResolver(address _resolver) external onlyOwner {
        resolver = _resolver;
    }

    function createPrivateMarket(
        bytes32 detailsHash,
        string calldata encryptedURI,
        uint256 closeTime,
        uint256 resolveTime,
        address[] calldata participants
    ) external returns (uint256 marketId) {
        require(detailsHash != bytes32(0), "detailsHash required");
        require(closeTime > block.timestamp, "closeTime in past");
        require(resolveTime > closeTime, "resolveTime must be after closeTime");

        marketId = _nextMarketId++;

        _markets[marketId] = Market({
            detailsHash: detailsHash,
            encryptedURI: encryptedURI,
            closeTime: closeTime,
            resolveTime: resolveTime,
            status: MarketStatus.Open,
            outcome: Outcome.Undecided,
            totalYesStake: 0,
            totalNoStake: 0,
            creator: msg.sender
        });

        // creator is always a participant
        isParticipant[marketId][msg.sender] = true;
        emit ParticipantAuthorized(marketId, msg.sender, true);

        for (uint256 i = 0; i < participants.length; i++) {
            isParticipant[marketId][participants[i]] = true;
            emit ParticipantAuthorized(marketId, participants[i], true);
        }

        emit PrivateMarketCreated(marketId, detailsHash, encryptedURI, closeTime, resolveTime, msg.sender);
    }

    function setParticipant(uint256 marketId, address participant, bool allowed) external {
        Market storage m = _markets[marketId];
        require(m.creator == msg.sender, "Only creator");
        isParticipant[marketId][participant] = allowed;
        emit ParticipantAuthorized(marketId, participant, allowed);
    }

    function placeBet(uint256 marketId, Outcome outcome) external payable onlyParticipant(marketId) {
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

    function resolveMarket(uint256 marketId, Outcome outcome) external onlyResolver {
        require(outcome == Outcome.Yes || outcome == Outcome.No, "Invalid outcome");
        Market storage m = _markets[marketId];
        require(m.creator != address(0), "Market missing");
        require(m.status != MarketStatus.Resolved, "Already resolved");
        require(block.timestamp >= m.resolveTime, "Too early");

        m.status = MarketStatus.Resolved;
        m.outcome = outcome;
        emit MarketResolved(marketId, outcome);
    }

    function claimPayout(uint256 marketId) external onlyParticipant(marketId) {
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

    function getMarket(uint256 marketId) external view onlyParticipant(marketId) returns (Market memory) {
        Market memory m = _markets[marketId];
        require(m.creator != address(0), "Market missing");
        return m;
    }
}

