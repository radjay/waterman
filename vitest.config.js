import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.js"],
    include: ["**/__tests__/**/*.test.{js,jsx}"],
    exclude: ["node_modules/**", ".next/**", ".ds-sync/**", ".design-sync/**"],
  },
});
