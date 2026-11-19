import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["samples.js", "node_modules/", "test-results/", "playwright-report/", "docs/"] },
  js.configs.recommended,
  { files: ["src/**/*.js"], languageOptions: { globals: { ...globals.browser, Tone: "readonly", NL_SAMPLES: "readonly" } } },
  { files: ["test/**/*.js", "*.config.js"], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
];
