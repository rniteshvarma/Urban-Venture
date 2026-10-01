/**
 * WhatsApp-only customers have no email, but User.email is required and
 * unique. They get an internal placeholder on a reserved TLD (.invalid never
 * resolves), and every email path skips placeholders.
 */
const DOMAIN = "whatsapp.propertytiger.invalid";

export function placeholderEmail(phoneE164: string): string {
  return `wa${phoneE164.replace(/\D/g, "")}@${DOMAIN}`;
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${DOMAIN}`);
}
