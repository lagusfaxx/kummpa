import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
    "../../packages/config/src/**/*.{js,ts}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e8fcf6",
          100: "#c6f6e8",
          500: "#00C896",
          600: "#00B387",
          700: "#008F6B"
        },
        accent: {
          50: "#fff5e8",
          100: "#ffe4bf",
          500: "#FF9F1C",
          600: "#F28C00",
          700: "#CC6F00"
        },
        alert: {
          50: "#fff0f4",
          100: "#ffd2dc",
          500: "#FF4D6D",
          600: "#F23659",
          700: "#C72143"
        }
      },
      fontFamily: {
        body: ["var(--font-body)", "Segoe UI", "sans-serif"],
        display: ["var(--font-display)", "Segoe UI", "sans-serif"]
      },
      boxShadow: {
        soft: "0 8px 24px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
