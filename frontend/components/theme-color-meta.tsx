"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

const THEME_COLORS = {
  dark: "#00D4FF",
  light: "#0099BB",
} as const;

/**
 * Updates the meta theme-color so the browser chrome matches the current theme.
 * Renders nothing.
 */
export function ThemeColorMeta() {
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    const resolved = resolvedTheme ?? theme ?? "dark";
    const color = THEME_COLORS[resolved as keyof typeof THEME_COLORS] ?? THEME_COLORS.dark;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;
  }, [theme, resolvedTheme]);

  return null;
}
