/**
 * The ONLY module allowed to import from ./providers/* (enforced by ESLint).
 * Everything else asks for "the WhatsApp provider" and gets whichever one
 * WHATSAPP_PROVIDER names. Switching providers is an env change + restart.
 */
import { MetaCloudProvider } from "./providers/meta-cloud";
import { AiSensyProvider } from "./providers/aisensy";
import { InteraktProvider } from "./providers/interakt";
import { WatiProvider } from "./providers/wati";
import { withDryRun } from "./dry-run";
import { PROVIDER_NAMES, type ProviderName, type WhatsAppProvider } from "./types";

export * from "./types";

const instances = new Map<ProviderName, WhatsAppProvider>();

function construct(name: ProviderName): WhatsAppProvider {
  switch (name) {
    case "meta-cloud":
      return new MetaCloudProvider();
    case "aisensy":
      return new AiSensyProvider();
    case "interakt":
      return new InteraktProvider();
    case "wati":
      return new WatiProvider();
    default:
      throw new Error(`Unknown WHATSAPP_PROVIDER: ${name as string}`);
  }
}

export function activeProviderName(): ProviderName {
  const raw = (process.env.WHATSAPP_PROVIDER ?? "meta-cloud").trim() as ProviderName;
  if (!PROVIDER_NAMES.includes(raw)) throw new Error(`Unknown WHATSAPP_PROVIDER: ${raw}`);
  return raw;
}

/**
 * A provider by name. Without credentials it comes back wrapped in a dry run:
 * sends are logged and "accepted" but nothing leaves the building (the
 * pre-abstraction mock-mode behaviour, now visible in admin).
 */
export function getProviderByName(name: ProviderName): WhatsAppProvider {
  let p = instances.get(name);
  if (!p) {
    const real = construct(name);
    p = real.isConfigured() ? real : withDryRun(real);
    instances.set(name, p);
  }
  return p;
}

export function getWhatsAppProvider(): WhatsAppProvider {
  return getProviderByName(activeProviderName());
}

/** True when the active provider has no credentials and sends are simulated. */
export function isDryRun(provider: WhatsAppProvider = getWhatsAppProvider()): boolean {
  return !provider.isConfigured();
}

/**
 * Where to read the WABA's templates from. BSPs without a template API
 * (AiSensy, Interakt) fall back to Meta directly when Meta credentials are
 * present — the templates live on the WABA either way.
 */
export function getTemplateSource(): WhatsAppProvider | null {
  const active = getWhatsAppProvider();
  if (active.supportsTemplateManagement && active.isConfigured()) return active;
  const meta = getProviderByName("meta-cloud");
  if (meta.isConfigured() && process.env.META_WABA_ID) return meta;
  return null;
}

/** For tests: forget cached instances so env changes take effect. */
export function resetProviderCache(): void {
  instances.clear();
}
