import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b0d10",
          soft: "#12151a",
          panel: "#171b22",
          hover: "#1d222b",
        },
        line: "#262c36",
        accent: {
          DEFAULT: "#7c5cff",
          soft: "#9d85ff",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "0.2" },
          "50%": { opacity: "1" },
        },
        fadein: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        blink: "blink 1.2s infinite",
        fadein: "fadein 0.18s ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
