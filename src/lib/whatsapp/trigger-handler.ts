import prisma from "../prisma";
import { resolveMergeTags, resolveTemplateParams } from "./merge-tags";
import { WATrigger } from "@prisma/client";
import { sendTemplateMessage, sendTextMessage, type SendOutcome } from "./send";

type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
const asCategory = (c: string): TemplateCategory => (c === "MARKETING" || c === "AUTHENTICATION" ? c : "UTILITY");

/**
 * Send a CRM template (or a custom message) to a lead through the active
 * WhatsApp provider. Templates linked to an approved WABA template go out as
 * that template; otherwise the resolved text is sent as a session message.
 */
export async function fireWhatsAppTrigger(
  leadId: string,
  triggerType: WATrigger,
  customMessage?: string,
  opts: { templateId?: string } = {}
): Promise<{ success: boolean; logId?: string; error?: string; outcome?: SendOutcome }> {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { success: false, error: "Lead not found" };
    if (lead.whatsappOptOut) return { success: false, error: "Lead has opted out of WhatsApp" };

    const template = customMessage
      ? null
      : opts.templateId
        ? await prisma.whatsAppTemplate.findUnique({ where: { id: opts.templateId } })
        : await prisma.whatsAppTemplate.findFirst({ where: { trigger: triggerType, isActive: true } });

    if (!template && !customMessage) {
      console.log(`[WhatsApp Trigger] No active template found for trigger: ${triggerType}`);
      return { success: false, error: `No active template for trigger: ${triggerType}` };
    }

    const ctx = {
      feature: "pipeline_trigger" as const,
      leadId,
      templateId: template?.id ?? null,
      metadata: { leadId, trigger: triggerType },
    };

    let outcome: SendOutcome;
    if (template?.wabaTemplateName) {
      const bodyParams = await resolveTemplateParams(template.wabaParamTags, leadId);
      outcome = await sendTemplateMessage({
        ...ctx,
        to: lead.phone,
        templateName: template.wabaTemplateName,
        languageCode: template.wabaLanguage,
        bodyParams,
        category: asCategory(template.category),
        contextId: `lead:${leadId}:${triggerType}:${template.id}`,
        previewText: await resolveMergeTags(template.message, leadId),
      });
    } else {
      const text = await resolveMergeTags(customMessage || template!.message, leadId);
      outcome = await sendTextMessage({ ...ctx, to: lead.phone, text, contextId: `lead:${leadId}:${triggerType}:${template?.id ?? "custom"}` });
    }

    if (outcome.ok) return { success: true, logId: outcome.logId, outcome };
    return { success: false, logId: outcome.logId, error: outcome.errorMessage ?? outcome.errorCode ?? "Send failed", outcome };
  } catch (err) {
    console.error("fireWhatsAppTrigger failed:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
