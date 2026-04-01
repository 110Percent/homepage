import { defineConfig } from "eslint/config";
import eslintPluginAstro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

export default defineConfig([
    tseslint.configs.recommended,
    ...eslintPluginAstro.configs.recommended,
    {
        files: ["**/*.astro"],
        languageOptions: {
            parser: eslintPluginAstro.parser,
            parserOptions: {
                parser: tseslint.parser,
                extraFileExtensions: [".astro"],
                sourceType: "module",
                ecmaVersion: "latest"
            }
        },
        rules: {
            "@typescript-eslint/no-unused-vars": "off"
        }
    }
]);
