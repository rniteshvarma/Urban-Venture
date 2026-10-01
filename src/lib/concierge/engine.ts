/**
 * The concierge conversation engine — pure (no I/O), so every branch is unit
 * testable. Given the saved state, one inbound message and (optionally) what
 * Claude extracted from it, it returns the new state and the replies to send.
 *
 * Design rules that keep people answering:
 *   • one question per message, mostly taps; a progress hint on core questions
 *   • anything already said is never asked again (rich first messages skip ahead)
 *   • every question can be skipped; two misses on one question skips it
 *   • "agent" at any time hands over to a person
 */
import type { BuyPurpose, ListingPropertyType } from "@prisma/client";
import { LISTING_TYPE_LABELS, PURPOSE_LABELS } from "../personas";
import {
  applyOption,
  isGreetingOnly,
  isHandoff,
  isRestart,
  isSkip,
  parseAreas,
  parseBudget,
  parseEverything,
  parseHorizon,
  parseName,
  parsePurpose,
  parseTimeline,
  parseTypes,
} from "./parse";
import type { AdvanceResult, CorridorOption, EngineState, Extraction, Inbound, Option, Reply, Slots, Step } from "./types";

export const MAX_RETRIES = 2;

export function initialState(): EngineState {
  return { started: false, step: null, slots: {}, retries: 0, pendingOptions: [] };
}

// ── Budget bands shown as a list ─────────────────────────────────────────
export const BUDGET_OPTIONS: Option[] = [
  { id: "b:0-30", title: "Under ₹30 lakh" },
  { id: "b:30-60", title: "₹30 – 60 lakh" },
  { id: "b:60-100", title: "₹60 lakh – 1 crore" },
  { id: "b:100-200", title: "₹1 – 2 crore" },
  { id: "b:200-", title: "Above ₹2 crore" },
  { id: "b:NA", title: "Not decided yet" },
];

const TYPE_OPTIONS: Option[] = [
  { id: "t:OPEN_PLOT", title: "Open plot", description: "Land to hold or build on later" },
  { id: "t:VILLA_PLOT", title: "Villa plot", description: "Plot in a gated villa layout" },
  { id: "t:VILLA", title: "Villa", description: "Ready or under-construction villa" },
  { id: "t:APARTMENT", title: "Apartment", description: "Flat in a gated community" },
  { id: "t:INDEPENDENT_HOUSE", title: "Independent house" },
  { id: "t:FARM_LAND", title: "Farm land", description: "Agricultural land or farm plot" },
  { id: "t:COMMERCIAL_PLOT", title: "Commercial plot" },
  { id: "t:COMMERCIAL_SPACE", title: "Commercial space", description: "Shop, office or showroom" },
  { id: "t:NOT_SURE", title: "Not sure yet", description: "I'll suggest what fits your budget" },
];

// ── Helpers ──────────────────────────────────────────────────────────────
const firstName = (s: Slots) => (s.name ? s.name.split(" ")[0] : "");

export function formatBudget(min: number | null | undefined, max: number | null | undefined): string {
  const f = (v: number) => (v >= 100 ? `₹${+(v / 100).toFixed(2)} Cr` : `₹${Math.round(v)}L`);
  if (min && max) return `${f(min)}–${f(max)}`;
  if (max) return `up to ${f(max)}`;
  if (min) return `${f(min)}+`;
  return "an open budget";
}

function isDone(s: Slots, step: Step): boolean {
  return !!s.done?.includes(step);
}

function markDone(s: Slots, step: Step, skipped = false) {
  s.done = Array.from(new Set([...(s.done ?? []), step]));
  if (skipped) s.skipped = Array.from(new Set([...(s.skipped ?? []), step]));
}

/** The next unanswered question, in order. HORIZON for investors, TIMELINE for own use. */
export function nextStep(s: Slots): Step | null {
  const order: Step[] = ["NAME", "PURPOSE", "TYPE", "AREA", "BUDGET", s.purpose === "OWN_USE" ? "TIMELINE" : "HORIZON", "EXTRAS"];
  for (const step of order) {
    if (step === "NAME" && s.name) continue;
    if (step === "HORIZON" && (isDone(s, "TIMELINE") || s.horizonYears)) continue;
    if (step === "TIMELINE" && (isDone(s, "HORIZON") || s.timeline)) continue;
    if (!isDone(s, step)) return step;
  }
  return null;
}

function progress(s: Slots, step: Step): string {
  const core: Step[] = ["PURPOSE", "TYPE", "AREA", "BUDGET", s.purpose === "OWN_USE" ? "TIMELINE" : "HORIZON"];
  const i = core.indexOf(step);
  return i >= 0 ? `${i + 1}/5 · ` : "";
}

