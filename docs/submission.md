# PraesagiumChain — Hackathon submission checklist

This document follows [best practices for Web3 hackathon submissions](https://www.hackquest.io/blog/Best-Practices-for-Successful-Web3-Hackathon-Project-Submissions) and helps judges evaluate the project. Fill in the sections below before submitting.

---

## 1. Submission checklist

| Item | Status | Notes |
|------|--------|--------|
| **README.md** | ✅ | Overview, tech stack, install and usage in repo root |
| **Contract addresses** | ⬜ | Fill when deployed to testnet (see below) |
| **Blockchain network** | ⬜ | e.g. Sepolia, Polygon Amoy, Linea Sepolia |
| **Scan URL (block explorer)** | ⬜ | Etherscan / Polygonscan / etc. verification link |
| **Demo video (2–5 min)** | ⬜ | Key features, contract interaction, UI; link here |
| **GitHub repo** | ✅ | Public, organized, clear commit history |
| **Live frontend link** | ⬜ | e.g. Vercel / Netlify (if applicable) |
| **API / third-party access** | ⬜ | See [README](../README.md) and [development.md](development.md) for env vars |

---

## 2. Deployed contracts (fill after testnet deployment)

When you deploy to a **testnet** (required for most hackathons), add the addresses and explorer links here and in the main [README](../README.md).

| Contract | Network | Address | Explorer (verify contract) |
|----------|---------|---------|----------------------------|
| PredictionMarket | _e.g. Sepolia_ | `0x...` | [View on Etherscan](https://sepolia.etherscan.io/address/) |
| CREWorkflow | _same_ | `0x...` | [View](https://sepolia.etherscan.io/address/) |
| OracleConsumer | _same_ | `0x...` | [View](https://sepolia.etherscan.io/address/) |
| PredictionMarketFunctionsConsumer | _same_ (optional) | `0x...` | [View](https://sepolia.etherscan.io/address/) |

**Important:** Deploy on the **correct chain** for the hackathon (e.g. Sepolia for Ethereum-focused events). Wrong chain can lead to disqualification.

### Testnet ETH / tokens

- **Sepolia:** [sepoliafaucet.com](https://sepoliafaucet.com), [Alchemy Sepolia Faucet](https://www.alchemy.com/faucets/ethereum-sepolia), or [Google Cloud Faucet](https://cloud.google.com/application/dashboard).
- **Polygon Amoy:** [faucet.polygon.technology](https://faucet.polygon.technology) (select Amoy).

---

## 3. Demo video

- **Length:** 2–5 minutes recommended.
- **Content:** Problem → solution → key features → contract interaction and UI (if any).
- **Link:** _Add your Loom / YouTube / other link here after recording._

---

## 4. Quick links for judges

- **Repository:** [GitHub – PraesagiumChain](https://github.com/your-org/PraesagiumChain) _(update with real URL)_
- **Documentation:** [architecture.md](architecture.md) · [development.md](development.md)
- **Tech stack:** Solidity (OpenZeppelin, Chainlink), Hardhat, Rust (Axum), Chainlink CRE, PHPE engine, AI (Gemini/HF)

---

## 5. References

- [HackQuest – Best practices for Web3 hackathon submissions](https://www.hackquest.io/blog/Best-Practices-for-Successful-Web3-Hackathon-Project-Submissions)
- [Hackathon 101 – Survival guide for Web3 developers (Medium)](https://medium.com/@BizthonOfficial/hackathon-101-the-ultimate-survival-guide-for-first-time-web3-developers-4f3d51fbab0d)
- [Chainlink Prediction Markets Hackathon](https://chain.link/community/hackathon)

---

## 6. Winning ideas (summary)

To make the project stand out:

- **Calibrated uncertainty (PHPE):** Show users not only a probability but also an uncertainty band from the time-series + Bayesian engine, so they can gauge confidence. The API already returns `uncertainty` in `/api/predict/hybrid` when time series is used.
- **Single CRE layer for all sources:** Resolution can come from AI sentiment (Gemini), Chainlink Price Feeds, Binance, sports/weather APIs, or time-series predictions—all through one Chainlink CRE workflow.
- **One clear vertical for the demo:** Pick one use case (e.g. “Will ETH be above $X?” or “Will sentiment be bullish?”) and run it end-to-end in the video: create market → bet → resolve (via backend + `resolveFromBackend.js`) → claim.
- **Testnet + verification + Scan URL:** Deploy on the hackathon’s required chain, verify contracts, and add addresses and explorer links to README and this file.
- **“Why we’re different” in README and submission description:** Short paragraph on calibrated uncertainty, multi-source CRE, and modular on-chain design (conditional, private, tokenized markets, reputation).
- **Chainlink visible:** CRE, Functions (or Automation), and Data Feed named and shown in the flow. Optionally use `scripts/resolveFromBackend.js` + cron as “resolution at resolveTime” or document Chainlink Automation as the production path.

Priority order: demo video + one E2E vertical, testnet and verification, “why different” narrative, PHPE uncertainty in API and pitch, then Automation if time allows.
