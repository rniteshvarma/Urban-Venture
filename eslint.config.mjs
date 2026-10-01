import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // WhatsApp provider isolation: only src/lib/whatsapp/index.ts may import an
  // adapter. Everything else goes through getWhatsAppProvider(), so switching
  // providers stays an env change and provider coupling can't creep back in.
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    ignores: ["src/lib/whatsapp/index.ts", "src/lib/whatsapp/providers/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/whatsapp/providers", "**/whatsapp/providers/**"],
              message: "Import WhatsApp providers only via @/lib/whatsapp (getWhatsAppProvider). See src/lib/whatsapp/index.ts.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/whatsapp/*.{ts,tsx}"],
    ignores: ["src/lib/whatsapp/index.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["./providers", "./providers/**"],
              message: "Only src/lib/whatsapp/index.ts may import from ./providers — use getWhatsAppProvider().",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
