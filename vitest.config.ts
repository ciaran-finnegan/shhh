import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  test: {
    projects: [
      {
        test: {
          name: "client",
          include: ["test/client/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["test/client/setup.ts"],
        },
        resolve: {
          alias: {
            "@shared": path.resolve(__dirname, "src/shared"),
          },
        },
      },
      {
        test: {
          name: "worker",
          include: ["test/worker/**/*.test.ts"],
          environment: "node",
        },
        resolve: {
          alias: {
            "@shared": path.resolve(__dirname, "src/shared"),
          },
        },
      },
      {
        test: {
          name: "e2e",
          include: ["test/e2e/**/*.test.ts"],
          environment: "node",
        },
        resolve: {
          alias: {
            "@shared": path.resolve(__dirname, "src/shared"),
          },
        },
      },
    ],
  },
});
