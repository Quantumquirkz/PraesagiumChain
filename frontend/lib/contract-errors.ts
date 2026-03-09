import { ContractFunctionRevertedError, BaseError } from "viem";

// ─── Mapeo de errores del contrato PredictionMarket ───────────────────────────

const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  MarketNotOpen:          "This market is not accepting bets right now.",
  MarketDoesNotExist:     "This market does not exist on-chain. The app may be out of sync — try refreshing.",
  MarketClosed:          "This market is closed and no longer accepting bets.",
  MarketAlreadyResolved:  "This market has already been resolved.",
  InsufficientFee:        "The creation fee is insufficient. Check the required amount.",
  InvalidOutcome:         "Invalid bet outcome. Choose Yes or No.",
  ZeroStake:             "Bet amount must be greater than 0.",
  NothingToClaim:         "You have no winnings to claim on this market.",
  AlreadyClaimed:         "You have already claimed your winnings for this market.",
  MarketNotResolved:      "This market has not been resolved yet.",
  InvalidTimeRange:       "The close time must be before the resolve time.",
  TimeMustBeInFuture:     "Close and resolve times must be in the future.",
  Unauthorized:           "You are not authorized to perform this action.",
  "user rejected":        "Transaction cancelled — you rejected the request in your wallet.",
  "insufficient funds":   "Insufficient ETH balance to complete this transaction.",
};

// ─── Función principal ────────────────────────────────────────────────────────

export function parseContractError(error: unknown): string {
  if (!error) return "An unknown error occurred.";

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // Rechazo del usuario en la wallet
    if (msg.includes("user rejected") || msg.includes("user denied")) {
      return CONTRACT_ERROR_MESSAGES["user rejected"];
    }

    // Fondos insuficientes
    if (msg.includes("insufficient funds")) {
      return CONTRACT_ERROR_MESSAGES["insufficient funds"];
    }

    // Gas limit superior al bloque (Sepolia ~16.7M)
    if (
      msg.includes("gas limit too high") ||
      msg.includes("transaction gas limit") ||
      msg.includes("exceeds block gas limit")
    ) {
      return "Transaction gas limit exceeds block limit. Please try again; if it persists, try a different wallet or reduce complexity.";
    }
  }

  // Contract revert error (viem BaseError)
  if (error instanceof BaseError) {
    const revertError = error.walk(
      (e): e is ContractFunctionRevertedError =>
        e instanceof ContractFunctionRevertedError
    );
    if (revertError instanceof ContractFunctionRevertedError) {
      const errorName = revertError.data?.errorName;
      if (errorName && CONTRACT_ERROR_MESSAGES[errorName]) {
        return CONTRACT_ERROR_MESSAGES[errorName];
      }
      if (revertError.reason) return revertError.reason;
    }
  }

  // Fallback: clean message without raw hex hashes
  const raw = error instanceof Error ? error.message : String(error);
  const clean = raw.replace(/0x[0-9a-fA-F]+/g, "[tx]").split("\n")[0].slice(0, 120);
  return clean || "Transaction failed. Please try again.";
}
