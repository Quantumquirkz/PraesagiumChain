// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IPredictionMarket.sol";

/// @title CREWorkflow
/// @notice Simplified bridge between external CRE/Oracle flow and PredictionMarket contract.
///         Accepts resolution from oracle (Functions Consumer, CRE executor) or authorizedAutomation (OracleConsumer for Chainlink Automation + Data Feeds).
contract CREWorkflow {
    IPredictionMarket public immutable predictionMarket;
    address public owner;
    address public oracle; // primary oracle (Functions Consumer, CRE executor)
    address public authorizedAutomation; // OracleConsumer for Chainlink Automation + Data Feeds

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle || msg.sender == authorizedAutomation, "Only oracle");
        _;
    }

    constructor(address _predictionMarket, address _oracle) {
        predictionMarket = IPredictionMarket(_predictionMarket);
        owner = msg.sender;
        oracle = _oracle;
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }

    function setAuthorizedAutomation(address _automation) external onlyOwner {
        authorizedAutomation = _automation;
    }

    /// @notice Called from the oracle (off-chain / Chainlink) when there is a final result.
    /// @dev Additional validation or multi-sig logic could be added here if desired.
    function resolveFromOracle(uint256 marketId, IPredictionMarket.Outcome outcome) external onlyOracle {
        // Encapsulates the resolution call to PredictionMarket.
        // We use a low-level call; PredictionMarket exposes resolveMarket publicly.
        // Para simplicidad asumimos que PredictionMarket expone `resolveMarket`.

        // ABI-encode and low-level call to avoid extra interface coupling.
        (bool ok, ) = address(predictionMarket).call(
            abi.encodeWithSignature("resolveMarket(uint256,uint8)", marketId, uint8(outcome))
        );
        require(ok, "Resolve failed");
    }
}


