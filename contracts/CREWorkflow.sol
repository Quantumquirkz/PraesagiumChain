// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IPredictionMarket.sol";

/// @title CREWorkflow
/// @notice Simplified bridge between external CRE/Oracle flow and PredictionMarket contract.
///         Accepts resolution from oracle (Functions Consumer, CRE executor) or authorizedAutomation (OracleConsumer for Chainlink Automation + Data Feeds).
contract CREWorkflow {
    IPredictionMarket public immutable predictionMarket;
    address public immutable owner;
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

    function setOracle(address newOracle) external onlyOwner {
        oracle = newOracle;
    }

    function setAuthorizedAutomation(address newAutomation) external onlyOwner {
        authorizedAutomation = newAutomation;
    }

    /// @notice Called from the oracle (off-chain / Chainlink) when there is a final result.
    /// @param rawOutcome 0 = No, 1 = Yes (convention from AutomationResolver / OracleConsumer).
    /// @dev Maps raw 0/1 to Outcome enum (Yes=1, No=2) before calling PredictionMarket.
    function resolveFromOracle(uint256 marketId, uint8 rawOutcome) external onlyOracle {
        IPredictionMarket.Outcome outcome = rawOutcome == 1
            ? IPredictionMarket.Outcome.Yes
            : IPredictionMarket.Outcome.No;

        (bool ok, ) = address(predictionMarket).call(
            abi.encodeWithSignature("resolveMarket(uint256,uint8)", marketId, uint8(outcome))
        );
        require(ok, "Resolve failed");
    }
}