/** A one-line recap of what's known — shown when a message filled several answers at once. */
export function recap(s: Slots, corridors: CorridorOption[]): string {
  const parts: string[] = [];
  if (s.types?.length) parts.push(s.types.map((t) => LISTING_TYPE_LABELS[t].toLowerCase()).join(" / "));
  if (s.areas?.length) parts.push(`around ${s.areas.map((a) => corridors.find((c) => c.slug === a)?.shortName ?? a).join(" / ")}`);
  if (s.budgetMaxLakh || s.budgetMinLakh) parts.push(formatBudget(s.budgetMinLakh, s.budgetMaxLakh));
  if (s.purpose) parts.push(`for ${PURPOSE_LABELS[s.purpose as BuyPurpose].toLowerCase()}`);
  return parts.join(" · ");
}

export function question(step: Step, s: Slots, corridors: CorridorOption[]): Reply {
  const p = progress(s, step);
  switch (step) {
    case "NAME":
      return { step, text: "First, what should I call you?" };
    case "PURPOSE":
      return {
        step,
        text: `${p}Is this for *investment*, or to *use yourself*?`,
        buttons: [
          { id: "p:INVESTMENT", title: "Investment" },
          { id: "p:OWN_USE", title: "Own use" },
          { id: "p:BOTH", title: "Both" },
        ],
      };
    case "TYPE":
      return { step, text: `${p}What kind of property are you looking for?`, list: { button: "Choose type", rows: TYPE_OPTIONS } };
    case "AREA":
      return {
        step,
        text: `${p}Which area are you considering? Pick one, or just type a locality.`,
        list: {
          button: "Choose area",
          rows: [
            ...corridors.slice(0, 9).map((c) => ({ id: `a:${c.slug}`, title: c.shortName.slice(0, 24), description: c.zone?.slice(0, 72) ?? undefined })),
            { id: "a:ANY", title: "Suggest for me", description: "I'll pick the best areas for your budget" },
          ],
        },
      };
    case "BUDGET":
      return { step, text: `${p}What's your budget? Tap a range, or type it (e.g. _45 lakhs_).`, list: { button: "Choose budget", rows: BUDGET_OPTIONS } };
    case "HORIZON":
      return {
        step,
        text: `${p}How long do you plan to hold it?`,
        buttons: [
          { id: "h:2", title: "1–3 years" },
          { id: "h:4", title: "3–5 years" },
          { id: "h:7", title: "5+ years" },
        ],
      };
    case "TIMELINE":
      return {
        step,
        text: `${p}When would you like to move in?`,
        buttons: [
          { id: "tl:READY", title: "Ready now" },
          { id: "tl:WITHIN_1Y", title: "Within a year" },
          { id: "tl:LATER", title: "2–3 years is fine" },
        ],
      };
    case "EXTRAS":
      return {
        step,
        text: "Last one — anything else we should know? e.g. _home loan needed, gated community, near a school, east-facing_. Type it, or tap Skip.",
        buttons: [{ id: "x:SKIP", title: "Skip" }],
      };
  }
}

const HINTS: Partial<Record<Step, string>> = {
  PURPOSE: "Just tap *Investment*, *Own use* or *Both* 👇",
  TYPE: "Tap *Choose type* below, or type something like _villa plot_ or _2BHK apartment_.",
  AREA: "Tap *Choose area*, or type a locality like _Kokapet_ or _near the airport_.",
  BUDGET: "Tap a range, or type something like _45 lakhs_ or _1.2 crore_.",
  HORIZON: "Tap one of the options, or type something like _5 years_.",
  TIMELINE: "Tap one of the options below 👇",
  NAME: "Just your first name is fine.",
};

