/**
 * Tap-to-chat links to the team's WhatsApp number (NEXT_PUBLIC_WHATSAPP_NUMBER,
 * digits with country code, e.g. 919876543210). Everything here returns null
 * when no number is configured, so no button is drawn that leads nowhere.
 */
export function whatsappNumber(raw: string | undefined = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER): string | null {
  const n = (raw ?? "").replace(/\D/g, "");
  return n.length >= 10 ? n : null;
}

export function whatsappLink(text: string, raw: string | undefined = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER): string | null {
  const n = whatsappNumber(raw);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}
