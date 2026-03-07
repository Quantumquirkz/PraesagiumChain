"use client";

import { cn } from "@/lib/utils";

export type LogoSize = "header" | "footer";

const SIZE_MAP: Record<LogoSize, number> = {
  header: 28,
  footer: 22,
};

export interface LogoProps {
  className?: string;
  size?: LogoSize | number;
  "aria-hidden"?: boolean;
}

export function Logo({ className, size = "header", "aria-hidden": ariaHidden = true }: LogoProps) {
  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size];
  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden={ariaHidden}
    >
      {/* Hexagon */}
      <path
        d="M14 2L24 8V20L14 26L4 20V8L14 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Circles */}
      <circle cx="10" cy="14" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <circle cx="14" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <circle cx="18" cy="14" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <circle cx="14" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      {/* Links */}
      <path
        d="M12.5 12.5L15.5 9.5M15.5 15.5L12.5 18.5M9.5 15.5L12.5 12.5M18.5 12.5L15.5 15.5"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}