/** Deterministically read an answer to the current step from free text. */
function readStep(step: Step, text: string, s: Slots, corridors: CorridorOption[]): boolean {
  switch (step) {
    case "NAME": {
      const n = parseName(text);
      if (n) s.name = n;
      return !!n;
    }
    case "PURPOSE": {
      const v = parsePurpose(text);
      if (v) s.purpose = v;
      return !!v;
    }
    case "TYPE": {
      const v = parseTypes(text);
      if (v) s.types = v.types;
      return !!v;
    }
    case "AREA": {
      const v = parseAreas(text, corridors);
      if (v) {
        s.areas = v.slugs;
        return true;
      }
      // A locality we don't track as a corridor ("Gachibowli", "near Uppal"): note it for the
      // advisor and let the matcher suggest areas, rather than saying we didn't understand.
      const place = text.trim().replace(/^(near|around|in|at|close to|somewhere in)\s+/i, "");
      if (
        /^[a-z][a-z .'&-]{3,40}$/i.test(place) &&
        place.split(/\s+/).length <= 4 &&
        !isSkip(place) &&
        !isGreetingOnly(place) &&
        !/^(hmm+|ok+|okay|yes|yeah|yep|what|huh|idk|test|thanks?|thank you|lol|sure|fine|good|great|cool|wait)$/i.test(place)
      ) {
        s.areas = [];
        s.areaText = place;
        return true;
      }
      return false;
    }
    case "BUDGET": {
      if (/\b(not sure|not decided|flexible|depends)\b/i.test(text)) {
        s.budgetMinLakh = null;
        s.budgetMaxLakh = null;
        return true;
      }
      const v = parseBudget(text);
      if (v) {
        s.budgetMinLakh = v.min;
        s.budgetMaxLakh = v.max;
      }
      return !!v;
    }
    case "HORIZON": {
      const v = parseHorizon(text);
      if (v) s.horizonYears = v;
      return !!v;
    }
    case "TIMELINE": {
      const v = parseTimeline(text);
      if (v) s.timeline = v;
      return !!v;
    }
    case "EXTRAS":
      s.requirements = text.trim().slice(0, 500);
      return true;
  }
}

/** Should the service ask Claude to read this message? */
export function needsExtraction(state: EngineState, input: Inbound, corridors: CorridorOption[]): boolean {
  const text = input.text?.trim();
  if (!text || input.optionId) return false;
  if (/^\d{1,2}$/.test(text) || isSkip(text) || isRestart(text) || isGreetingOnly(text)) return false;
  if (!state.started) return text.split(/\s+/).length >= 3;
  if (!state.step || state.step === "EXTRAS" || state.step === "NAME") return false;
  const probe: Slots = { ...state.slots };
  const understood = readStep(state.step, text, probe, corridors);
  return !understood || text.split(/\s+/).length >= 5; // long answers often carry more than one slot
}

/** Fill unanswered slots from Claude's extraction. Never overwrites an answer already given. */
function mergeExtraction(s: Slots, x: Extraction, corridors: CorridorOption[]): Step[] {
  const filled: Step[] = [];
  const valid = new Set(corridors.map((c) => c.slug));
  if (!s.name && x.name) s.name = x.name;
  if (!isDone(s, "PURPOSE") && x.purpose) {
    s.purpose = x.purpose;
    filled.push("PURPOSE");
  }
  if (!isDone(s, "TYPE") && (x.propertyTypes?.length || x.notSureOfType)) {
    s.types = (x.propertyTypes ?? []) as ListingPropertyType[];
    filled.push("TYPE");
  }
  const areas = (x.areaSlugs ?? []).filter((a) => valid.has(a));
  if (!isDone(s, "AREA") && (areas.length || x.wantsAreaSuggestion)) {
    s.areas = areas;
    filled.push("AREA");
  }
  if (!isDone(s, "BUDGET") && (x.budgetMaxLakh || x.budgetMinLakh)) {
    s.budgetMinLakh = x.budgetMinLakh ?? null;
    s.budgetMaxLakh = x.budgetMaxLakh ?? null;
    filled.push("BUDGET");
  }
  if (!isDone(s, "HORIZON") && !isDone(s, "TIMELINE")) {
    if (x.horizonYears) {
      s.horizonYears = x.horizonYears;
      filled.push("HORIZON");
    } else if (x.timeline) {
      s.timeline = x.timeline;
      filled.push("TIMELINE");
    }
  }
  if (x.requirements && !s.requirements) s.requirements = x.requirements.slice(0, 500);
  for (const f of filled) markDone(s, f);
  return filled;
}

const SLOT_KEYS: Partial<Record<Step, Array<keyof Slots>>> = {
  PURPOSE: ["purpose"],
  TYPE: ["types"],
  AREA: ["areas"],
  BUDGET: ["budgetMinLakh", "budgetMaxLakh"],
  HORIZON: ["horizonYears"],
};

function pick(slots: Partial<Slots>, step: Step): Partial<Slots> {
  const out: Partial<Slots> = {};
  for (const k of SLOT_KEYS[step] ?? []) (out as Record<string, unknown>)[k] = slots[k];
  return out;
}

function ask(state: EngineState, step: Step, corridors: CorridorOption[], prefix?: string): Reply {
  const q = question(step, state.slots, corridors);
  state.step = step;
  state.pendingOptions = (q.buttons ?? q.list?.rows ?? []).map((o) => o.id);
  return prefix ? { ...q, text: `${prefix}\n\n${q.text}` } : q;
}

export function advance(prev: EngineState, input: Inbound, corridors: CorridorOption[], opts: { senderName?: string | null; extraction?: Extraction | null } = {}): AdvanceResult {
  const state: EngineState = JSON.parse(JSON.stringify(prev));
  const s = state.slots;
  const text = input.text?.trim() ?? "";
  const done = (replies: Reply[], extra: Partial<AdvanceResult> = {}): AdvanceResult => ({ state, replies, complete: false, handoff: false, restart: false, ...extra });

  // Anytime commands
  if (input.optionId === "handoff" || (text && isHandoff(text) && !input.optionId)) {
    return done([{ text: "Sure — I've asked an advisor to message you here shortly. 🙏" }], { handoff: true });
  }
  if (text && isRestart(text)) {
    return { state: initialState(), replies: [], complete: false, handoff: false, restart: true };
  }

  // Resolve "2" against the last options offered (text fallback for providers without buttons).
  let optionId = input.optionId ?? null;
  if (!optionId && /^\d{1,2}$/.test(text) && state.pendingOptions.length) {
    optionId = state.pendingOptions[Number(text) - 1] ?? null;
  }

  // ── First message: greet, absorb anything they already told us, ask the first gap ──
  if (!state.started) {
    state.started = true;
    if (!s.name && opts.senderName) s.name = parseName(opts.senderName) ?? null;
    const before = (s.done ?? []).length;
    if (text && !isGreetingOnly(text)) {
      const parsed = parseEverything(text, corridors);
      Object.assign(s, parsed.slots);
      for (const st of parsed.steps) markDone(s, st);
      if (opts.extraction) mergeExtraction(s, opts.extraction, corridors);
    }
    const hi = firstName(s) ? `Hi ${firstName(s)} 👋` : "Hi 👋";
    const known = (s.done ?? []).length > before ? `\n\nGot it: *${recap(s, corridors)}*.` : "";
    const intro = `${hi} I'm Property Tiger's property assistant. A few quick taps and I'll send your best-matched properties, with our rating and why each one suits you.${known}\n\n_Type AGENT anytime to talk to a person._`;
    const step = nextStep(s);
    if (!step) return done([{ text: intro }], { complete: true });
    return done([ask(state, step, corridors, intro)]);
  }

  const step = state.step;
  if (!step) return done([], { complete: nextStep(s) === null });

  // "hi" / "hello" again mid-flow is a greeting, not a wrong answer.
  if (!optionId && text && isGreetingOnly(text)) {
    return done([ask(state, step, corridors, `Hi again${firstName(s) ? `, ${firstName(s)}` : ""} 👋 Picking up where we left off:`)]);
  }

  // ── Answer to the current question ──
  let answered = false;
  if (optionId) {
    const applied = applyOption(optionId, s);
    if (applied) {
      markDone(s, applied, optionId === "x:SKIP");
      answered = isDone(s, step);
      if (!answered) {
        // A tap on an older message's button — take it, then carry on where we were.
        state.retries = 0;
        return done([ask(state, nextStep(s) ?? step, corridors, `Got it: *${recap(s, corridors)}*.`)]);
      }
    }
  } else if (text) {
    if (isSkip(text)) {
      markDone(s, step, true);
      answered = true;
    } else {
      answered = readStep(step, text, s, corridors);
      if (answered) {
        markDone(s, step);
        // "3BHK under 1 crore" at the type question also answers the budget question.
        if (step !== "EXTRAS" && step !== "NAME" && text.split(/\s+/).length >= 3) {
          const parsed = parseEverything(text, corridors);
          for (const st of parsed.steps.filter((x) => !isDone(s, x))) {
            Object.assign(s, pick(parsed.slots, st));
            markDone(s, st);
          }
        }
      }
    }
    // They may have answered a different question ("plot in Kokapet" while we asked budget).
    let other: Step[] = [];
    if (!answered && step !== "EXTRAS") {
      const parsed = parseEverything(text, corridors);
      other = parsed.steps.filter((st) => !isDone(s, st));
      for (const st of other) {
        Object.assign(s, pick(parsed.slots, st));
        markDone(s, st);
      }
    }
    if (opts.extraction) other = [...other, ...mergeExtraction(s, opts.extraction, corridors)];
    answered = answered || isDone(s, step);
    if (!answered && other.length) {
      // Useful, just not what we asked — acknowledge and ask again, no "sorry".
      return done([ask(state, nextStep(s) ?? step, corridors, `Got it: *${recap(s, corridors)}*.`)]);
    }
  }

  if (!answered) {
    state.retries += 1;
    if (state.retries > MAX_RETRIES) {
      markDone(s, step, true); // don't trap anyone on one question
    } else {
      const again = question(step, s, corridors);
      state.pendingOptions = (again.buttons ?? again.list?.rows ?? []).map((o) => o.id);
      return done([{ ...again, text: `Sorry, I didn't quite catch that 🙂 ${HINTS[step] ?? ""}`.trim() }]);
    }
  }

  state.retries = 0;
  const next = nextStep(s);
  if (!next) {
    state.step = null;
    state.pendingOptions = [];
    return done([], { complete: true });
  }
  return done([ask(state, next, corridors)]);
}

export function describeType(t: ListingPropertyType[] | undefined): string {
  if (!t?.length) return "property";
  return t.map((x) => LISTING_TYPE_LABELS[x].toLowerCase()).join(" / ");
}
