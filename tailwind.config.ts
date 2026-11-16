import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          DEFAULT: "#10B981",
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
        },
        navy: {
          DEFAULT: "#0F2933",
          50: "#F0F6F8",
          100: "#D9E8ED",
          200: "#B3D1DB",
          300: "#80B2C3",
          400: "#4D93AB",
          500: "#266D85",
          600: "#194E61",
          700: "#133B49",
          800: "#0F2933",
          900: "#091A21",
        },
        surface: {
          bg: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E2E8F0",
          muted: "#64748B",
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(15, 41, 51, 0.05)",
        card: "0 1px 3px 0 rgba(15, 41, 51, 0.06), 0 1px 2px -1px rgba(15, 41, 51, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
