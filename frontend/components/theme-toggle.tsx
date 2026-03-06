"use client";

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
        "inline-flex items-center justify-center gap-1 rounded-md border border-border text-text-secondary transition-colors hover:border-border-bright hover:text-foreground px-2 h-8",
        className
      )}
      aria-label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
      <span className="ml-0.5 hidden sm:inline text-xs font-mono">
        {isDark ? "Claro" : "Oscuro"}
      </span>
    </button>
  );
}
