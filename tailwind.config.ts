import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211d",
        paper: "#fbfaf6",
        sage: "#6f8f72",
        moss: "#2e6f57",
        clay: "#b65d45",
        sky: "#4b84a1"
      }
    }
  },
  plugins: []
};

export default config;
