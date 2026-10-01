// Part 3.4 — the ONLY place AI touches the report. Claude writes the subject
// line and opening line from the already-assembled structured data; it never
// selects items, computes a score, or writes a number (Constraint 9).
//
// Cached on the WeeklyReport row — never regenerated on resend. Falls back to a
// deterministic composer when no API key is set (same pattern as anthropic.ts),
// which keeps every report specific even without the API.

import Anthropic from "@anthropic-ai/sdk";
import type { TopThreeItem, PrefSnapshot } from "./types";

export interface HeadlineOutput {
  subject: string; // ≤60 chars
  preheader: string; // ≤90 chars
  headline: string; // ≤120 chars
  whatsappOpener: string; // ≤70 chars
}

const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…");

/** Deterministic, specific fallback headline built from the structured data. */
export function composeHeadlineFallback(top: TopThreeItem[], pref: PrefSnapshot): HeadlineOutput {
  const areas = pref.areaSlugs.length ? pref.propertyTypes : [];
  void areas;
  const lead = top[0];
  const hasProperty = top.some((t) => t.type === "MATCHED_PROPERTY" || t.type === "PRICE_DROP" || t.type === "NEAR_MISS_PROPERTY");
  const areaName = (top.find((t) => t.type.startsWith("AREA_"))?.title ?? "").split(" score")[0].split(" price")[0];

  let headline: string;
  if (!lead) headline = "Your weekly area intelligence is ready.";
  else if (hasProperty) headline = `${lead.title}${top[1] ? ` and ${top[1].title}` : ""} this week.`;
  else headline = `No new matches this week${areaName ? `, but ${areaName} moved` : ""}.`;

  const subject = lead ? `${lead.title}${lead.subtitle ? ` — ${lead.subtitle}` : ""}` : "Your weekly land report";

  return {
    subject: clip(subject, 60),
    preheader: clip(top.slice(0, 2).map((t) => t.title).join(" · ") || "This week in your areas", 90),
    headline: clip(headline, 120),
    whatsappOpener: clip(lead ? lead.title : "Your weekly land report is ready", 70),
  };
}

const MODEL = "claude-sonnet-4-20250514";

export async function generateHeadline(top: TopThreeItem[], pref: PrefSnapshot): Promise<HeadlineOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const fallback = composeHeadlineFallback(top, pref);
  if (!apiKey || apiKey === "mock-anthropic-key-for-local-testing" || apiKey.trim() === "") return fallback;

  const budget = pref.budgetMinLakh != null || pref.budgetMaxLakh != null ? `₹${pref.budgetMinLakh ?? 0}–${pref.budgetMaxLakh ?? "?"} Lakh` : "unspecified";
  const prompt = `You are writing the subject line and opening line of a weekly land investment intelligence report for an Indian investor.

Reader profile:
- Budget: ${budget}
- Areas watched: ${pref.areaSlugs.join(", ") || "none"}
- Property types: ${pref.propertyTypes.join(", ") || "any"}

This week's top items:
${JSON.stringify(top, null, 2)}

Return ONLY JSON:
{"subject":"email subject line, max 60 chars, specific, no clickbait","preheader":"email preheader, max 90 chars","headline":"one sentence opening the web report, max 120 chars","whatsappOpener":"one short line for WhatsApp, max 70 chars, no emoji spam"}

Rules:
- Be specific. "Kadthal up 3 points, 2 new plots in your range" beats "Your weekly property update".
- Never use: guaranteed, don't miss, urgent, last chance, hurry, skyrocketing, booming.
- No more than one emoji total, and only if it genuinely aids scanning.
- Never promise returns or imply a recommendation.
- If the report is mostly area intelligence rather than properties, say so plainly.`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });
    const text = res.content.find((c) => c.type === "text")?.text ?? "";
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return {
      subject: clip(String(json.subject ?? fallback.subject), 60),
      preheader: clip(String(json.preheader ?? fallback.preheader), 90),
      headline: clip(String(json.headline ?? fallback.headline), 120),
      whatsappOpener: clip(String(json.whatsappOpener ?? fallback.whatsappOpener), 70),
    };
  } catch (e) {
    console.error("[reports] headline generation failed, using fallback:", e);
    return fallback;
  }
}
