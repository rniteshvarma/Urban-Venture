/**
 * Dry-run wrapper for a provider with no credentials. Sends succeed with a
 * `dryrun-…` id and are logged with dryRun=true; webhooks and template reads
 * still go to the real adapter (they fail closed / return nothing without
 * credentials). Mirrors the pre-abstraction "mock mode" so local dev keeps working.
 */
import { randomUUID } from "node:crypto";
import type { SendResult, WhatsAppProvider } from "./types";

export function withDryRun(real: WhatsAppProvider): WhatsAppProvider {
  const accept = (what: string, to: string, detail: string): SendResult => {
    console.log(`[whatsapp:dry-run:${real.name}] ${what} → ${to} · ${detail}`);
    return { ok: true, status: "ACCEPTED", providerMessageId: `dryrun-${randomUUID()}`, rawResponse: { dryRun: true }, attempts: 1 };
  };

  return {
    name: real.name,
    supportsTemplateManagement: real.supportsTemplateManagement,
    supportsMediaUpload: false,
    supportsSessionMessages: real.supportsSessionMessages,
    isConfigured: () => false,
    configStatus: () => real.configStatus(),
    sendTemplate: async (p) => accept("template", p.to, `${p.templateName} [${(p.bodyParams ?? []).join(" | ")}]`),
    sendSessionMessage: async (p) =>
      real.supportsSessionMessages
        ? accept("text", p.to, JSON.stringify(p.text.slice(0, 120)))
        : { ok: false, status: "FAILED", errorCode: "UNSUPPORTED_OPERATION", errorMessage: `${real.name} cannot send free-form messages` },
    sendInteractive: real.sendInteractive
      ? async (p) => accept(p.list ? "list" : "buttons", p.to, JSON.stringify(p.body.slice(0, 80)))
      : undefined,
    verifyWebhook: (req, raw) => real.verifyWebhook(req, raw),
    parseWebhook: (payload) => real.parseWebhook(payload),
    handleWebhookChallenge: real.handleWebhookChallenge ? (req) => real.handleWebhookChallenge!(req) : undefined,
    listTemplates: async () => [],
    getTemplate: async () => null,
    healthCheck: async () => ({ ok: false, detail: "Not configured — running as a dry run (nothing is sent)" }),
  };
}
