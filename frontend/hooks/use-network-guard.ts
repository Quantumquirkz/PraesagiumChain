import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { isAllowedChain, DEFAULT_CHAIN_ID } from "@/lib/constants";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
};

function getEthereum(): EthereumProvider | undefined {
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum;
}

/** Fallback: pedir a la wallet que cambie a la red requerida (por si wagmi no tiene la chain). */
async function switchManually(chainId: number): Promise<void> {
  const eth = getEthereum();
  if (!eth) return;
  const hex = `0x${chainId.toString(16)}`;
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hex }],
    });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 4902 && chainId === 11155111) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0xaa36a7",
            chainName: "Sepolia",
            rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.sepolia.org"],
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ],
      });
    }
  }
}

/** Usa el chainId de wagmi (fuente única) y la lista de redes permitidas en constants. */
export function useNetworkGuard() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const isWrongNetwork = isConnected && !isAllowedChain(chainId);

  const switchToRequired = async () => {
    try {
      switchChain?.({ chainId: DEFAULT_CHAIN_ID as 11155111 });
    } catch {
      await switchManually(DEFAULT_CHAIN_ID);
    }
  };

  return {
    isWrongNetwork,
    switchToRequired,
    isSwitching: isPending,
    requiredChainId: DEFAULT_CHAIN_ID,
    walletChainId: chainId ?? null,
  };
}
