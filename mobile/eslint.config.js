// Minimal flat ESLint config (ESLint 9). Expanded in Phase 13 hardening.
const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: ["node_modules/**", ".expo/**", "dist/**"],
  },
];
