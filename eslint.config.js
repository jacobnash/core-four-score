// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const globals = require("globals");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Root-level and scripts/ ops tooling: plain CommonJS Node scripts, not part of the Expo app.
    files: ["*.js", "scripts/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
  },
  {
    // Plain-JS test files and Jest setup don't get @types/jest globals the way .ts files do.
    files: ["**/__tests__/**/*.js", "**/*.test.js", "jest.setup.js"],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
  },
  {
    // Tests re-require modules after jest.resetModules()/jest.mock() to get fresh module state per test —
    // a static import would be hoisted and miss the per-test mock.
    files: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);
