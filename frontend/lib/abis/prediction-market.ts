export const predictionMarketAbi = [
  {
    inputs: [{ name: "marketId", type: "uint256" }],
    name: "getMarket",
    outputs: [
      { name: "id", type: "uint256", internalType: "uint256" },
      { name: "question", type: "string", internalType: "string" },
      { name: "closeTime", type: "uint256", internalType: "uint256" },
      { name: "resolveTime", type: "uint256", internalType: "uint256" },
      { name: "status", type: "uint8", internalType: "enum PredictionMarket.MarketStatus" },
      { name: "outcome", type: "uint8", internalType: "enum PredictionMarket.Outcome" },
      { name: "totalYesStake", type: "uint256", internalType: "uint256" },
      { name: "totalNoStake", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "marketId", type: "uint256", internalType: "uint256" },
      { name: "user", type: "address", internalType: "address" },
    ],
    name: "getUserStake",
    outputs: [
      { name: "yesStake", type: "uint256", internalType: "uint256" },
      { name: "noStake", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "question", type: "string", internalType: "string" },
      { name: "closeTime", type: "uint256", internalType: "uint256" },
      { name: "resolveTime", type: "uint256", internalType: "uint256" },
    ],
    name: "createMarket",
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "marketId", type: "uint256", internalType: "uint256" },
      { name: "outcome", type: "uint8", internalType: "enum PredictionMarket.Outcome" },
    ],
    name: "placeBet",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "marketId", type: "uint256", internalType: "uint256" }],
    name: "claimPayout",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { name: "marketId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "question", type: "string", indexed: false, internalType: "string" },
      { name: "creator", type: "address", indexed: true, internalType: "address" },
      { name: "closeTime", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "resolveTime", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    name: "MarketCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { name: "marketId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "user", type: "address", indexed: true, internalType: "address" },
      { name: "outcome", type: "uint8", indexed: false, internalType: "enum PredictionMarket.Outcome" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    name: "BetPlaced",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { name: "marketId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "outcome", type: "uint8", indexed: false, internalType: "enum PredictionMarket.Outcome" },
    ],
    name: "MarketResolved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { name: "marketId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "user", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    name: "PayoutClaimed",
    type: "event",
  },
] as const;
