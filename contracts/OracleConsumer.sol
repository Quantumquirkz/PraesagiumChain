// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title OracleConsumer
/// @notice Contract to consume Chainlink data (feeds/Any API/Functions) and forward results to the CRE flow.
contract OracleConsumer {
    address public owner;
    address public creWorkflow;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _creWorkflow) {
        owner = msg.sender;
        creWorkflow = _creWorkflow;
    }

    function setCreWorkflow(address _creWorkflow) external onlyOwner {
        creWorkflow = _creWorkflow;
    }

    /// @notice Callback that receives the off-chain result (Chainlink Evaluate).
    /// @dev With Chainlink Functions integration, the Consumer inherits from FunctionsClient and
    ///      in fulfillRequest(requestId, response, err) response is decoded to (marketId, outcome)
    ///      and this function is invoked (or CREWorkflow.resolveFromOracle is called directly).
    ///      Any call to oracleCallback should be restricted to the Chainlink contract in production.
    function oracleCallback(uint256 marketId, uint8 rawOutcome) external /* onlyChainlink */ {
        require(creWorkflow != address(0), "CRE not set");

        // Forward to CREWorkflow; rawOutcome is interpreted as enum Outcome.
        (bool ok, ) = creWorkflow.call(
            abi.encodeWithSignature("resolveFromOracle(uint256,uint8)", marketId, rawOutcome)
        );
        require(ok, "CRE callback failed");
    }
}


