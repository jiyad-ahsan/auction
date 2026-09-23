import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  test: {
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    // Picks up TEST_DATABASE_URL from .env.local if present.
    env: loadEnv("test", process.cwd(), ""),
  },
});
