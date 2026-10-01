/**
 * Turn a finished (or abandoned / handed-over) conversation into CRM records:
 * lead with buyer profile + persona, project matches, a phone-only user with
 * report preferences, and a generated report the customer can open by link.
 */
import type { ListingPropertyType, ReportPropertyType } from "@prisma/client";
import prisma from "../prisma";
import { calculateLeadScore } from "../lead-scorer";
import { LISTING_TYPE_LABELS } from "../personas";
import { ensurePersonaConfigs } from "../persona-config";
import { isPlaceholderEmail, placeholderEmail } from "../placeholder-email";
import { generateAndStore } from "../reports/persist";
import { nationalTail } from "../whatsapp/phone";
import { classifyProfile, type PersonaResult } from "./persona";
import { loadCandidates, pickAreas, rankProjects, type CorridorCand, type MatchProfile, type RankedMatch } from "./match";
import type { Slots } from "./types";

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function profileFromSlots(slots: Slots, phone: string): MatchProfile {
  return {
    purpose: slots.purpose ?? null,
    types: slots.types ?? [],
    areas: slots.areas ?? [],
    budgetMinLakh: slots.budgetMinLakh ?? null,
    budgetMaxLakh: slots.budgetMaxLakh ?? null,
    horizonYears: slots.horizonYears ?? null,
    timeline: slots.timeline ?? null,
    requirements: slots.requirements ?? null,
    isNri: !phone.startsWith("+91"),
  };
}

const REPORT_TYPES: Record<ListingPropertyType, ReportPropertyType> = {
  OPEN_PLOT: "PLOT",
  VILLA_PLOT: "PLOT",
  VILLA: "VILLA",
  APARTMENT: "APARTMENT",
  INDEPENDENT_HOUSE: "INDEPENDENT_HOUSE",
  FARM_LAND: "FARM_PLOT",
  COMMERCIAL_PLOT: "COMMERCIAL",
  COMMERCIAL_SPACE: "COMMERCIAL",
  INDUSTRIAL_LAND: "INDUSTRIAL_LAND",
};

function horizonFor(slots: Slots): number {
  if (slots.horizonYears) return slots.horizonYears;
  if (slots.timeline === "READY" || slots.timeline === "WITHIN_1Y") return 1;
  if (slots.timeline === "LATER") return 3;
  return 3;
}

/** Create or update the CRM lead for this phone with everything the concierge learned. */
export async function upsertLead(input: {
  phone: string;
  name: string | null;
  slots: Slots;
  persona: PersonaResult | null;
  source: string;
  note: string;
}): Promise<string> {
  const { phone, slots } = input;
  const existing = await prisma.lead.findFirst({ where: { phone: { contains: nationalTail(phone) } }, orderBy: { createdAt: "desc" } });
  const typeLabel = slots.types?.length ? slots.types.map((t) => LISTING_TYPE_LABELS[t]).join(", ") : null;
  const stamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const profile = {
    purpose: slots.purpose ?? undefined,
    wantedTypes: slots.types ?? [],
    preferredAreas: slots.areas ?? [],
    budgetMinLakh: slots.budgetMinLakh ?? null,
    timeline: slots.timeline ?? null,
    isNri: !phone.startsWith("+91"),
    requirements: [slots.requirements, slots.areaText ? `Prefers area: ${slots.areaText}` : null].filter(Boolean).join("; ") || null,
    aiExtractedProperty: typeLabel,
    aiExtractedBudget: slots.budgetMaxLakh ?? null,
    aiExtractedHorizon: slots.horizonYears ?? null,
    ...(input.persona
      ? { persona: input.persona.persona, personaScore: input.persona.score, personaReason: input.persona.reason, personaUpdatedAt: new Date() }
      : {}),
  };

  if (existing) {
    const lead = await prisma.lead.update({
      where: { id: existing.id },
      data: {
        ...profile,
        name: existing.name === "WhatsApp Contact" && input.name ? input.name : existing.name,
        budget: slots.budgetMaxLakh ?? slots.budgetMinLakh ?? existing.budget,
        horizon: slots.horizonYears || slots.timeline ? horizonFor(slots) : existing.horizon,
        notes: `${existing.notes ?? ""}\n[WhatsApp concierge ${stamp}] ${input.note}`.trim(),
      },
    });
    return lead.id;
  }

  const lead = await prisma.lead.create({
    data: {
      ...profile,
      name: input.name || "WhatsApp Contact",
      email: placeholderEmail(phone),
      phone,
      budget: slots.budgetMaxLakh ?? slots.budgetMinLakh ?? 0,
      horizon: horizonFor(slots),
      city: "Hyderabad",
      source: input.source,
      sourceChannel: "WHATSAPP_BUSINESS",
      status: "NEW",
      rawEnquiryText: input.note,
      notes: `[WhatsApp concierge ${stamp}] ${input.note}`,
    },
  });
  return lead.id;
}

