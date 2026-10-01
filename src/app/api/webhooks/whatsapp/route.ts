// POST /api/webhooks/whatsapp — inbound events from whichever provider is active
// GET  /api/webhooks/whatsapp — Meta's hub.mode=subscribe verification challenge
//
// Verify (raw body) → normalise → persist → 200. Processing runs after the
// response so the provider gets its ACK in milliseconds.
import { handleWhatsAppChallenge, handleWhatsAppWebhook } from "@/lib/whatsapp/webhook";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  return handleWhatsAppWebhook(req);
}

export async function GET(req: Request) {
  return handleWhatsAppChallenge(req);
}
