"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pc_pwa_banner_dismissed";
const SHOW_DELAY_MS = 30_000;

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // No mostrar si ya está instalado como PWA (modo standalone)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as { standalone?: boolean }).standalone === true);
    if (isStandalone) return;

    // No mostrar si el usuario ya lo descartó
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Mostrar el banner con delay de 30s una vez que el prompt está disponible
  useEffect(() => {
    if (!deferredPrompt) return;

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(DISMISSED_KEY, "1");
    }
    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md
                 rounded-xl border border-border bg-surface shadow-lg shadow-black/40
                 px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      {/* Icono */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--cyan)]/10 flex items-center justify-center">
        <Download className="w-5 h-5 text-[var(--cyan)]" />
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-text leading-tight">
          Install PraesagiumChain
        </p>
        <p className="text-[11px] text-text-muted leading-tight mt-0.5">
          Faster access and push notifications for market resolutions
        </p>
      </div>

      {/* Botones */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleInstall}
          className="rounded-md bg-[var(--cyan)] px-3 py-1.5 text-[12px] font-bold text-black
                     hover:bg-[var(--cyan)]/80 transition-colors"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install banner"
          className="rounded-md p-1.5 text-text-muted hover:text-text hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
