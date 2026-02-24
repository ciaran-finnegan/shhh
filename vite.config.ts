import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => ({
  root: "src/client",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/client"),
    emptyOutDir: true,
    ...(mode === "production" && {
      esbuild: {
        drop: ["console"],
      },
    }),
  },
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
}));
