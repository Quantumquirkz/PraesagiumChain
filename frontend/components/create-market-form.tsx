"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import { parseEventLogs } from "viem";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createMarketBackend, getSentiment } from "@/lib/api";
import { predictionMarketContract, EXPLORER_URL } from "@/lib/constants";
import { formatEth } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MARKET_TYPES = [
  { value: "base", label: "Base", description: "Standard binary outcome market" },
  { value: "conditional", label: "Conditional", description: "Depends on another market outcome" },
  { value: "private", label: "Private", description: "Restricted to invited participants" },
] as const;

const QUESTION_TEMPLATES = [
  { label: "Will ETH exceed $4,000 by Dec 31, 2025?", value: "Will ETH exceed $4,000 by December 31, 2025?" },
  { label: "Will BTC reach $100,000 by Dec 31, 2025?", value: "Will BTC reach $100,000 by December 31, 2025?" },
  { label: "Custom question", value: "" },
] as const;

const createMarketSchema = z
  .object({
    question: z.string().min(10, "At least 10 characters").max(500, "Max 500 characters"),
    closeTime: z.string().min(1, "Required"),
    resolveTime: z.string().min(1, "Required"),
    marketType: z.enum(["base", "conditional", "private"]),
  })
  .refine(
    (data) => {
      const close = new Date(data.closeTime);
      return close.getTime() > Date.now();
    },
    { message: "Close time must be in the future", path: ["closeTime"] }
  )
  .refine(
    (data) => {
      const close = new Date(data.closeTime);
      const resolve = new Date(data.resolveTime);
      return resolve.getTime() > close.getTime();
    },
    { message: "Resolve time must be after close time", path: ["resolveTime"] }
  );

type CreateMarketFormValues = z.infer<typeof createMarketSchema>;

const EXPECTED_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID
  ? Number(process.env.NEXT_PUBLIC_CHAIN_ID)
  : 11155111;

