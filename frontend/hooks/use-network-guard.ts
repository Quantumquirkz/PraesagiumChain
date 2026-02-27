import { useAccount, useChainId, useSwitchChain } from "wagmi";

const REQUIRED_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID
  ? Number(process.env.NEXT_PUBLIC_CHAIN_ID)
  : 11155111; // Sepolia

/** Cambia de red manualmente vía window.ethereum como fallback */
async function switchManually(): Promise<void> {
  const ethereum = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
  if (!ethereum) return;
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xaa36a7" }], // 11155111 en hex
    });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
      // La red no está añadida — la añadimos
      await ethereum.request({
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

export function useNetworkGuard() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  const isWrongNetwork = isConnected && chainId !== REQUIRED_CHAIN_ID;

  const switchToRequired = async () => {
    try {
      switchChain({ chainId: REQUIRED_CHAIN_ID as Parameters<typeof switchChain>[0]["chainId"] });
    } catch {
      // Fallback manual si useSwitchChain falla
      await switchManually();
    }
  };

  return {
    isWrongNetwork,
    switchToRequired,
    isSwitching: isPending,
    requiredChainId: REQUIRED_CHAIN_ID,
  };
}
