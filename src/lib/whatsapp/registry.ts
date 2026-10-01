/**
 * Mirror of the templates registered on our WABA, synced from the provider
 * (or from Meta directly when the active BSP has no template API). Used to
 * catch a bad send BEFORE the API call: unknown template, not approved, or
 * the wrong number of parameters.
 */
import prisma from "../prisma";
import { getTemplateSource, getWhatsAppProvider } from "./index";
import type { SendTemplateParams, TemplateStatus } from "./types";
import type { WhatsAppErrorCode } from "./errors";
import { raiseAlert } from "./alerts";

export interface RegistryShape {
  name: string;
  language: string;
  status: string;
  bodyParamCount: number;
  hasHeaderParam: boolean;
  buttonCount: number;
}

export type TemplateCheck = { ok: true } | { ok: false; code: WhatsAppErrorCode; message: string };

/** Pure: does this send fit the registered template? */
export function checkTemplateParams(
  row: RegistryShape,
  p: Pick<SendTemplateParams, "bodyParams" | "headerParams" | "buttonParams">,
): TemplateCheck {
  if (row.status !== "APPROVED") {
    return { ok: false, code: "TEMPLATE_NOT_APPROVED", message: `Template ${row.name} (${row.language}) is ${row.status}` };
  }
  const body = p.bodyParams?.length ?? 0;
  if (body !== row.bodyParamCount) {
    return { ok: false, code: "TEMPLATE_PARAM_MISMATCH", message: `Template ${row.name} takes ${row.bodyParamCount} body parameter(s), got ${body}` };
  }
  if (row.hasHeaderParam !== !!p.headerParams) {
    return {
      ok: false,
      code: "TEMPLATE_PARAM_MISMATCH",
      message: row.hasHeaderParam ? `Template ${row.name} needs a header parameter` : `Template ${row.name} has no header parameter`,
    };
  }
  const buttons = p.buttonParams?.length ?? 0;
  if (buttons !== row.buttonCount) {
    return { ok: false, code: "TEMPLATE_PARAM_MISMATCH", message: `Template ${row.name} takes ${row.buttonCount} button parameter(s), got ${buttons}` };
  }
  return { ok: true };
}

let warnedUnsynced = false;

export async function validateTemplateSend(p: SendTemplateParams): Promise<TemplateCheck> {
  const row = await prisma.whatsAppTemplateRegistry.findUnique({
    where: { name_language: { name: p.templateName, language: p.languageCode } },
  });
  if (row) return checkTemplateParams(row, p);

  const synced = await prisma.whatsAppTemplateRegistry.count();
  if (synced === 0) {
    // Never synced (e.g. a BSP with no template API and no Meta credentials):
    // nothing to check against, so let the provider be the judge.
    if (!warnedUnsynced) {
      console.warn("[whatsapp:registry] Template registry is empty — sends are not validated before the API call. Run a template sync.");
      warnedUnsynced = true;
    }
    return { ok: true };
  }
  const other = await prisma.whatsAppTemplateRegistry.findFirst({ where: { name: p.templateName }, select: { language: true } });
  return {
    ok: false,
    code: "TEMPLATE_NOT_FOUND",
    message: other
      ? `Template ${p.templateName} exists in "${other.language}", not "${p.languageCode}"`
      : `Template ${p.templateName} is not registered on the WABA`,
  };
}

export interface SyncResult {
  ok: boolean;
  source?: string;
  synced: number;
  removed: number;
  changed: Array<{ name: string; language: string; from: string | null; to: string }>;
  error?: string;
}

/** Pull every template from the WABA into the registry and alert on bad transitions. */
export async function syncTemplates(): Promise<SyncResult> {
  const source = getTemplateSource();
  if (!source) {
    const active = getWhatsAppProvider();
    return {
      ok: false,
      synced: 0,
      removed: 0,
      changed: [],
      error: active.supportsTemplateManagement
        ? `${active.name} is not configured`
        : `${active.name} has no template API — set META_WABA_ID and META_SYSTEM_USER_TOKEN to sync from Meta`,
    };
  }

  const startedAt = new Date();
  let templates;
  try {
    templates = await source.listTemplates();
  } catch (err) {
    return { ok: false, source: source.name, synced: 0, removed: 0, changed: [], error: err instanceof Error ? err.message : String(err) };
  }

  const existing = new Map((await prisma.whatsAppTemplateRegistry.findMany()).map((r) => [`${r.name}|${r.language}`, r]));
  const changed: SyncResult["changed"] = [];

  for (const t of templates) {
    const prev = existing.get(`${t.name}|${t.language}`);
    if (!prev || prev.status !== t.status) changed.push({ name: t.name, language: t.language, from: prev?.status ?? null, to: t.status });
    const data = {
      category: t.category,
      status: t.status,
      bodyParamCount: t.bodyParamCount,
      hasHeaderParam: t.hasHeaderParam,
      headerType: t.headerType ?? null,
      buttonCount: t.buttonCount,
      bodyText: t.bodyText ?? null,
      lastSyncedAt: startedAt,
      syncedFrom: source.name,
      rejectionReason: t.rejectionReason ?? null,
    };
    await prisma.whatsAppTemplateRegistry.upsert({
      where: { name_language: { name: t.name, language: t.language } },
      create: { name: t.name, language: t.language, ...data },
      update: data,
    });
  }

  // Templates that vanished from the WABA can no longer be sent.
  const gone = await prisma.whatsAppTemplateRegistry.updateMany({
    where: { lastSyncedAt: { lt: startedAt }, status: { not: "DISABLED" } },
    data: { status: "DISABLED", rejectionReason: "No longer on the WABA" },
  });

  for (const c of changed) {
    if (c.from && (c.to === "REJECTED" || c.to === "PAUSED" || c.to === "DISABLED")) {
      await onTemplateStatus(c.name, c.language, c.to);
    }
  }

  return { ok: true, source: source.name, synced: templates.length, removed: gone.count, changed };
}

/** A template's status changed (from a sync or a TEMPLATE_STATUS webhook). */
export async function onTemplateStatus(name: string, language: string | undefined, status: TemplateStatus, reason?: string): Promise<void> {
  if (language) {
    await prisma.whatsAppTemplateRegistry.updateMany({
      where: { name, language },
      data: { status, rejectionReason: reason ?? null, lastSyncedAt: new Date() },
    });
  } else {
    await prisma.whatsAppTemplateRegistry.updateMany({ where: { name }, data: { status, rejectionReason: reason ?? null } });
  }

  if (status === "REJECTED" || status === "PAUSED" || status === "DISABLED") {
    const users = await prisma.whatsAppTemplate.findMany({ where: { wabaTemplateName: name, isActive: true }, select: { name: true } });
    const impact = users.length ? ` It powers: ${users.map((u) => u.name).join(", ")} — those sends will fail until it is fixed.` : "";
    await raiseAlert(
      "TEMPLATE_STATUS",
      "CRITICAL",
      `Template "${name}"${language ? ` (${language})` : ""} is now ${status}${reason ? `: ${reason}` : ""}.${impact}`,
      `${name}:${language ?? "*"}:${status}`,
    );
  }
}
