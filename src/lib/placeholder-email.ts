/**
 * WhatsApp-only customers have no email, but User.email is required and
 * unique. They get an internal placeholder on a reserved TLD (.invalid never
 * resolves), and every email path skips placeholders.
 */
const DOMAIN = "whatsapp.propertytiger.invalid";

export function placeholderEmail(phoneE164: string): string {
  return `wa${phoneE164.replace(/\D/g, "")}@${DOMAIN}`;
}

/** Stand-in addresses older code wrote for leads with no email. Treated as "no email" everywhere. */
const LEGACY_DOMAINS = ["no-email.local", "inbound.uv"];

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  return e.endsWith(`@${DOMAIN}`) || LEGACY_DOMAINS.some((d) => e.endsWith(`@${d}`));
}
