import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// `base` MUST match the GitHub Pages path. For a project site hosted at
// https://<user>.github.io/stock-track/ this needs to be '/stock-track/'.
// When running `vite dev` locally we want '/' instead, so we key off mode.
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === "build" ? "/stock-track/" : "/",
  server: {
    port: 5173,
  },
}));
