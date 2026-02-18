// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IPredictionMarket.sol";

/// @title CREWorkflow
/// @notice Puente simplificado entre el flujo CRE/Oracle externo y el contrato PredictionMarket.
contract CREWorkflow {
    IPredictionMarket public immutable predictionMarket;
    address public owner;
    address public oracle; // authorized oracle contract (e.g. OracleConsumer)

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle");
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

    /// @notice Called from the oracle (off-chain / Chainlink) when there is a final result.
    /// @dev Additional validation or multi-sig logic could be added here if desired.
    function resolveFromOracle(uint256 marketId, IPredictionMarket.Outcome outcome) external onlyOracle {
        // Encapsulates the resolution call to PredictionMarket.
        // We use a low-level call; PredictionMarket exposes resolveMarket publicly.
        // Para simplicidad asumimos que PredictionMarket expone `resolveMarket`.

        // ABI-encode y hacer low-level call para no acoplar interfaces adicionales.
        (bool ok, ) = address(predictionMarket).call(
            abi.encodeWithSignature("resolveMarket(uint256,uint8)", marketId, uint8(outcome))
        );
        require(ok, "Resolve failed");
    }
}


