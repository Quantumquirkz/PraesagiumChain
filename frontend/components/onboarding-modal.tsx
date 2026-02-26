"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ONBOARDED_KEY = "pc_onboarded";

const STEPS = [
  { emoji: "🔗", title: "Connect your wallet", description: "Link MetaMask or another Web3 wallet to get started." },
  { emoji: "📊", title: "Browse prediction markets", description: "Explore questions and odds on real-world events." },
  { emoji: "💰", title: "Place your bet (Yes or No)", description: "Stake ETH on the outcome you believe in." },
  { emoji: "🎉", title: "Claim your winnings", description: "When the market resolves, claim your payout if you won." },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = window.localStorage.getItem(ONBOARDED_KEY);
    if (!done) setOpen(true);
  }, []);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((s: number) => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDED_KEY, "true");
    }
    setOpen(false);
    setStep(0);
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setStep(0);
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-[500px] border-0 bg-surface p-0 overflow-hidden card-gradient-border rounded-lg"
        overlayClassName="backdrop-blur-sm bg-[#000000A0]"
        showClose={false}
        aria-describedby="onboarding-description"
        aria-labelledby="onboarding-title"
      >
        <div className="absolute right-4 top-4 z-10">
          <DialogClose asChild>
            <button
              type="button"
              onClick={handleSkip}
              className="text-[13px] text-text-muted hover:text-foreground transition-colors font-body"
              aria-label="Skip onboarding"
            >
              Skip
            </button>
          </DialogClose>
        </div>

        <div id="onboarding-description" className="px-6 pt-10 pb-6">
          <div className="flex flex-col items-center text-center">
            <span className="text-[48px] leading-none mb-4" aria-hidden>
              {current.emoji}
            </span>
            <h2
              id="onboarding-title"
              className="font-display font-bold text-[18px] text-foreground mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {current.title}
            </h2>
            <p className="text-[13px] text-text-secondary font-body max-w-[360px]">
              {current.description}
            </p>
          </div>

          {/* Stepper */}
          <div className="flex justify-center gap-2 mt-6" role="tablist" aria-label="Onboarding steps">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Step ${i + 1}`}
                aria-current={step === i ? "step" : undefined}
                className={cn(
                  "h-2 rounded-full transition-all duration-200",
                  step === i ? "w-6 bg-cyan" : "w-2 bg-border"
                )}
              />
            ))}
          </div>
        </div>

        <div className="px-6 pb-6 flex justify-end">
          <Button
            onClick={isLast ? handleFinish : handleNext}
            className="font-body"
            aria-label={isLast ? "Let's go" : "Next step"}
          >
            {isLast ? "Let's go! →" : "Next →"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
