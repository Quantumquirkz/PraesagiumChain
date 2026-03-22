// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "./interfaces/IPredictionMarket.sol";

/// @title AutomationResolver
/// @notice Chainlink Automation-compatible contract that resolves price-based prediction markets
///         using Chainlink Data Feeds. Implements checkUpkeep/performUpkeep for automatic resolution.
contract AutomationResolver is AutomationCompatibleInterface {
    struct PriceConfig {
        address feed;
        int256 threshold;
        bool greaterThan; // true = price >= threshold => Yes (1), false = price < threshold => No (0)
    }

    IPredictionMarket public immutable predictionMarket;
    address public oracleConsumer;
    address public immutable owner;
    address public registry; // Chainlink Automation Registry - only this can call performUpkeep

    mapping(uint256 => PriceConfig) public priceMarkets;
    uint256[] private _marketIds;
    mapping(uint256 => bool) private _hasConfig;

    event PriceMarketAdded(uint256 indexed marketId, address feed, int256 threshold, bool greaterThan);
    event MarketResolvedByAutomation(uint256 indexed marketId, int256 price, uint8 outcome);
    event RegistrySet(address indexed registry);
    event OracleConsumerSet(address indexed oracleConsumer);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyRegistry() {
        require(msg.sender == registry, "Only registry");
        _;
    }

    constructor(
        address _predictionMarket,
        address _oracleConsumer,
        address _registry
    ) {
        predictionMarket = IPredictionMarket(_predictionMarket);
        oracleConsumer = _oracleConsumer;
        registry = _registry;
        owner = msg.sender;
    }

    function setRegistry(address newRegistry) external onlyOwner {
        registry = newRegistry;
        emit RegistrySet(newRegistry);
    }

    function setOracleConsumer(address newOracleConsumer) external onlyOwner {
        oracleConsumer = newOracleConsumer;
        emit OracleConsumerSet(newOracleConsumer);
    }

    /// @notice Register a price-based market for automatic resolution.
    /// @param marketId Market ID from PredictionMarket
    /// @param feed Chainlink Data Feed address (AggregatorV3Interface)
    /// @param threshold Price threshold (in feed decimals, e.g. 8 decimals for BTC/USD)
    /// @param greaterThan If true: outcome Yes (1) when price >= threshold; No (0) when price < threshold
    function addPriceMarket(
        uint256 marketId,
        address feed,
        int256 threshold,
        bool greaterThan
    ) external onlyOwner {
        require(feed != address(0), "Invalid feed");
        require(!_hasConfig[marketId], "Already registered");

        priceMarkets[marketId] = PriceConfig({feed: feed, threshold: threshold, greaterThan: greaterThan});
        _marketIds.push(marketId);
        _hasConfig[marketId] = true;

        emit PriceMarketAdded(marketId, feed, threshold, greaterThan);
    }

    /// @notice Remove a market from automatic resolution (e.g. if resolved manually).
    function removePriceMarket(uint256 marketId) external onlyOwner {
        require(_hasConfig[marketId], "Not registered");
        delete priceMarkets[marketId];
        _hasConfig[marketId] = false;
        // Note: we don't remove from _marketIds to avoid gas-heavy array manipulation; checkUpkeep will skip
    }

    function getMarketCount() external view returns (uint256) {
        return _marketIds.length;
    }

    function getMarketIdAt(uint256 index) external view returns (uint256) {
        return _marketIds[index];
    }

    /// @inheritdoc AutomationCompatibleInterface
    function checkUpkeep(
        bytes calldata /* checkData */
    ) external view override returns (bool upkeepNeeded, bytes memory performData) {
        if (oracleConsumer == address(0)) return (false, "");

        for (uint256 i = 0; i < _marketIds.length; i++) {
            uint256 marketId = _marketIds[i];
            if (!_hasConfig[marketId]) continue;

            IPredictionMarket.MarketView memory m = predictionMarket.getMarket(marketId);
            if (m.status == IPredictionMarket.MarketStatus.Resolved) continue;
            if (m.status == IPredictionMarket.MarketStatus.Cancelled) continue;
            if (block.timestamp < m.resolveTime) continue;

            upkeepNeeded = true;
            performData = abi.encode(marketId);
            return (upkeepNeeded, performData);
        }
        return (false, "");
    }

    /// @inheritdoc AutomationCompatibleInterface
    function performUpkeep(bytes calldata performData) external override onlyRegistry {
        require(oracleConsumer != address(0), "Oracle not set");

        uint256 marketId = abi.decode(performData, (uint256));
        require(_hasConfig[marketId], "Unknown market");

        PriceConfig memory config = priceMarkets[marketId];

        (
            ,
            int256 answer,
            ,
            uint256 updatedAt,

        ) = AggregatorV3Interface(config.feed).latestRoundData();

        require(answer > 0, "Invalid price");
        require(updatedAt > 0, "Stale price");
        require(block.timestamp - updatedAt <= 1 hours, "Price too stale"); // 1h max staleness

        uint8 outcome;
        if (config.greaterThan) {
            outcome = answer >= config.threshold ? 1 : 0; // Yes = 1, No = 0
        } else {
            outcome = answer < config.threshold ? 1 : 0;
        }

        (bool ok, ) = oracleConsumer.call(
            abi.encodeWithSignature("oracleCallback(uint256,uint8)", marketId, outcome)
        );
        require(ok, "Oracle callback failed");

        emit MarketResolvedByAutomation(marketId, answer, outcome);
    }
}
