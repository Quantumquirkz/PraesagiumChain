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
        background: "#080B12",
        foreground: "#E8EDF5",
        card: { DEFAULT: "#0F1320", foreground: "#E8EDF5" },
        popover: { DEFAULT: "#161B2E", foreground: "#E8EDF5" },
        primary: { DEFAULT: "#00D4FF", foreground: "#080B12" },
        secondary: { DEFAULT: "#8B5CF6", foreground: "#E8EDF5" },
        muted: { DEFAULT: "#161B2E", foreground: "#6B7A99" },
        accent: { DEFAULT: "#161B2E", foreground: "#E8EDF5" },
        destructive: { DEFAULT: "#FF3D5A", foreground: "#E8EDF5" },
        input: "#1E2640",
        ring: "#00D4FF",
        base: "#080B12",
        surface: "#0F1320",
        elevated: "#161B2E",
        border: { DEFAULT: "#1E2640", bright: "#2A3454" },
        cyan: { DEFAULT: "#00D4FF", dim: "rgba(0,212,255,0.12)" },
        violet: { DEFAULT: "#8B5CF6", dim: "rgba(139,92,246,0.12)" },
        green: { DEFAULT: "#00E87A", dim: "rgba(0,232,122,0.12)" },
        red: { DEFAULT: "#FF3D5A", dim: "rgba(255,61,90,0.12)" },
        gold: "#F5A623",
        text: { primary: "#E8EDF5", secondary: "#6B7A99", muted: "#3D4F6B" },
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
