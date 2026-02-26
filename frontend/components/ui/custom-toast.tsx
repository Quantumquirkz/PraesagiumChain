"use client";

import { Toaster as SonnerToaster, toast as sonnerToast, type ExternalToast } from "sonner";

const TOAST_CLASS =
  "!rounded-md !border !border-border !bg-elevated !shadow-lg [&_[data-title]]:font-body [&_[data-title]]:font-semibold [&_[data-title]]:text-[14px] [&_[data-title]]:text-[var(--text-primary)] [&_[data-description]]:text-[12px] [&_[data-description]]:text-[var(--text-secondary)]";
const SUCCESS_CLASS = "!border-l-[3px] !border-l-[var(--green)]";
const ERROR_CLASS = "!border-l-[3px] !border-l-[var(--red)]";
const LOADING_CLASS = "!border-l-[3px] !border-l-[var(--cyan)]";

/** Check icon with stroke animation (0 to full in 300ms) */
function AnimatedCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
      <path d="M4 12l6 6L20 6" strokeDasharray={28} strokeDashoffset={28} style={{ animation: "toast-check-draw 300ms ease-out forwards" }} />
    </svg>
  );
}

/** Error X icon */
function ErrorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/** Cyan spinner for loading */
function LoadingSpinner() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--cyan)"
      strokeWidth="2"
      strokeLinecap="round"
      className="shrink-0 animate-spin"
      aria-hidden
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeDasharray="8 24" strokeDashoffset="0" />
    </svg>
  );
}

export function CustomToaster() {
  return (
    <>
      <style>{`
        @keyframes toast-check-draw {
          to { stroke-dashoffset: 0; }
        }
        [data-sonner-toast][data-type="success"] {
          border-left-width: 3px !important;
          border-left-color: var(--green) !important;
        }
        [data-sonner-toast][data-type="error"] {
          border-left-width: 3px !important;
          border-left-color: var(--red) !important;
        }
        [data-sonner-toast][data-type="loading"] {
          border-left-width: 3px !important;
          border-left-color: var(--cyan) !important;
        }
        [data-sonner-toast] {
          background: var(--bg-elevated) !important;
          border: 1px solid var(--border) !important;
          border-radius: 6px !important;
        }
        [data-sonner-toast] [data-title] {
          font-family: var(--font-body), DM Sans, sans-serif !important;
          font-weight: 600 !important;
          font-size: 14px !important;
          color: var(--text-primary) !important;
        }
        [data-sonner-toast] [data-description] {
          font-size: 12px !important;
          color: var(--text-secondary) !important;
        }
        [data-sonner-toast] a {
          color: var(--cyan) !important;
          font-size: 12px !important;
        }
      `}</style>
      <SonnerToaster
        position="top-right"
        toastOptions={{
          classNames: {
            toast: TOAST_CLASS,
            success: SUCCESS_CLASS,
            error: ERROR_CLASS,
            loading: LOADING_CLASS,
          },
          unstyled: false,
        }}
      />
    </>
  );
}

export interface ToastSuccessOptions extends ExternalToast {
  description?: string;
  txHash?: string;
  explorerUrl?: string;
}

export interface ToastErrorOptions extends ExternalToast {
  description?: string;
}

/** Success toast with optional "View on Etherscan" link */
export function toastSuccess(title: string, options?: ToastSuccessOptions) {
  const { txHash, explorerUrl = "https://etherscan.io/tx/", description, ...rest } = options ?? {};
  const action =
    txHash ?
      {
        label: "View on Etherscan →",
        onClick: () => window.open(`${explorerUrl}${txHash}`, "_blank"),
      }
    : undefined;
  return sonnerToast.success(title, {
    description: description ?? (txHash ? "Transaction confirmed." : undefined),
    action,
    icon: <AnimatedCheck />,
    ...rest,
  });
}

/** Error toast with X icon */
export function toastError(title: string, options?: ToastErrorOptions) {
  return sonnerToast.error(title, {
    ...options,
    icon: <ErrorIcon />,
  });
}

/** Loading toast; persists until replaced with success/error */
export function toastLoading(title: string = "Waiting for confirmation...") {
  return sonnerToast.loading(title, {
    icon: <LoadingSpinner />,
  });
}

/** Re-export sonner toast for custom use (e.g. toast.dismiss(id)) */
export { sonnerToast as toast };
