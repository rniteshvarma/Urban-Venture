/**
 * The pre-abstraction webhook URLs were WATI's. They stay alive until
 * LEGACY_SUNSET so an un-updated BSP dashboard keeps delivering during a
 * migration. They are served in-process by the WATI adapter rather than
 * redirected: most webhook senders don't follow redirects on POST, which
 * would drop exactly the events this exists to keep.
 */
import { getProviderByName } from "./index";
import { handleWhatsAppWebhook } from "./webhook";

export const LEGACY_SUNSET = new Date("2026-10-28T00:00:00Z");

export async function handleLegacyWebhook(req: Request, path: string): Promise<Response> {
  const headers = { Deprecation: "true", Sunset: LEGACY_SUNSET.toUTCString(), Link: '</api/webhooks/whatsapp>; rel="successor-version"' };
  if (Date.now() > LEGACY_SUNSET.getTime()) {
    return new Response("Gone — use /api/webhooks/whatsapp", { status: 410, headers });
  }
  console.warn(`[whatsapp] Legacy webhook ${path} hit — point the provider at /api/webhooks/whatsapp before ${LEGACY_SUNSET.toISOString().slice(0, 10)}.`);
  const res = await handleWhatsAppWebhook(req, getProviderByName("wati"));
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}
