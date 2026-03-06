"use client";

import { useState, useCallback } from "react";
import { useConnect, useDisconnect, useAccount, useBalance } from "wagmi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { truncateAddress, formatEth } from "@/lib/utils";
import { Wallet, LogOut, Copy, ExternalLink, ChevronDown, Loader2 } from "lucide-react";
import { toastSuccess } from "@/components/ui/custom-toast";

// ─── Iconos por conector ─────────────────────────────────────────────────────

const CONNECTOR_ICONS: Record<string, string> = {
  metaMask: "🦊",
  injected: "🔶",
  walletConnect: "🔵",
  coinbaseWallet: "🔵",
  safe: "🟢",
};

function getConnectorIcon(id: string): string {
  return CONNECTOR_ICONS[id] ?? "🔌";
}

// ─── Modal de conexión ────────────────────────────────────────────────────────

interface ConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ConnectModal({ open, onOpenChange }: ConnectModalProps) {
  const { connectors, connectAsync, isPending, variables } = useConnect();
  const [connectorErrors, setConnectorErrors] = useState<Record<string, string>>({});

  const handleConnect = useCallback(
    async (connectorId: string) => {
      const connector = connectors.find((c) => c.id === connectorId);
      if (!connector) return;

      setConnectorErrors((prev: Record<string, string>) => ({ ...prev, [connectorId]: "" }));

      try {
        // Enfocar la pestaña para que la wallet no devuelva "La pestaña no está activa"
        if (typeof window !== "undefined") window.focus();

        const result = await connectAsync({ connector });
        const addr = result.accounts?.[0];
        if (addr) {
          toastSuccess(`Connected: ${truncateAddress(addr)}`);
        }
        onOpenChange(false);
      } catch (err: unknown) {
        const e = err as { message?: string; shortMessage?: string; details?: string };
        const msg =
          e?.shortMessage ?? e?.details ?? (err instanceof Error ? err.message : "Connection failed. Try again.");
        const full = String(msg);
        const isTabInactive =
          /resource not available|pestaña no está activa|tab.*not active|Requested resource|ResourceUnavailable/i.test(
            full
          );
        const displayMsg = isTabInactive
          ? "This tab must be active. Click the page, leave the tab in focus, then try again."
          : full;
        setConnectorErrors((prev: Record<string, string>) => ({ ...prev, [connectorId]: displayMsg }));
      }
    },
    [connectors, connectAsync, onOpenChange]
  );

  const pendingConnectorId = isPending
    ? (variables?.connector as { id?: string } | undefined)?.id ?? null
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose className="card-bg border-border max-w-sm">
        <DialogHeader>
          <DialogTitle
            className="font-display text-xl"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
          >
            Connect Wallet
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 mt-1">
          {connectors.map((connector) => {
            const isLoading = pendingConnectorId === connector.id;
            const errorMsg = connectorErrors[connector.id];

            return (
              <div key={connector.uid} className="flex flex-col gap-1">
                <button
                  onClick={() => handleConnect(connector.id)}
                  disabled={isPending}
                  aria-label={`Connect with ${connector.name}`}
                  className="flex items-center gap-3 w-full rounded-lg border border-border bg-transparent px-4 py-3 text-left transition-colors hover:bg-elevated disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-xl leading-none" aria-hidden>
                    {getConnectorIcon(connector.id)}
                  </span>
                  <span className="flex-1 font-body font-medium text-sm text-[var(--text-primary)]">
                    {isLoading ? "Connecting..." : connector.name}
                  </span>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
                  ) : (
                    <span className="text-muted-foreground text-sm" aria-hidden>→</span>
                  )}
                </button>

                {errorMsg && (
                  <p className="text-xs text-red-500 px-1" role="alert">
                    {errorMsg}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t border-border pt-3 text-center">
          <a
            href="https://ethereum.org/en/wallets/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            New to Web3? Learn more →
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dropdown estado conectado ────────────────────────────────────────────────

interface ConnectedDropdownProps {
  address: `0x${string}`;
  balance: { value: bigint } | undefined;
  chainName: string | undefined;
  onDisconnect: () => void;
}

function ConnectedDropdown({
  address,
  balance,
  chainName,
  onDisconnect,
}: ConnectedDropdownProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const explorerBase =
    process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL ?? "https://sepolia.etherscan.io";

  const copyAddress = useCallback(() => {
    navigator.clipboard.writeText(address).then(() => {
      toastSuccess("Address copied");
    });
    setDropdownOpen(false);
  }, [address]);

  const viewOnExplorer = useCallback(() => {
    window.open(`${explorerBase}/address/${address}`, "_blank");
    setDropdownOpen(false);
  }, [explorerBase, address]);

  const handleDisconnect = useCallback(() => {
    onDisconnect();
    setDropdownOpen(false);
  }, [onDisconnect]);

  return (
    <div className="relative flex items-center gap-2">
      {/* Info pill */}
      <button
        onClick={() => setDropdownOpen((v: boolean) => !v)}
        aria-label="Wallet options"
        aria-expanded={dropdownOpen}
        className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-2 font-mono text-sm hover:border-primary/50 transition-colors"
      >
        {/* Hex avatar */}
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-[10px] font-bold text-primary-foreground"
          style={{
            background: `#${address.slice(2, 8)}`,
          }}
          aria-hidden
        >
          {address.slice(2, 4).toUpperCase()}
        </span>
        <span className="text-muted-foreground">{truncateAddress(address)}</span>
        <span className="text-primary font-medium">
          {balance ? formatEth(balance.value) : "—"}
        </span>
        <span className="text-muted-foreground text-xs">{chainName ?? "Unknown"}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden />
      </button>

      {/* Mobile disconnect button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDisconnect}
        aria-label="Disconnect wallet"
        className="sm:hidden text-muted-foreground hover:text-destructive"
      >
        <LogOut className="h-4 w-4" />
      </Button>

      {/* Dropdown menu */}
      {dropdownOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
            aria-hidden
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-border bg-elevated shadow-lg overflow-hidden"
          >
            <button
              role="menuitem"
              onClick={copyAddress}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-muted transition-colors"
            >
              <Copy className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              Copy Address
            </button>
            <button
              role="menuitem"
              onClick={viewOnExplorer}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              View on Etherscan
            </button>
            <div className="border-t border-border" />
            <button
              role="menuitem"
              onClick={handleDisconnect}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-muted transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function WalletButton() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });
  const { disconnect } = useDisconnect();
  const [modalOpen, setModalOpen] = useState(false);

  if (isConnected && address) {
    return (
      <ConnectedDropdown
        address={address}
        balance={balance}
        chainName={chain?.name}
        onDisconnect={disconnect}
      />
    );
  }

  return (
    <>
      <Button
        variant="default"
        onClick={() => setModalOpen(true)}
        className="bg-primary text-primary-foreground hover:bg-primary/90 font-body font-semibold"
        aria-label="Connect wallet"
      >
        <Wallet className="h-4 w-4 mr-2" aria-hidden />
        Connect Wallet
      </Button>

      <ConnectModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
