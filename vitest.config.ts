import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // App Router server modules import server-only; stub for unit tests.
      "server-only": path.resolve(__dirname, "./src/test-stubs/server-only.ts"),
    },
  },
});
