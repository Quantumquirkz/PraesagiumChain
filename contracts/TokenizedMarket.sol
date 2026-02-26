// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title TokenizedMarket
/// @notice Prediction markets where each market mints an ERC-721 NFT to the creator.
/// @dev MVP: the NFT is a transferable "market ownership" token; no special privileges beyond provenance.
contract TokenizedMarket is ERC721, Ownable {
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
        string question;
        uint256 closeTime;
        uint256 resolveTime;
        MarketStatus status;
        Outcome outcome;
        uint256 totalYesStake;
        uint256 totalNoStake;
        address creator;
    }

    address public resolver;
    uint256 private _nextMarketId = 1;

    mapping(uint256 => Market) private _markets;
    mapping(uint256 => mapping(address => uint256)) private _yesStakes;
    mapping(uint256 => mapping(address => uint256)) private _noStakes;
    mapping(uint256 => mapping(address => bool)) private _claimed;

    event MarketTokenized(uint256 indexed marketId, address indexed creator, address indexed tokenOwner);
    event MarketCreated(uint256 indexed marketId, string question, uint256 closeTime, uint256 resolveTime, address indexed creator);
    event BetPlaced(uint256 indexed marketId, address indexed user, Outcome outcome, uint256 amount);
    event MarketLocked(uint256 indexed marketId);
    event MarketResolved(uint256 indexed marketId, Outcome outcome);
    event PayoutClaimed(uint256 indexed marketId, address indexed user, uint256 amount);

    modifier onlyResolver() {
        require(msg.sender == resolver, "Only resolver");
        _;
    }

    constructor(address _resolver) ERC721("Praesagium Market", "PRSMKT") Ownable(msg.sender) {
        resolver = _resolver;
    }

    function setResolver(address _resolver) external onlyOwner {
        resolver = _resolver;
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
        _markets[marketId] = Market({
            question: question,
            closeTime: closeTime,
            resolveTime: resolveTime,
            status: MarketStatus.Open,
            outcome: Outcome.Undecided,
            totalYesStake: 0,
            totalNoStake: 0,
            creator: msg.sender
        });

        _safeMint(msg.sender, marketId);
        emit MarketTokenized(marketId, msg.sender, msg.sender);
        emit MarketCreated(marketId, question, closeTime, resolveTime, msg.sender);
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

    function getMarket(uint256 marketId) external view returns (Market memory) {
        Market memory m = _markets[marketId];
        require(m.creator != address(0), "Market missing");
        return m;
    }
}

