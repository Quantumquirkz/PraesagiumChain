import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background:  "var(--bg-base)",
        foreground:  "var(--text-primary)",
        card:        { DEFAULT: "var(--bg-surface)",  foreground: "var(--text-primary)" },
        popover:     { DEFAULT: "var(--bg-elevated)", foreground: "var(--text-primary)" },
        primary:     { DEFAULT: "var(--cyan)",        foreground: "var(--bg-base)" },
        secondary:   { DEFAULT: "var(--violet)",      foreground: "var(--text-primary)" },
        muted:       { DEFAULT: "var(--bg-elevated)", foreground: "var(--text-secondary)" },
        accent:      { DEFAULT: "var(--bg-elevated)", foreground: "var(--text-primary)" },
        destructive: { DEFAULT: "var(--red)",         foreground: "var(--text-primary)" },
        input:       "var(--border)",
        ring:        "var(--cyan)",
        base:        "var(--bg-base)",
        surface:     "var(--bg-surface)",
        elevated:    "var(--bg-elevated)",
        border:      { DEFAULT: "var(--border)", bright: "var(--border-bright)" },
        cyan:        { DEFAULT: "var(--cyan)",   dim: "var(--cyan-dim)" },
        violet:      { DEFAULT: "var(--violet)", dim: "var(--violet-dim)" },
        green:       { DEFAULT: "var(--green)",  dim: "var(--green-dim)" },
        red:         { DEFAULT: "var(--red)",    dim: "var(--red-dim)" },
        gold:        "var(--gold)",
        text:        { primary: "var(--text-primary)", secondary: "var(--text-secondary)", muted: "var(--text-muted)" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Barlow Condensed", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
        body: ["var(--font-body)", "DM Sans", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
