import { randomBytes } from "node:crypto";

/** An unguessable webhook token: a readable prefix plus 128 random bits. */
export function webhookToken(prefix: string): string {
  const p = prefix.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || "src";
  return `${p}-${randomBytes(16).toString("hex")}`;
}

/** Tokens that were committed to the repository (seed data) and so are public. */
export const PUBLIC_TOKEN = /-token-uv-20\d\d$/;
