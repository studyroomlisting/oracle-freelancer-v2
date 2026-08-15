import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e7f9f1",
          100: "#c8f2df",
          500: "#1DBF73", // Fiverr-style green — approved direction
          600: "#19A463",
          700: "#128A52",
        },
        deep: {
          DEFAULT: "#0B2E28",
          light: "#0F3A32",
        },
        ink: "#0D0D0D",
        neutral: {
          50: "#F9F9F9",
          100: "#F1F1F2",
          200: "#E4E5E7",
          400: "#9CA3AA",
          600: "#62646A",
          800: "#404145",
          900: "#0D0D0D",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "10px",
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(26,26,24,0.06), 0 1px 8px rgba(26,26,24,0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
