"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useState, useCallback } from "react";
import { keccak256, encodePacked, parseEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toast } from "sonner";
import { EXPLORER_URL } from "@/lib/constants";

// ABI mínimo para PrivatePredictionMarket
const PRIVATE_MARKET_ABI = [
  {
    name: "commitBet",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "commitment", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "revealBet",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint8" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

const PRIVATE_MARKET_ADDRESS = (process.env
  .NEXT_PUBLIC_PRIVATE_MARKET_ADDRESS ??
  process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

const STORAGE_KEY = (marketId: number) => `praesagium_nonce_${marketId}`;

export type CommitRevealStep = "idle" | "commit" | "committing" | "committed" | "reveal" | "revealing" | "done";

export interface CommitRevealState {
  step: CommitRevealStep;
  commitment: `0x${string}` | null;
  nonce: `0x${string}` | null;
  commitTxHash: `0x${string}` | null;
  revealTxHash: `0x${string}` | null;
}

function generateNonce(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}` as `0x${string}`;
}

function computeCommitment(
  outcome: number,
  amountWei: bigint,
  nonce: `0x${string}`
): `0x${string}` {
  return keccak256(
    encodePacked(["uint8", "uint256", "bytes32"], [outcome, amountWei, nonce as `0x${string}`])
  );
}

export function useCommitReveal(marketId: number) {
  const [state, setState] = useState<CommitRevealState>({
    step: "idle",
    commitment: null,
    nonce: null,
    commitTxHash: null,
    revealTxHash: null,
  });

  const { writeContractAsync } = useWriteContract();

  const { isLoading: isConfirmingCommit } = useWaitForTransactionReceipt({
    hash: state.commitTxHash ?? undefined,
  });

  const { isLoading: isConfirmingReveal } = useWaitForTransactionReceipt({
    hash: state.revealTxHash ?? undefined,
  });

  const startCommit = useCallback(() => {
    setState((s) => ({ ...s, step: "commit" }));
  }, []);

  const executeCommit = useCallback(
    async (outcome: number, amountEth: string) => {
      try {
        const nonce = generateNonce();
        const amountWei = parseEther(amountEth);
        const commitment = computeCommitment(outcome, amountWei, nonce);

        setState((s) => ({ ...s, step: "committing", nonce, commitment }));

        // Guardar nonce en localStorage para el reveal posterior
        localStorage.setItem(
          STORAGE_KEY(marketId),
          JSON.stringify({ nonce, outcome, amount: amountEth })
        );

        toast.info("Confirma el commit en tu wallet");
        const hash = await writeContractAsync({
          address: PRIVATE_MARKET_ADDRESS,
          abi: PRIVATE_MARKET_ABI,
          functionName: "commitBet",
          args: [BigInt(marketId), commitment],
          value: amountWei,
        });

        setState((s) => ({
          ...s,
          step: "committed",
          commitTxHash: hash as `0x${string}`,
        }));

        toast.success("Commit enviado", {
          action: hash
            ? {
                label: "Ver en Etherscan",
                onClick: () => window.open(`${EXPLORER_URL}/tx/${hash}`, "_blank"),
              }
            : undefined,
        });
      } catch (e) {
        setState((s) => ({ ...s, step: "commit" }));
        toast.error(e instanceof Error ? e.message : "Error al hacer commit");
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

        if (stored) {
          const parsed = JSON.parse(stored) as { nonce: string; outcome: number; amount: string };
          nonce = (manualNonce ?? parsed.nonce) as `0x${string}`;
          outcome = parsed.outcome;
          amount = parsed.amount;
        } else if (manualNonce) {
          nonce = manualNonce as `0x${string}`;
          outcome = 1;
          amount = "0";
        } else {
          toast.error("No se encontró el nonce guardado. Ingresa el nonce manualmente.");
          return;
        }

        const amountWei = parseEther(amount);

        // Verificar commitment localmente antes de enviar
        const expectedCommitment = computeCommitment(outcome, amountWei, nonce);
        if (state.commitment && expectedCommitment !== state.commitment) {
          toast.error("El nonce no coincide con el commitment original. Verifica el valor.");
          return;
        }

        setState((s) => ({ ...s, step: "revealing" }));

        toast.info("Confirma el reveal en tu wallet");
        const hash = await writeContractAsync({
          address: PRIVATE_MARKET_ADDRESS,
          abi: PRIVATE_MARKET_ABI,
          functionName: "revealBet",
          args: [BigInt(marketId), outcome, amountWei, nonce],
        });

        setState((s) => ({
          ...s,
          step: "done",
          revealTxHash: hash as `0x${string}`,
        }));

        localStorage.removeItem(STORAGE_KEY(marketId));

        toast.success("Reveal enviado", {
          action: hash
            ? {
                label: "Ver en Etherscan",
                onClick: () => window.open(`${EXPLORER_URL}/tx/${hash}`, "_blank"),
              }
            : undefined,
        });
      } catch (e) {
        setState((s) => ({ ...s, step: "reveal" }));
        toast.error(e instanceof Error ? e.message : "Error al hacer reveal");
      }
    },
    [marketId, state.commitment, writeContractAsync]
  );

  const hasSavedNonce = useCallback(() => {
    return !!localStorage.getItem(STORAGE_KEY(marketId));
  }, [marketId]);

  return {
    state,
    isConfirmingCommit,
    isConfirmingReveal,
    startCommit,
    executeCommit,
    startReveal,
    executeReveal,
    hasSavedNonce,
  };
}
