export const privatePredictionMarketAbi = [
  // ─── Write functions ───────────────────────────────────────────────────────
  {
    name: "createMarket",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "question",    type: "string"  },
      { name: "closeTime",   type: "uint256" },
      { name: "resolveTime", type: "uint256" },
    ],
    outputs: [{ name: "marketId", type: "uint256" }],
  },
  {
    name: "commitBet",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "marketId",   type: "uint256"  },
      { name: "commitment", type: "bytes32"  },
    ],
    outputs: [],
  },
  {
    name: "revealBet",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256"  },
      { name: "index",    type: "uint256"  },
      { name: "outcome",  type: "uint8"    },
      { name: "amount",   type: "uint256"  },
      { name: "nonce",    type: "bytes32"  },
    ],
    outputs: [],
  },
  {
    name: "claimPayout",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "setResolver",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_resolver", type: "address" }],
    outputs: [],
  },
  // ─── Read functions ────────────────────────────────────────────────────────
  {
    name: "getMarket",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      { name: "id",          type: "uint256" },
      { name: "question",    type: "string"  },
      { name: "closeTime",   type: "uint256" },
      { name: "resolveTime", type: "uint256" },
      { name: "status",      type: "uint8"   },
      { name: "outcome",     type: "uint8"   },
      { name: "totalYesStake", type: "uint256" },
      { name: "totalNoStake",  type: "uint256" },
    ],
  },
  {
    name: "getTotalCommitted",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getCommitmentCount",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "user",     type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "resolver",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  // ─── Events ────────────────────────────────────────────────────────────────
  {
    name: "MarketCreated",
    type: "event",
    inputs: [
      { name: "marketId",   type: "uint256", indexed: true  },
      { name: "question",   type: "string",  indexed: false },
      { name: "closeTime",  type: "uint256", indexed: false },
      { name: "resolveTime",type: "uint256", indexed: false },
      { name: "creator",    type: "address", indexed: true  },
    ],
  },
  {
    name: "BetCommitted",
    type: "event",
    inputs: [
      { name: "marketId",   type: "uint256", indexed: true  },
      { name: "user",       type: "address", indexed: true  },
      { name: "index",      type: "uint256", indexed: false },
      { name: "value",      type: "uint256", indexed: false },
      { name: "commitment", type: "bytes32", indexed: false },
    ],
  },
  {
    name: "BetRevealed",
    type: "event",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true  },
      { name: "user",     type: "address", indexed: true  },
      { name: "outcome",  type: "uint8",   indexed: false },
      { name: "amount",   type: "uint256", indexed: false },
    ],
  },
  {
    name: "MarketResolved",
    type: "event",
    inputs: [
      { name: "marketId",     type: "uint256", indexed: true  },
      { name: "outcome",      type: "uint8",   indexed: false },
      { name: "totalYesStake",type: "uint256", indexed: false },
      { name: "totalNoStake", type: "uint256", indexed: false },
    ],
  },
  {
    name: "PayoutClaimed",
    type: "event",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true  },
      { name: "user",     type: "address", indexed: true  },
      { name: "amount",   type: "uint256", indexed: false },
    ],
  },
] as const;
