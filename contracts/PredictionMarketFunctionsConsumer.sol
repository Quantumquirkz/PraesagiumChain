// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import "./interfaces/IPredictionMarket.sol";
import "./CREWorkflow.sol";

/// @title PredictionMarketFunctionsConsumer
/// @notice Official Chainlink Functions consumer: receives fulfillRequest from the Router
///         and forwards the result (marketId, outcome) to CREWorkflow for resolution.
contract PredictionMarketFunctionsConsumer is FunctionsClient {
    using FunctionsRequest for FunctionsRequest.Request;

    CREWorkflow public immutable creWorkflow;
    address public owner;

    uint32 public constant MAX_CALLBACK_GAS = 300_000;

    /// requestId => marketId (to resolve in fulfillRequest)
    mapping(bytes32 => uint256) public s_pendingMarketId;

    event ResolutionRequestSent(bytes32 indexed requestId, uint256 indexed marketId);
    event MarketResolvedFromFunctions(bytes32 indexed requestId, uint256 indexed marketId, uint8 outcome);

    error OnlyOwner();
    error InvalidResponseLength();
    error InvalidOutcome();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    /// @param _router Chainlink Functions Router address (network-specific).
    /// @param _creWorkflow CREWorkflow contract address.
    constructor(address _router, address _creWorkflow) FunctionsClient(_router) {
        creWorkflow = CREWorkflow(payable(_creWorkflow));
        owner = msg.sender;
    }

    function setOwner(address _owner) external onlyOwner {
        owner = _owner;
    }

    /// @notice Sends a request to Chainlink Functions to resolve a market.
    /// @param marketId ID of the market to resolve.
    /// @param sourceCode JavaScript code that Chainlink will run (must return 0 or 1).
    /// @param args Arguments for the script (e.g. [marketId, "text for sentiment"]).
    /// @param subscriptionId Chainlink Functions subscription ID.
    /// @param donId Chainlink DON ID.
    function sendResolutionRequest(
        uint256 marketId,
        string calldata sourceCode,
        string[] calldata args,
        uint64 subscriptionId,
        bytes32 donId
    ) external onlyOwner returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(sourceCode);
        if (args.length > 0) {
            req.setArgs(args);
        }
        requestId = _sendRequest(req.encodeCBOR(), subscriptionId, MAX_CALLBACK_GAS, donId);
        s_pendingMarketId[requestId] = marketId;
        emit ResolutionRequestSent(requestId, marketId);
        return requestId;
    }

    /// @notice Callback invoked by the Functions Router (Evaluate).
    /// @param requestId Request ID.
    /// @param response Aggregated response (we expect 1 byte: 0 = No, 1 = Yes).
    /// @param err If execution failed, error content.
    function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
        uint256 marketId = s_pendingMarketId[requestId];
        delete s_pendingMarketId[requestId];

        if (err.length > 0) {
            // In production could retry or emit failure event.
            revert("Functions execution failed");
        }
        if (response.length < 1) revert InvalidResponseLength();

        uint8 outcome = uint8(response[0]);
        if (outcome != 0 && outcome != 1) revert InvalidOutcome();

        IPredictionMarket.Outcome out = outcome == 1 ? IPredictionMarket.Outcome.Yes : IPredictionMarket.Outcome.No;
        creWorkflow.resolveFromOracle(marketId, out);

        emit MarketResolvedFromFunctions(requestId, marketId, outcome);
    }
}
