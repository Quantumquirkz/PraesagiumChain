"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evita hydration mismatch: el servidor no conoce el tema del cliente
  useEffect(() => setMounted(true), []);

  // Placeholder con las mismas dimensiones para evitar layout shift
  if (!mounted) {
    return <div className={cn("h-8 w-8", className)} aria-hidden />;
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:border-border-bright hover:text-foreground",
        className
      )}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
