/**
 * Pre-flight for a provider switch: confirms every WABA template our code
 * sends exists on the WABA, is APPROVED, and takes the parameters we pass.
 *
 *   npm run whatsapp:verify-templates -- --provider=aisensy
 *
 * Reads templates through the named provider, or through Meta directly when
 * that provider has no template API (the templates live on the WABA either
 * way). Exits 1 if anything our code sends would fail. Read-only.
 */
import prisma from "../../src/lib/prisma";
import { activeProviderName, getProviderByName, PROVIDER_NAMES, type ProviderName, type TemplateDefinition } from "../../src/lib/whatsapp";

type Need = { name: string; language: string; bodyParams: number; buttons?: number; usedBy: string };

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.split("=")[1];
}

async function main() {
  const providerName = (arg("provider") ?? activeProviderName()) as ProviderName;
  if (!PROVIDER_NAMES.includes(providerName)) {
    console.error(`Unknown provider "${providerName}". Use one of: ${PROVIDER_NAMES.join(", ")}`);
    process.exit(2);
  }

  const provider = getProviderByName(providerName);
  const meta = getProviderByName("meta-cloud");
  const source =
    provider.supportsTemplateManagement && provider.isConfigured() ? provider : meta.isConfigured() && process.env.META_WABA_ID ? meta : null;
  if (!provider.isConfigured()) console.warn(`! ${providerName} has no credentials set in this environment — sends would be a dry run.`);
  if (!source) {
    console.error(
      `✗ Cannot read templates: ${providerName} ${provider.supportsTemplateManagement ? "is not configured" : "has no template API"} and Meta credentials (META_WABA_ID, META_PHONE_NUMBER_ID, META_SYSTEM_USER_TOKEN) are not set.`,
    );
    process.exit(1);
  }
  console.log(`Reading WABA templates via ${source.name}${source !== provider ? ` (on behalf of ${providerName})` : ""}…`);

  const templates: TemplateDefinition[] = await source.listTemplates();
  const byKey = new Map(templates.map((t) => [`${t.name}|${t.language}`, t]));

  const needs: Need[] = [];
  const crm = await prisma.whatsAppTemplate.findMany({ where: { isActive: true, wabaTemplateName: { not: null } } });
  for (const t of crm) needs.push({ name: t.wabaTemplateName!, language: t.wabaLanguage, bodyParams: t.wabaParamTags.length, usedBy: `CRM template "${t.name}"` });
  needs.push({ name: process.env.WA_OTP_TEMPLATE || "signup_otp_v1", language: process.env.WA_OTP_LANGUAGE || "en", bodyParams: 1, buttons: 1, usedBy: "phone OTP" });
  for (const spec of (process.env.WA_REQUIRED_TEMPLATES ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const [name, language = "en", params] = spec.split(":");
    needs.push({ name, language, bodyParams: params ? Number(params) : -1, usedBy: "WA_REQUIRED_TEMPLATES" });
  }

  let problems = 0;
  for (const n of needs) {
    const t = byKey.get(`${n.name}|${n.language}`);
    let verdict = "✓ APPROVED";
    if (!t) verdict = templates.some((x) => x.name === n.name) ? `✗ not in language "${n.language}"` : "✗ not on the WABA";
    else if (t.status !== "APPROVED") verdict = `✗ ${t.status}${t.rejectionReason ? ` (${t.rejectionReason})` : ""}`;
    else if (n.bodyParams >= 0 && t.bodyParamCount !== n.bodyParams) verdict = `✗ takes ${t.bodyParamCount} body param(s), we send ${n.bodyParams}`;
    else if (n.buttons !== undefined && t.buttonCount !== n.buttons) verdict = `✗ takes ${t.buttonCount} button param(s), we send ${n.buttons}`;
    if (verdict.startsWith("✗")) problems++;
    console.log(`${verdict.padEnd(44)} ${`${n.name} (${n.language})`.padEnd(36)} ← ${n.usedBy}`);
  }

  console.log(`\n${templates.length} template(s) on the WABA · ${needs.length} required · ${problems} problem(s)`);
  await prisma.$disconnect();
  process.exit(problems ? 1 : 0);
}

main().catch(async (err) => {
  console.error("✗", err instanceof Error ? err.message : err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