export function CreateMarketForm() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: writePending } = useWriteContract();

  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [sentimentPreview, setSentimentPreview] = useState<number | null>(null);

  const form = useForm<CreateMarketFormValues>({
    resolver: zodResolver(createMarketSchema),
    defaultValues: {
      question: "",
      closeTime: "",
      resolveTime: "",
      marketType: "base",
    },
  });

  const question = form.watch("question");
  const closeTimeStr = form.watch("closeTime");
  const resolveTimeStr = form.watch("resolveTime");

  const closeTime = closeTimeStr ? new Date(closeTimeStr) : null;
  const resolveTime = resolveTimeStr ? new Date(resolveTimeStr) : null;
  const now = Date.now();
  const daysUntilClose =
    closeTime && closeTime.getTime() > now
      ? Math.ceil((closeTime.getTime() - now) / (24 * 60 * 60 * 1000))
      : null;
  const daysResolveAfterClose =
    closeTime && resolveTime && resolveTime.getTime() > closeTime.getTime()
      ? Math.ceil((resolveTime.getTime() - closeTime.getTime()) / (24 * 60 * 60 * 1000))
      : null;

  useEffect(() => {
    if (!question || !closeTimeStr || !resolveTimeStr) {
      setGasEstimate(null);
      return;
    }
    const now = Date.now();
    const close = new Date(closeTimeStr);
    const resolve = new Date(resolveTimeStr);
    if (close.getTime() <= now || resolve.getTime() <= close.getTime()) {
      setGasEstimate(null);
      return;
    }
    if (!publicClient) {
      setGasEstimate(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const gas = await publicClient.estimateContractGas({
          ...predictionMarketContract,
          functionName: "createMarket",
          args: [question, BigInt(Math.floor(close.getTime() / 1000)), BigInt(Math.floor(resolve.getTime() / 1000))],
          account: address ?? "0x0000000000000000000000000000000000000000",
        });
        if (cancelled) return;
        const gasPrice = await publicClient.getGasPrice();
        const costWei = gas * gasPrice;
        setGasEstimate(`~${formatEth(costWei)}`);
      } catch {
        if (!cancelled) setGasEstimate(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [question, closeTimeStr, resolveTimeStr, publicClient, address]);

  const handleTemplate = useCallback(
    (value: string) => {
      form.setValue("question", value, { shouldValidate: true });
    },
    [form]
  );

  const runSentimentPreview = useCallback(async () => {
    const q = form.getValues("question").trim();
    if (q.length < 10) {
      toast.error("Enter at least 10 characters for a preview");
      return;
    }
    setSentimentLoading(true);
    setSentimentPreview(null);
    try {
      const res = await getSentiment(q);
      setSentimentPreview(res.probability);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sentiment failed");
    } finally {
      setSentimentLoading(false);
    }
  }, [form]);

  const onSubmit = form.handleSubmit(async (data) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }
    if (chainId !== EXPECTED_CHAIN_ID) {
      toast.error("Wrong network. Switch to Sepolia.");
      return;
    }
    const closeUnix = Math.floor(new Date(data.closeTime).getTime() / 1000);
    const resolveUnix = Math.floor(new Date(data.resolveTime).getTime() / 1000);
    try {
      toast.info("Confirm in wallet...");
      const hash = await writeContractAsync({
        ...predictionMarketContract,
        functionName: "createMarket",
        args: [data.question, BigInt(closeUnix), BigInt(resolveUnix)],
      });
      toast.loading("Waiting for confirmation...", { id: "create-market" });
      if (!publicClient || !hash) {
        toast.success("Market created!", { id: "create-market" });
        toast.success(`Tx: ${hash}`, {
          action: hash ? { label: "View on Etherscan", onClick: () => window.open(`${EXPLORER_URL}/tx/${hash}`, "_blank") } : undefined,
        });
        router.push("/");
        return;
      }
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const logs = parseEventLogs({ abi: predictionMarketContract.abi, logs: receipt.logs });
      const created = logs.find((e) => e.eventName === "MarketCreated");
      const newId = created?.args?.marketId != null ? Number(created.args.marketId) : null;
      toast.success("Market created!", { id: "create-market" });
      toast.success(`Tx: ${hash}`, {
        action: { label: "View on Etherscan", onClick: () => window.open(`${EXPLORER_URL}/tx/${hash}`, "_blank") },
      });
      try {
        await createMarketBackend({
          question: data.question,
          close_time: closeUnix,
          resolve_time: resolveUnix,
          market_type: data.marketType,
        });
      } catch {
        // non-blocking
      }
      if (newId != null) {
        router.push(`/markets/${newId}`);
      } else {
        router.push("/");
      }
    } catch (e) {
      toast.dismiss("create-market");
      const msg = e instanceof Error ? e.message : "Transaction failed";
      toast.error(msg);
    }
  });

  const isWrongNetwork = chainId !== undefined && chainId !== EXPECTED_CHAIN_ID;

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-[640px] space-y-6">
      {!isConnected && (
        <Card className="card-bg border-amber-500/40">
          <CardContent className="pt-6">
            <p className="font-display font-medium text-amber-600 dark:text-amber-400">
              Please connect your wallet to create a market.
            </p>
          </CardContent>
        </Card>
      )}

      {isConnected && isWrongNetwork && (
        <Card className="card-bg border-destructive/40">
          <CardContent className="pt-6">
            <p className="font-display font-medium text-destructive">
              Wrong network. Switch to Sepolia to create a market.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="card-bg border-border">
        <CardHeader>
          <CardTitle className="font-display">Market Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {QUESTION_TEMPLATES.map((t) => (
              <Button
                key={t.label}
                type="button"
                variant="outline"
                size="sm"
                className="font-display"
                onClick={() => handleTemplate(t.value)}
                aria-label={t.label}
              >
                {t.label}
              </Button>
            ))}
          </div>
          <div>
            <Textarea
              placeholder="Enter your prediction question (10–500 characters)"
              className="font-mono min-h-[120px] resize-y"
              maxLength={500}
              {...form.register("question")}
              aria-invalid={!!form.formState.errors.question}
            />
            <div className="mt-1 flex justify-between font-mono text-xs text-muted-foreground">
              <span>{form.formState.errors.question?.message}</span>
              <span>{question.length}/500</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="font-display"
              onClick={runSentimentPreview}
              disabled={sentimentLoading || question.length < 10}
              aria-label="Preview AI sentiment"
            >
              {sentimentLoading ? "Analyzing…" : "Preview AI Sentiment"}
            </Button>
            {sentimentPreview != null && (
              <span className="font-mono text-sm text-primary">
                Probability: {Math.round(sentimentPreview * 100)}%
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="card-bg border-border">
        <CardHeader>
          <CardTitle className="font-display">Close & Resolve Times</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="closeTime" className="mb-1 block font-mono text-sm">
              Close time
            </label>
            <Input
              id="closeTime"
              type="datetime-local"
              className="font-mono"
              {...form.register("closeTime")}
              aria-invalid={!!form.formState.errors.closeTime}
            />
            {form.formState.errors.closeTime && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.closeTime.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="resolveTime" className="mb-1 block font-mono text-sm">
              Resolve time
            </label>
            <Input
              id="resolveTime"
              type="datetime-local"
              className="font-mono"
              {...form.register("resolveTime")}
              aria-invalid={!!form.formState.errors.resolveTime}
            />
            {form.formState.errors.resolveTime && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.resolveTime.message}</p>
            )}
          </div>
          {daysUntilClose != null && daysResolveAfterClose != null && (
            <p className="font-mono text-sm text-muted-foreground">
              Market closes in <strong>{daysUntilClose}</strong> days, resolves{" "}
              <strong>{daysResolveAfterClose}</strong> days after close.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="card-bg border-border">
        <CardHeader>
          <CardTitle className="font-display">Market Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={form.watch("marketType")}
            onValueChange={(v: string) => form.setValue("marketType", v as CreateMarketFormValues["marketType"])}
          >
            <SelectTrigger className="font-mono" aria-label="Market type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MARKET_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {MARKET_TYPES.find((t) => t.value === form.watch("marketType"))?.description}
          </p>
        </CardContent>
      </Card>

      {gasEstimate && (
        <p className="font-mono text-sm text-muted-foreground">
          Est. gas: {gasEstimate}
        </p>
      )}

      <Button
        type="submit"
        disabled={!isConnected || isWrongNetwork || writePending}
        className="w-full font-display bg-primary text-primary-foreground"
        aria-label="Create market"
      >
        {writePending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Waiting for confirmation...
          </>
        ) : (
          "Create Market"
        )}
      </Button>
    </form>
  );
}
