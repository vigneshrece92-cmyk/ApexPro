import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#0B0E14",
          card: "#121722",
          border: "#1E2638",
          hover: "#1A2234",
          text: "#E2E8F0",
          muted: "#8A99AD",
        },
        bull: {
          DEFAULT: "#00E676",
          dark: "#00B050",
          glow: "rgba(0, 230, 118, 0.2)",
        },
        bear: {
          DEFAULT: "#FF3B30",
          dark: "#D32F2F",
          glow: "rgba(255, 59, 48, 0.2)",
        },
        gold: {
          DEFAULT: "#FFD700",
          light: "#FFE55C",
          dark: "#C8A100",
        },
        silver: {
          DEFAULT: "#C0C0C0",
          light: "#E5E7EB",
          dark: "#9CA3AF",
        },
        accent: {
          DEFAULT: "#38BDF8",
          purple: "#A855F7",
        }
      },
      fontFamily: {
        mono: ["var(--font-mono)", "JetBrains Mono", "Consolas", "monospace"],
      }
    },
  },
  plugins: [],
};
export default config;
