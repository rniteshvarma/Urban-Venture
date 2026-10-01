/**
 * WhatsApp buyer concierge — shared types. The engine is a slot-filling
 * checklist: every answer lands in a slot, questions whose slot is already
 * filled are skipped, and Claude (when configured) only helps read free text.
 */
import type { BuyPurpose, ListingPropertyType } from "@prisma/client";

export type Step = "NAME" | "PURPOSE" | "TYPE" | "AREA" | "BUDGET" | "HORIZON" | "TIMELINE" | "EXTRAS";
export type Timeline = "READY" | "WITHIN_1Y" | "LATER";

export interface Slots {
  name?: string | null;
  purpose?: BuyPurpose | null;
  types?: ListingPropertyType[]; // [] = "not sure yet"
  areas?: string[]; // corridor slugs; [] = "suggest for me"
  areaText?: string | null; // what they typed, when it matched no corridor
  budgetMinLakh?: number | null;
  budgetMaxLakh?: number | null;
  horizonYears?: number | null;
  timeline?: Timeline | null;
  requirements?: string | null;
  /** Steps answered (including "not sure" / "suggest for me") or skipped. */
  done?: Step[];
  skipped?: Step[];
}

export interface Option {
  id: string;
  title: string; // ≤ 20 chars for buttons, ≤ 24 for list rows
  description?: string; // list rows only, ≤ 72 chars
}

/** One outbound message. Buttons (≤3) or a list (≤10 rows) make it interactive. */
export interface Reply {
  text: string;
  buttons?: Option[];
  list?: { button: string; rows: Option[] };
  step?: Step | null;
}

export interface Inbound {
  text?: string | null;
  optionId?: string | null; // a tapped button / list row
}

export interface EngineState {
  started: boolean;
  step: Step | null;
  slots: Slots;
  retries: number;
  pendingOptions: string[]; // ids of the options last offered, in order — "2" resolves against this
}

export interface CorridorOption {
  slug: string;
  name: string;
  shortName: string;
  zone?: string | null;
  subAreas?: string[];
  aliases?: string[];
}

/** What Claude pulled out of a free-text message. Every field optional. */
export interface Extraction {
  name?: string | null;
  purpose?: BuyPurpose | null;
  propertyTypes?: ListingPropertyType[];
  notSureOfType?: boolean;
  areaSlugs?: string[];
  wantsAreaSuggestion?: boolean;
  budgetMinLakh?: number | null;
  budgetMaxLakh?: number | null;
  horizonYears?: number | null;
  timeline?: Timeline | null;
  requirements?: string | null;
  wantsHuman?: boolean;
}

export interface AdvanceResult {
  state: EngineState;
  replies: Reply[];
  /** Every question is answered — time to find matches. */
  complete: boolean;
  /** The customer asked for a person. */
  handoff: boolean;
  restart: boolean;
}

export const CORE_STEPS: Step[] = ["PURPOSE", "TYPE", "AREA", "BUDGET", "HORIZON"]; // HORIZON ⇄ TIMELINE by purpose
