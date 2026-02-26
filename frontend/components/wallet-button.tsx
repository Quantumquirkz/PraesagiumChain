"use client";

import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";
// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { truncateAddress, formatEth } from "@/lib/utils";
import { config } from "@/lib/wagmi";
import { Wallet, LogOut, Loader2 } from "lucide-react";

const EXPECTED_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID
  ? Number(process.env.NEXT_PUBLIC_CHAIN_ID)
  : 11155111;

export function WalletButton() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });
  const { connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-2 font-mono text-sm"
          aria-label="Wallet info"
        >
          <span className="text-muted-foreground">{truncateAddress(address)}</span>
          <span className="text-primary font-medium">
            {balance ? formatEth(balance.value) : "—"}
          </span>
          <span className="text-muted-foreground text-xs">{chain?.name ?? "Unknown"}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => disconnect()}
          aria-label="Disconnect wallet"
          className="text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-body font-semibold"
          aria-label="Connect wallet"
        >
          <Wallet className="h-4 w-4 mr-2" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent showClose={true} className="card-bg border-border">
        <DialogHeader>
          <DialogTitle className="font-display">Connect Wallet</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {config.connectors.map((connector) => (
            <Button
              key={connector.uid}
              variant="outline"
              className="w-full justify-start font-mono"
              onClick={() => {
                connectAsync({ connector }).then(() => setOpen(false));
              }}
              disabled={isPending}
              aria-label={`Connect with ${connector.name}`}
            >
              {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden /> : null}
              {connector.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
