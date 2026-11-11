/**
 * What happens after a public form creates or adds to a lead: tell the team,
 * then run the CRM automations. Called from route handlers inside `after()`,
 * so the buyer's response isn't held up by any of it.
 */
import prisma from "../prisma";
import { sendEmail } from "../email/client";
import { leadAlertEmail } from "../email/templates";
import { isPlaceholderEmail } from "../placeholder-email";
import { siteUrl } from "../site";
import { classifyLeadPersona } from "../persona-engine";
import { calculateLeadScore } from "../lead-scorer";
import { runMatchingForLead } from "../matching-engine";
import { initLeadRoadmap } from "../roadmap";
import { fireWhatsAppTrigger } from "../whatsapp/trigger-handler";
import type { IntakeResult } from "./intake";
import { leadAlertRecipients } from "./plan";

/** Email the team about a new or repeat enquiry. Never throws. */
export async function notifyTeamOfLead(r: IntakeResult, what: string): Promise<void> {
  try {
    const to = leadAlertRecipients();
    if (!to.length) {
      console.warn("[lead-alert] No LEAD_ALERT_EMAIL / OPS_ALERT_EMAIL / ADMIN_EMAIL set — nobody was told about lead", r.leadId);
      return;
    }
    const lead = await prisma.lead.findUnique({
      where: { id: r.leadId },
      select: { name: true, phone: true, email: true, budget: true, city: true, project: { select: { name: true } } },
    });
    if (!lead) return;
    const mail = leadAlertEmail({
      repeat: !r.created,
      name: lead.name,
      phone: lead.phone,
      email: isPlaceholderEmail(lead.email) ? null : lead.email,
      budgetLakh: lead.budget,
      projectName: lead.project?.name ?? null,
      what,
      crmUrl: `${siteUrl()}/admin/leads/${r.leadId}`,
    });
    const sent = await sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text, tags: { type: "lead_alert" } });
    if (!sent.ok) console.error("[lead-alert] email failed:", sent.error);
  } catch (err) {
    console.error("[lead-alert] failed:", err);
  }
}

/** Roadmap, persona, score, matches and the welcome message. Each step is best-effort. */
export async function runLeadAutomations(r: IntakeResult): Promise<void> {
  const steps: [string, () => Promise<unknown>][] = r.created
    ? [
        ["roadmap", () => initLeadRoadmap(r.leadId)],
        ["persona", () => classifyLeadPersona(r.leadId)],
        ["score", () => calculateLeadScore(r.leadId)],
        ["matching", () => runMatchingForLead(r.leadId)],
        ["whatsapp", () => fireWhatsAppTrigger(r.leadId, "LEAD_CREATED")],
      ]
    : [
        // A repeat enquiry may have added a budget — refresh what depends on it. No second welcome.
        ["persona", () => classifyLeadPersona(r.leadId)],
        ["score", () => calculateLeadScore(r.leadId)],
        ["matching", () => runMatchingForLead(r.leadId)],
      ];
  for (const [label, fn] of steps) {
    try {
      await fn();
    } catch (err) {
      console.error(`[lead] automation "${label}" failed for ${r.leadId}:`, err);
    }
  }
}

/** The alert first (it's what gets the buyer a call), then the slower automations. */
export async function followUpLead(r: IntakeResult, what: string): Promise<void> {
  await notifyTeamOfLead(r, what);
  await runLeadAutomations(r);
}
