import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // MapLibre's minified worker, copied out of node_modules on predev/prebuild
    // by scripts/copy-maplibre-worker.mjs. Not ours, and not readable anyway.
    "public/maplibre/**",
    // The Azure Functions app is a separate CommonJS Node project with its own
    // dependencies and its own tests (`npm test` in api/). Linting it with the
    // Next config only objects to `require()`, which is correct there.
    "api/**",
  ]),
]);

export default eslintConfig;
