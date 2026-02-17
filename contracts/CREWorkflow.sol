// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IPredictionMarket.sol";

/// @title CREWorkflow
/// @notice Puente simplificado entre el flujo CRE/Oracle externo y el contrato PredictionMarket.
contract CREWorkflow {
    IPredictionMarket public immutable predictionMarket;
    address public owner;
    address public oracle; // contrato/oráculo autorizado (por ejemplo, OracleConsumer)

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

    /// @notice Llamada desde el oráculo (off-chain / Chainlink) cuando haya un resultado definitivo.
    /// @dev Aquí se podría añadir lógica adicional de validación o multi-firma si se desea.
    function resolveFromOracle(uint256 marketId, IPredictionMarket.Outcome outcome) external onlyOracle {
        // Encapsula la llamada de resolución en PredictionMarket.
        // Usamos una interfaz extendida vía `address(predictionMarket).call` o
        // exponiendo `resolveMarket` públicamente en PredictionMarket.
        // Para simplicidad asumimos que PredictionMarket expone `resolveMarket`.

        // ABI-encode y hacer low-level call para no acoplar interfaces adicionales.
        (bool ok, ) = address(predictionMarket).call(
            abi.encodeWithSignature("resolveMarket(uint256,uint8)", marketId, uint8(outcome))
        );
        require(ok, "Resolve failed");
    }
}


