"use client";

import { useState, useCallback } from "react";
import {
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  parseEther,
} from "viem";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { toast } from "sonner";
import { EXPLORER_URL } from "@/lib/constants";
import { privatePredictionMarketAbi } from "@/lib/abis/private-prediction-market";

const _privateMarketAddress = process.env.NEXT_PUBLIC_PRIVATE_MARKET_ADDRESS;
if (!_privateMarketAddress) {
  throw new Error(
    "NEXT_PUBLIC_PRIVATE_MARKET_ADDRESS is not defined. Add it to .env.local."
  );
}
const PRIVATE_MARKET_ADDRESS = _privateMarketAddress as `0x${string}`;

const STORAGE_KEY = (marketId: number) => `praesagium_nonce_${marketId}`;

export type CommitRevealStep =
  | "idle"
  | "commit"
  | "committing"
  | "committed"
  | "reveal"
  | "revealing"
  | "done"
  | "claiming"
  | "claimed";

export interface CommitRevealState {
  step: CommitRevealStep;
  commitment: `0x${string}` | null;
  nonce: `0x${string}` | null;
  index: number | null;
  commitTxHash: `0x${string}` | null;
  revealTxHash: `0x${string}` | null;
  claimTxHash: `0x${string}` | null;
}

interface StoredCommit {
  nonce: string;
  outcome: number;
  amount: string;
  index: number;
}

