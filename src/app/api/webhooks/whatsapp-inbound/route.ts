// DEPRECATED — superseded by /api/webhooks/whatsapp. Kept until the sunset
// date in legacy-webhook.ts so events aren't dropped mid-migration.
import { handleLegacyWebhook } from "@/lib/whatsapp/legacy-webhook";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleLegacyWebhook(req, "/api/webhooks/whatsapp-inbound");
}
