import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../honeyos/companion/react_dist",
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8642",
      "/v1": "http://127.0.0.1:8642",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
  },
});
