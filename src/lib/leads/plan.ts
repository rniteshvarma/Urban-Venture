/**
 * The pure part of lead intake — no database, so it is unit-tested directly
 * (plan.test.ts). See intake.ts for what it is used for.
 */
import { isPlaceholderEmail, placeholderEmail } from "../placeholder-email";

/** Last 10 digits of a phone, ignoring the country code and formatting. "" when there are fewer than 10. */
export function phone10(phone: string | null | undefined): string {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : "";
}

/** A usable Indian mobile: 10 digits starting 6–9 (after any +91 / 0 prefix). */
export function isValidMobile(phone: string | null | undefined): boolean {
  return /^[6-9]\d{9}$/.test(phone10(phone));
}

export interface LeadIntake {
  name: string;
  phone?: string | null;
  email?: string | null;
  /** Lakh. Leave empty when the buyer didn't say. */
  budgetLakh?: number | null;
  /** Years. Leave empty when the buyer didn't say. */
  horizonYears?: number | null;
  city?: string | null;
  projectId?: string | null;
  /** The account this submission belongs to, when known. */
  userId?: string | null;
  /** CRM source key: listing_enquiry | site_visit | calculator | research */
  source: string;
  /** What happened, in one line — shown in the lead's notes. */
  note: string;
}

export interface ExistingLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  budget: number | null;
  horizon: number | null;
  notes: string | null;
  userId: string | null;
  projectId: string | null;
}

const GENERIC_NAMES = new Set(["client", "whatsapp contact", "inbound enquiry", ""]);
const positive = (n: number | null | undefined): number | null => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null);
const realEmail = (e: string | null | undefined): string | null => {
  const v = (e ?? "").trim().toLowerCase();
  return v && !isPlaceholderEmail(v) ? v : null;
};

export function stamp(now: Date): string {
  return now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

export type IntakePlan =
  | { action: "create"; data: { name: string; email: string; phone: string; budget: number | null; horizon: number | null; city: string; notes: string; source: string; projectId: string | null; userId: string | null } }
  | { action: "update"; id: string; data: { name: string; email: string; phone: string; budget: number | null; horizon: number | null; notes: string; projectId: string | null; userId: string | null } };

/** Decide what to write. `existing` is the same person's open lead, if there is one. */
export function planIntake(existing: ExistingLead | null, i: LeadIntake, now: Date): IntakePlan {
  const name = i.name.trim();
  const phone = (i.phone ?? "").trim();
  const email = realEmail(i.email);
  const budget = positive(i.budgetLakh);
  const horizon = positive(i.horizonYears);
  const line = `[${stamp(now)} · ${i.source}] ${i.note.trim()}`;

  if (!existing) {
    return {
      action: "create",
      data: {
        name: name || "Client",
        email: email ?? placeholderEmail(phone),
        phone,
        budget,
        horizon,
        city: i.city?.trim() || "Hyderabad",
        notes: line,
        source: i.source,
        projectId: i.projectId ?? null,
        userId: i.userId ?? null,
      },
    };
  }

  return {
    action: "update",
    id: existing.id,
    data: {
      // Keep the name we have unless it was only a stand-in.
      name: GENERIC_NAMES.has(existing.name.trim().toLowerCase()) && name ? name : existing.name,
      // A real address replaces a placeholder, never the other way round.
      email: realEmail(existing.email) ?? email ?? existing.email,
      phone: existing.phone || phone,
      // The buyer's latest stated figure wins; silence changes nothing.
      budget: budget ?? existing.budget,
      horizon: horizon ?? existing.horizon,
      notes: `${existing.notes ? `${existing.notes}\n` : ""}${line}`,
      projectId: i.projectId ?? existing.projectId,
      userId: existing.userId ?? i.userId ?? null,
    },
  };
}

/** Where new-enquiry alerts go: LEAD_ALERT_EMAIL, else the ops / admin address. Comma-separated lists are allowed. */
export function leadAlertRecipients(env: Record<string, string | undefined> = process.env): string[] {
  const raw = env.LEAD_ALERT_EMAIL || env.OPS_ALERT_EMAIL || env.ADMIN_EMAIL || "";
  return raw.split(",").map((x) => x.trim()).filter(Boolean);
}
