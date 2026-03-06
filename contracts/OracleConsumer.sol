// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title OracleConsumer
/// @notice Contract to consume Chainlink data (feeds/Any API/Functions) and forward results to the CRE flow.
/// @dev In production, set authorizedCallback to the Chainlink Functions Router or CRE executor address.
///      Set authorizedAutomation to AutomationResolver for Chainlink Automation + Data Feeds resolution.
contract OracleConsumer {
    address public owner;
    address public creWorkflow;
    /// @notice Authorized address that may call oracleCallback (Chainlink Functions Router, CRE executor, etc.)
    address public authorizedCallback;
    /// @notice Authorized address for Chainlink Automation (AutomationResolver)
    address public authorizedAutomation;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAuthorizedCallback() {
        require(
            msg.sender == authorizedCallback || msg.sender == authorizedAutomation,
            "Not authorized"
        );
        _;
    }

    constructor(address _creWorkflow) {
        owner = msg.sender;
        creWorkflow = _creWorkflow;
    }

    function setCreWorkflow(address _creWorkflow) external onlyOwner {
        creWorkflow = _creWorkflow;
    }

    /// @notice Set the address authorized to invoke oracleCallback (e.g. Chainlink Functions Router).
    function setAuthorizedCallback(address _callback) external onlyOwner {
        authorizedCallback = _callback;
    }

    /// @notice Set the AutomationResolver address (Chainlink Automation + Data Feeds).
    function setAuthorizedAutomation(address _automation) external onlyOwner {
        authorizedAutomation = _automation;
    }

    /// @notice Callback that receives the off-chain result (Chainlink Evaluate).
    /// @dev Restricted to authorizedCallback. In production, set to the Chainlink Functions Router or CRE executor.
    function oracleCallback(uint256 marketId, uint8 rawOutcome) external onlyAuthorizedCallback {
        require(creWorkflow != address(0), "CRE not set");

        // Forward to CREWorkflow; rawOutcome is interpreted as enum Outcome.
        (bool ok, ) = creWorkflow.call(
            abi.encodeWithSignature("resolveFromOracle(uint256,uint8)", marketId, rawOutcome)
        );
        require(ok, "CRE callback failed");
    }
}


