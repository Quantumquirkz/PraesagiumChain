// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useState, useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";

const REQUIRED_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID
  ? Number(process.env.NEXT_PUBLIC_CHAIN_ID)
  : 11155111; // Sepolia

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
};

function getEthereum(): EthereumProvider | undefined {
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum;
}

/** Lee el chainId real desde window.ethereum (no desde wagmi config) */
async function readWalletChainId(): Promise<number | null> {
  const eth = getEthereum();
  if (!eth) return null;
  try {
    const hex = await eth.request({ method: "eth_chainId" }) as string;
    return parseInt(hex, 16);
  } catch {
    return null;
  }
}

async function switchManually(): Promise<void> {
  const eth = getEthereum();
  if (!eth) return;
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xaa36a7" }], // 11155111 en hex
    });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
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

export function useNetworkGuard() {
  const { isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const [walletChainId, setWalletChainId] = useState<number | null>(null);

  useEffect(() => {
    if (!isConnected) {
      setWalletChainId(null);
      return;
    }

    readWalletChainId().then(setWalletChainId);

    const eth = getEthereum();
    if (!eth) return;

    const handleChainChanged = (chainHex: unknown) => {
      setWalletChainId(parseInt(chainHex as string, 16));
    };

    eth.on("chainChanged", handleChainChanged);
    return () => eth.removeListener("chainChanged", handleChainChanged);
  }, [isConnected]);

  const isWrongNetwork = isConnected && walletChainId !== null && walletChainId !== REQUIRED_CHAIN_ID;

  const switchToRequired = async () => {
    try {
      switchChain({ chainId: REQUIRED_CHAIN_ID as Parameters<typeof switchChain>[0]["chainId"] });
    } catch {
      await switchManually();
    }
  };

  return {
    isWrongNetwork,
    switchToRequired,
    isSwitching: isPending,
    requiredChainId: REQUIRED_CHAIN_ID,
    walletChainId,
  };
}
