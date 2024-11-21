// @ts-check

import { configs as eslintConfigs } from "@eslint/js";
import { configs as tsEslintConfigs } from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: ["**/node_modules/**", "**/dist/**"],
  },
  eslintConfigs.recommended,
  tsEslintConfigs.recommended,
  {
    rules: {
      // Disable the base rule and enable the TypeScript-specific one
      "no-unused-expressions": "off",
      "@typescript-eslint/no-unused-expressions": [
        "error",
        {
          allowShortCircuit: true,
          allowTernary: true,
        },
      ],

      // Other rules
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-empty": "warn",
      "no-prototype-builtins": "warn",
      "@typescript-eslint/no-explicit-any": "warn", // Changed from 'error' to 'warn'
      "no-case-declarations": "warn", // Changed from 'error' to 'warn'
      "require-yield": "warn", // Changed from 'error' to 'warn'
      "no-useless-catch": "warn", // Changed from 'error' to 'warn'
    },
  },
];