import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// `base` MUST match the GitHub Pages URL path.
//   - USER site (repo named "<user>.github.io") → served at the root → base '/'
//   - PROJECT site (any other repo name)       → served at "/<repo>/" → base '/<repo>/'
//
// This repo is a project site at https://valkyraycho.github.io/stock-track/,
// so production builds need base '/stock-track/'. In dev we always want '/'.
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === "build" ? "/stock-track/" : "/",
  server: {
    port: 5173,
  },
}));
