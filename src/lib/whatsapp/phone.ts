/**
 * Phone numbers are stored and passed around as E.164 WITH the leading "+".
 * Adapters reformat for their provider; calling code never does.
 */

/** Normalise anything phone-shaped to E.164 (+91 assumed for bare 10-digit Indian mobiles). */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (trimmed.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

/** Last 10 digits — how legacy rows are matched regardless of formatting. */
export function nationalTail(e164: string): string {
  return e164.replace(/\D/g, "").slice(-10);
}
