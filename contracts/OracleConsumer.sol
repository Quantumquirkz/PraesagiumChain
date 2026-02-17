// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title OracleConsumer
/// @notice Contrato para consumir datos de Chainlink (feeds/Any API/Functions) y reenviar resultados al flujo CRE.
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

    /// @notice Función de callback simulada que representaría la devolución de Chainlink.
    /// @dev En una integración real, esta firma la definiría el contrato de Chainlink Functions/Any API.
    function oracleCallback(uint256 marketId, uint8 rawOutcome) external /* onlyChainlink */ {
        require(creWorkflow != address(0), "CRE not set");

        // Reenviar a CREWorkflow; se interpreta rawOutcome como enum Outcome.
        (bool ok, ) = creWorkflow.call(
            abi.encodeWithSignature("resolveFromOracle(uint256,uint8)", marketId, rawOutcome)
        );
        require(ok, "CRE callback failed");
    }
}


