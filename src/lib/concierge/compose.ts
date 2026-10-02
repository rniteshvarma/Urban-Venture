/**
 * The results messages the customer receives — pure, so the copy is testable.
 */
import type { BuyerPersona } from "@prisma/client";
import { LISTING_TYPE_LABELS, PURPOSE_LABELS, listingTypesFromText } from "../personas";
import { describeType, formatBudget } from "./engine";
import type { CorridorCand, MatchProfile, RankedMatch } from "./match";
import type { Reply, Slots } from "./types";

const lakh = (v: number) => (v >= 100 ? `₹${+(v / 100).toFixed(2)} Cr` : `₹${Math.round(v)}L`);

export const RESULT_OPTIONS = [
  { id: "c:VISIT", title: "Book site visit" },
  { id: "c:ADVISOR", title: "Talk to advisor" },
  { id: "c:WEEKLY", title: "Weekly updates" },
];

export function quickTakeFallback(name: string, slots: Slots, matches: RankedMatch[], closestOnly: boolean, gap: string | null = null): string {
  const top = matches[0];
  const what = `${describeType(slots.types)}${slots.budgetMaxLakh || slots.budgetMinLakh ? ` at ${formatBudget(slots.budgetMinLakh, slots.budgetMaxLakh)}` : ""}`;
  const a = /^[aeiou]/i.test(what) ? "an" : "a";
  if (!top) return `${name ? `${name}, ` : ""}nothing listed fits ${a} ${what} yet — the areas below are where we'd look first.`;
  // With a gap the headline already says what is missing, so don't repeat it here.
  if (closestOnly && gap) return `${top.project.name}${top.corridorName ? ` in ${top.corridorName}` : ""} comes closest.`;
  if (closestOnly) return `Nothing listed fits every detail of ${a} ${what} yet; ${top.project.name} comes closest.`;
  const why = top.reasons.find((r) => !/exactly the type/.test(r));
  return `For ${a} ${what}, ${top.project.name} scores highest at ${top.rating}/10${why ? ` — ${why.charAt(0).toLowerCase()}${why.slice(1)}` : ""}.`;
}

/** Facts handed to Claude for the quick take — nothing else may appear in it. */
export function quickTakeFacts(slots: Slots, persona: BuyerPersona | null, matches: RankedMatch[], areas: CorridorCand[], gap: string | null = null) {
  return {
    // Set when nothing fits (already shown as the headline): the matches are only the closest alternatives.
    nothingFits: gap,
    buyer: {
      purpose: slots.purpose ? PURPOSE_LABELS[slots.purpose] : null,
      wants: slots.types?.map((t) => LISTING_TYPE_LABELS[t]) ?? [],
      budget: slots.budgetMaxLakh || slots.budgetMinLakh ? formatBudget(slots.budgetMinLakh, slots.budgetMaxLakh) : null,
      holdYears: slots.horizonYears ?? null,
      persona,
    },
    matches: matches.map((m) => ({ name: m.project.name, area: m.corridorName, rating: m.rating, reasons: m.reasons, watchOut: m.watchOut })),
    suggestedAreas: areas.map((a) => ({ name: a.shortName, score: a.overallScore, drivers: a.keyDrivers.slice(0, 2) })),
  };
}

export function composeResults(input: {
  name: string;
  slots: Slots;
  profile: MatchProfile;
  matches: RankedMatch[];
  closestOnly: boolean;
  gap?: string | null;
  areas: CorridorCand[];
  quickTake: string;
  reportUrl: string | null;
}): Reply[] {
  const { name, matches, closestOnly, gap, areas, quickTake, reportUrl } = input;
  const lines: string[] = [];
  const first = name ? `${name}, h` : "H";
  if (!matches.length) lines.push(`*${first}ere's where I'd look* 📍`);
  else if (closestOnly && gap) lines.push(`*${name ? `${name}, ${gap.charAt(0).toLowerCase()}${gap.slice(1)}` : gap}.* Here are the closest options:`);
  else if (closestOnly) lines.push(`*${first}ere are the closest options* — nothing listed matches every detail yet.`);
  else lines.push(`*${first}ere are your top matches* 🏆`);
  lines.push(`_${quickTake}_`);

  matches.forEach((m, i) => {
    const types = m.project.listingTypes.length ? m.project.listingTypes : listingTypesFromText(m.project.propertyType);
    lines.push(
      [
        `\n*${i + 1}. ${m.project.name}* — ⭐ *${m.rating}/10*`,
        `📍 ${m.corridorName ?? m.project.corridor} · ${types.map((t) => LISTING_TYPE_LABELS[t]).join(" / ") || m.project.propertyType} · ${lakh(m.project.minBudgetLakhs)}–${lakh(m.project.maxBudgetLakhs)}`,
        // The 📍 line already shows the type, so lead with the more telling reasons.
        ...[...m.reasons.filter((r) => !/exactly the type/.test(r)), ...m.reasons.filter((r) => /exactly the type/.test(r))].slice(0, 2).map((r) => `✅ ${r}`),
        m.watchOut ? `⚠️ ${m.watchOut}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  });

  const suggestAreas = !input.slots.areas?.length || closestOnly || !matches.length;
  if (suggestAreas && areas.length) {
    lines.push(
      `\n📍 *Best areas for you:* ${areas
        .map((a) => `${a.shortName}${a.overallScore ? ` (score ${a.overallScore})` : ""}${a.keyDrivers[0] ? ` — ${a.keyDrivers[0]}` : ""}`)
        .join("; ")}`,
    );
  }
  if (closestOnly || !matches.length) lines.push("\nI'll message you as soon as a property that fits is listed.");
  lines.push("\n_Ratings are our estimate from listing and area data — not financial advice._");

  const text = lines.join("\n").slice(0, 3900);
  const next = reportUrl
    ? `📄 Your full report — area trends, approvals and price context:\n${reportUrl}\n\nWhat would you like to do next?`
    : "What would you like to do next?";
  return [{ text }, { text: next, buttons: RESULT_OPTIONS }];
}
