import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["__tests__/unit/**/*.test.js"],
          environment: "node",
        },
      },
      {
        test: {
          name: "integration",
          include: ["__tests__/integration/**/*.test.js"],
          environment: "node",
          globalSetup: ["__tests__/integration/global-setup.js"],
          setupFiles: ["__tests__/integration/setup.js"],
          // All files share one test database: run them one at a time.
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