/** Phone-only user (placeholder email) so the report feature can run for them. */
async function upsertUser(phone: string, name: string | null): Promise<string> {
  // Match an existing account however its number was stored (+91…, 91…, or 10 digits).
  const byPhone = await prisma.user.findFirst({ where: { phone: { endsWith: nationalTail(phone) } }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (byPhone) return byPhone.id;
  const email = placeholderEmail(phone);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name, phone, phoneVerified: true }, // they messaged us from this number
    update: { name: name ?? undefined, phone },
    select: { id: true },
  });
  return user.id;
}

export interface FinalizeResult {
  leadId: string;
  userId: string;
  persona: PersonaResult;
  matches: RankedMatch[];
  closestOnly: boolean;
  areas: CorridorCand[];
  reportId: string | null;
  reportUrl: string | null;
}

export async function finalizeConversation(input: { conversationId: string; phone: string; name: string | null; slots: Slots; simulated: boolean }): Promise<FinalizeResult> {
  await ensurePersonaConfigs();
  const profile = profileFromSlots(input.slots, input.phone);
  const persona = classifyProfile(profile);
  profile.persona = persona.persona;

  const { projects, corridors } = await loadCandidates();
  const { matches, closestOnly } = rankProjects(projects, profile, corridors);
  const areas = pickAreas(profile, corridors);

  const leadId = await upsertLead({
    phone: input.phone,
    name: input.name,
    slots: input.slots,
    persona,
    source: input.simulated ? "concierge-simulator" : "whatsapp-concierge",
    note: `Shared requirements; persona ${persona.persona}; top match ${matches[0]?.project.name ?? "none"}${matches[0] ? ` (${matches[0].rating}/10)` : ""}.`,
  });

  // CRM matches: every listing that fits reasonably, not just the three we sent.
  const all = rankProjects(projects, profile, corridors, 8).matches.filter((m) => m.fit >= 40);
  for (const m of all) {
    await prisma.projectLeadMatch.upsert({
      where: { projectId_leadId: { projectId: m.project.id, leadId } },
      create: { projectId: m.project.id, leadId, matchScore: m.fit, matchReasons: [...m.reasons, ...(m.watchOut ? [`Watch-out: ${m.watchOut}`] : [])] },
      update: { matchScore: m.fit, matchReasons: [...m.reasons, ...(m.watchOut ? [`Watch-out: ${m.watchOut}`] : [])], isDismissed: false },
    });
  }
  await calculateLeadScore(leadId).catch((e) => console.error("[concierge] lead score failed", e));

  const userId = await upsertUser(input.phone, input.name);
  await prisma.lead.update({ where: { id: leadId }, data: { userId } });

  // Watch what they chose, where their matches are, then our suggestions — up to five areas.
  const areaSlugs = Array.from(
    new Set([...(input.slots.areas ?? []), ...matches.map((m) => m.project.corridorSlug).filter((x): x is string => !!x), ...areas.map((a) => a.slug)]),
  ).slice(0, 5);
  // What they want now. Delivery settings (channels, frequency, on/off) belong
  // to the user — only set for a brand-new preference, never overwritten.
  const prefData = {
    budgetMinLakh: input.slots.budgetMinLakh ?? null,
    budgetMaxLakh: input.slots.budgetMaxLakh ?? null,
    areaSlugs,
    propertyTypes: Array.from(new Set((input.slots.types ?? []).map((t) => REPORT_TYPES[t]))),
    horizonYears: input.slots.horizonYears ?? null,
    phoneVerified: true,
  };
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  await prisma.reportPreference.upsert({
    where: { userId },
    // Weekly sends stay off until they tap "Weekly updates" (consent).
    create: { userId, ...prefData, channelWhatsApp: true, channelEmail: !isPlaceholderEmail(user.email), frequency: "WEEKLY", isActive: false, completedAt: new Date() },
    update: prefData,
  });

  let reportId: string | null = null;
  let reportUrl: string | null = null;
  try {
    const now = new Date();
    // The first report right after a chat: its matches are the point, so a thin week still ships.
    const result = await generateAndStore(userId, new Date(now.getTime() - 7 * 86_400_000), now, now, { minItems: 1 });
    if (result.reportId && result.status === "GENERATED") {
      const report = await prisma.weeklyReport.findUnique({ where: { id: result.reportId }, select: { accessToken: true } });
      reportId = result.reportId;
      reportUrl = report ? `${appUrl()}/report/${report.accessToken}` : null;
    }
  } catch (err) {
    console.error("[concierge] report generation failed:", err);
  }

  await prisma.conciergeConversation.update({ where: { id: input.conversationId }, data: { leadId, userId, reportId, reportUrl } });
  return { leadId, userId, persona, matches, closestOnly, areas, reportId, reportUrl };
}