function generateNonce(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}` as `0x${string}`;
}

/**
 * Computes the commitment hash matching Solidity's:
 *   keccak256(abi.encode(outcome, amount, nonce))
 *
 * Uses encodeAbiParameters (ABI encoding with 32-byte padding per slot),
 * NOT encodePacked — the two produce different bytes for uint8/uint256.
 */
function computeCommitment(
  outcome: number,
  amountWei: bigint,
  nonce: `0x${string}`
): `0x${string}` {
  return keccak256(
    encodeAbiParameters(parseAbiParameters("uint8, uint256, bytes32"), [
      outcome,
      amountWei,
      nonce as `0x${string}`,
    ])
  );
}

export function useCommitReveal(marketId: number) {
  const [state, setState] = useState<CommitRevealState>({
    step: "idle",
    commitment: null,
    nonce: null,
    index: null,
    commitTxHash: null,
    revealTxHash: null,
    claimTxHash: null,
  });

  const { writeContractAsync } = useWriteContract();

  const { isLoading: isConfirmingCommit } = useWaitForTransactionReceipt({
    hash: state.commitTxHash ?? undefined,
  });

  const { isLoading: isConfirmingReveal } = useWaitForTransactionReceipt({
    hash: state.revealTxHash ?? undefined,
  });

  const { isLoading: isConfirmingClaim } = useWaitForTransactionReceipt({
    hash: state.claimTxHash ?? undefined,
  });

  const startCommit = useCallback(() => {
    setState((s) => ({ ...s, step: "commit" }));
  }, []);

  const executeCommit = useCallback(
    async (outcome: number, amountEth: string, currentCommitCount: number) => {
      try {
        const nonce = generateNonce();
        const amountWei = parseEther(amountEth);
        const commitment = computeCommitment(outcome, amountWei, nonce);

        // The index this commitment will occupy = current count (0-based)
        const index = currentCommitCount;

        setState((s) => ({ ...s, step: "committing", nonce, commitment, index }));

        // Persist to localStorage so the reveal can recover after page reload
        const stored: StoredCommit = { nonce, outcome, amount: amountEth, index };
        localStorage.setItem(STORAGE_KEY(marketId), JSON.stringify(stored));

        toast.info("Confirm the commit in your wallet");
        const hash = await writeContractAsync({
          address: PRIVATE_MARKET_ADDRESS,
          abi: privatePredictionMarketAbi,
          functionName: "commitBet",
          args: [BigInt(marketId), commitment],
          value: amountWei,
        });

        setState((s) => ({
          ...s,
          step: "committed",
          commitTxHash: hash as `0x${string}`,
        }));

        toast.success("Commit submitted", {
          action: hash
            ? {
                label: "View on Etherscan",
                onClick: () =>
                  window.open(`${EXPLORER_URL}/tx/${hash}`, "_blank"),
              }
            : undefined,
        });
      } catch (e) {
        setState((s) => ({ ...s, step: "commit" }));
        toast.error(e instanceof Error ? e.message : "Error submitting commit");
      }
    },
    [marketId, writeContractAsync]
  );

  const startReveal = useCallback(() => {
    setState((s) => ({ ...s, step: "reveal" }));
  }, []);

  const executeReveal = useCallback(
    async (manualNonce?: string) => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY(marketId));
        let nonce: `0x${string}`;
        let outcome: number;
        let amount: string;
        let index: number;

        if (stored) {
          const parsed = JSON.parse(stored) as StoredCommit;
          nonce = (manualNonce ?? parsed.nonce) as `0x${string}`;
          outcome = parsed.outcome;
          amount = parsed.amount;
          index = parsed.index ?? 0;
        } else if (manualNonce) {
          nonce = manualNonce as `0x${string}`;
          outcome = 1;
          amount = "0";
          index = 0;
        } else {
          toast.error(
            "Saved nonce not found. Enter the nonce manually."
          );
          return;
        }

        const amountWei = parseEther(amount);

        // Verify commitment locally before sending
        const expectedCommitment = computeCommitment(outcome, amountWei, nonce);
        if (state.commitment && expectedCommitment !== state.commitment) {
          toast.error(
            "Nonce does not match the original commitment. Check the value."
          );
          return;
        }

        setState((s) => ({ ...s, step: "revealing" }));

        toast.info("Confirm the reveal in your wallet");
        const hash = await writeContractAsync({
          address: PRIVATE_MARKET_ADDRESS,
          abi: privatePredictionMarketAbi,
          functionName: "revealBet",
          // Contract signature: revealBet(marketId, index, outcome, amount, nonce)
          args: [BigInt(marketId), BigInt(index), outcome, amountWei, nonce],
        });

        setState((s) => ({
          ...s,
          step: "done",
          revealTxHash: hash as `0x${string}`,
        }));

        localStorage.removeItem(STORAGE_KEY(marketId));

        toast.success("Reveal submitted", {
          action: hash
            ? {
                label: "View on Etherscan",
                onClick: () =>
                  window.open(`${EXPLORER_URL}/tx/${hash}`, "_blank"),
              }
            : undefined,
        });
      } catch (e) {
        setState((s) => ({ ...s, step: "reveal" }));
        toast.error(e instanceof Error ? e.message : "Error submitting reveal");
      }
    },
    [marketId, state.commitment, writeContractAsync]
  );

  const startClaim = useCallback(() => {
    setState((s) => ({ ...s, step: "claiming" }));
  }, []);

  const executeClaim = useCallback(async () => {
    try {
      setState((s) => ({ ...s, step: "claiming" }));
      toast.info("Confirm the claim in your wallet");
      const hash = await writeContractAsync({
        address: PRIVATE_MARKET_ADDRESS,
        abi: privatePredictionMarketAbi,
        functionName: "claimPayout",
        args: [BigInt(marketId)],
      });

      setState((s) => ({
        ...s,
        step: "claimed",
        claimTxHash: hash as `0x${string}`,
      }));

      toast.success("Payout claimed!", {
        action: hash
          ? {
              label: "View on Etherscan",
              onClick: () =>
                window.open(`${EXPLORER_URL}/tx/${hash}`, "_blank"),
            }
          : undefined,
      });
    } catch (e) {
      setState((s) => ({ ...s, step: "done" }));
      toast.error(e instanceof Error ? e.message : "Error claiming payout");
    }
  }, [marketId, writeContractAsync]);

  const hasSavedNonce = useCallback(() => {
    return !!localStorage.getItem(STORAGE_KEY(marketId));
  }, [marketId]);

  return {
    state,
    isConfirmingCommit,
    isConfirmingReveal,
    isConfirmingClaim,
    startCommit,
    executeCommit,
    startReveal,
    executeReveal,
    startClaim,
    executeClaim,
    hasSavedNonce,
    contractAddress: PRIVATE_MARKET_ADDRESS,
  };
}
