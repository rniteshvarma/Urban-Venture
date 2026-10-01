/**
 * Emails the team when a WhatsApp buyer shares their details or asks for a
 * person. Goes through the central email client (logged, not sent, until
 * Resend is live).
 */
import { sendEmail } from "../email/client";
import { LISTING_TYPE_LABELS, PERSONA_META, PURPOSE_LABELS } from "../personas";
import { formatBudget } from "./engine";
import type { RankedMatch } from "./match";
import type { Slots } from "./types";

/** Where "new interest" emails go. Override with CONCIERGE_ALERT_EMAIL (comma-separated). */
export const DEFAULT_ALERT_EMAIL = "rniteshvarma@gmail.com";

export type InterestKind = "COMPLETED" | "ADVISOR" | "SITE_VISIT" | "FOLLOW_UP" | "PARTIAL";

const SUBJECT: Record<InterestKind, string> = {
  COMPLETED: "New buyer interest on WhatsApp",
  ADVISOR: "WhatsApp buyer wants to talk to an advisor",
  SITE_VISIT: "WhatsApp buyer wants a site visit",
  FOLLOW_UP: "WhatsApp buyer sent a follow-up",
  PARTIAL: "WhatsApp buyer left part-way",
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export interface InterestInput {
  kind: InterestKind;
  name: string | null;
  phone: string;
  slots: Slots;
  areaNames: string[];
  persona?: string | null;
  personaReason?: string | null;
  matches?: RankedMatch[];
  reportUrl?: string | null;
  leadId?: string | null;
  conversationId: string;
  lastMessage?: string | null;
  simulated?: boolean;
}

/** Build the "new interest" email (exported so it can be previewed). */
export function buildInterestEmail(input: InterestInput): { to: string[]; subject: string; html: string; text: string } {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const to = (process.env.CONCIERGE_ALERT_EMAIL || DEFAULT_ALERT_EMAIL).split(",").map((s) => s.trim()).filter(Boolean);
  const s = input.slots;
  const who = input.name || "A new buyer";
  const summary = [
    s.types?.length ? s.types.map((t) => LISTING_TYPE_LABELS[t]).join(" / ") : null,
    input.areaNames.length ? input.areaNames.join(" / ") : null,
    s.budgetMaxLakh || s.budgetMinLakh ? formatBudget(s.budgetMinLakh, s.budgetMaxLakh) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const persona = input.persona && input.persona in PERSONA_META ? PERSONA_META[input.persona as keyof typeof PERSONA_META] : null;

  const rows: Array<[string, string]> = [
    ["Name", input.name || "—"],
    ["WhatsApp", input.phone],
    ["Purpose", s.purpose ? PURPOSE_LABELS[s.purpose] : "—"],
    ["Looking for", s.types?.length ? s.types.map((t) => LISTING_TYPE_LABELS[t]).join(", ") : "Not sure yet"],
    ["Area", input.areaNames.length ? input.areaNames.join(", ") : s.areaText || "Asked us to suggest"],
    ["Budget", s.budgetMaxLakh || s.budgetMinLakh ? formatBudget(s.budgetMinLakh, s.budgetMaxLakh) : "Not decided"],
    [s.purpose === "OWN_USE" ? "Move-in" : "Holding period", s.purpose === "OWN_USE" ? (s.timeline ?? "—").replace("_", " ").toLowerCase() : s.horizonYears ? `~${s.horizonYears} years` : "—"],
    ["Other needs", s.requirements || "—"],
    ["Persona", persona ? `${persona.label}${input.personaReason ? ` — ${input.personaReason.replace(/^[^:]+:\s*/, "")}` : ""}` : "—"],
  ];
  if (input.lastMessage) rows.push(["Their message", input.lastMessage]);

  const intro: Record<InterestKind, string> = {
    COMPLETED: `a new user has shared interest in buying property through WhatsApp, and we've sent them their matches${input.reportUrl ? " and report" : ""}.`,
    ADVISOR: "a WhatsApp buyer has asked to talk to an advisor. Please reply to them on WhatsApp.",
    SITE_VISIT: "a WhatsApp buyer wants to book a site visit. Please reply to them on WhatsApp to fix a time.",
    FOLLOW_UP: "a WhatsApp buyer who already received their matches has sent a follow-up message.",
    PARTIAL: "a WhatsApp buyer started sharing their requirements but stopped part-way. Their details so far are below.",
  };

  const matchHtml = input.matches?.length
    ? `<h3 style="font-size:14px;margin:20px 0 8px">Top matches sent</h3><ol style="padding-left:18px;margin:0">${input.matches
        .map((m) => `<li style="margin-bottom:6px"><strong>${esc(m.project.name)}</strong> — ${m.rating}/10 (fit ${m.fit})${m.watchOut ? `<br><span style="color:#92400e">Watch-out: ${esc(m.watchOut)}</span>` : ""}</li>`)
        .join("")}</ol>`
    : "";

  const links = [
    input.leadId ? `<a href="${base}/admin/leads/${input.leadId}" style="display:inline-block;background:#5B4FE0;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;font-weight:600;margin-right:8px">Open lead in CRM</a>` : "",
    `<a href="${base}/admin/concierge?c=${input.conversationId}" style="display:inline-block;background:#EEEDF7;color:#5B4FE0;text-decoration:none;padding:10px 16px;border-radius:999px;font-weight:600;margin-right:8px">View conversation</a>`,
    input.reportUrl ? `<a href="${input.reportUrl}" style="color:#5B4FE0">Their report</a>` : "",
  ].join("");

  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1A1A2E;max-width:560px">
<p>Hi Nitesh,</p>
<p>${esc(who)} — ${intro[input.kind]}</p>
<table style="border-collapse:collapse;width:100%;font-size:14px">${rows
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6E6D8A;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:6px 0">${esc(v)}</td></tr>`)
    .join("")}</table>
${matchHtml}
<p style="margin-top:22px">${links}</p>
${input.simulated ? '<p style="color:#92400e;font-size:12px">This came from the CRM chat simulator, not a real customer.</p>' : ""}
<p style="color:#8A8A9E;font-size:12px;margin-top:24px">Sent by the Property Tiger WhatsApp concierge.</p></div>`;

  const text = `Hi Nitesh,\n\n${who} — ${intro[input.kind]}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${input.leadId ? `CRM: ${base}/admin/leads/${input.leadId}\n` : ""}Conversation: ${base}/admin/concierge?c=${input.conversationId}`;

  return { to, subject: `${input.simulated ? "[Simulator] " : ""}${SUBJECT[input.kind]}: ${who}${summary ? ` — ${summary}` : ""}`, html, text };
}

export async function emailInterest(input: InterestInput): Promise<void> {
  const email = buildInterestEmail(input);
  const res = await sendEmail({ ...email, tags: { type: "concierge", kind: input.kind } });
  if (!res.ok) console.error("[concierge] interest email failed:", res.error);
}
