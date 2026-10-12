// Labels for developer track records. Neutral and factual on purpose: each
// flag says what a document shows, not a judgement about the developer.

import type { Flag } from "./track-record";
import type { DeveloperRecordJson } from "./sync";

export const FLAG_LABEL: Record<Flag, { label: string; tone: "alert" | "warn" | "info"; explain: string }> = {
  OVERDUE: { label: "Past RERA completion date", tone: "alert", explain: "The completion date registered with TG-RERA has passed and the project isn't recorded as completed." },
  EXTENDED: { label: "RERA date extended", tone: "warn", explain: "The project's revised completion date on TG-RERA is later than the original one." },
  BEHIND_TARGET: { label: "Past developer's target", tone: "warn", explain: "The possession month the developer advertised has passed and the project is still under construction. The RERA date may still be ahead." },
  LITIGATION: { label: "Litigation declared", tone: "warn", explain: "The project's TG-RERA registration (or our listing source) says there is litigation related to the project." },
  CRIMINAL_CASE: { label: "Criminal case declared", tone: "alert", explain: "The promoter declared a pending criminal or police case in its TG-RERA registration." },
  REVOKED: { label: "RERA registration revoked", tone: "alert", explain: "TG-RERA lists this project's registration as revoked." },
};

export const ORDER_KIND_LABEL: Record<string, string> = {
  COMPLAINT: "Complaint order",
  ADJUDICATION: "Adjudicating Officer order",
  SUO_MOTU: "Suo motu order",
  REVOCATION: "Revocation",
  APPELLATE: "Appellate Tribunal order",
};

export const monthYear = (iso: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" }) : "—");
export const months = (n: number | null) => (n == null ? "" : n < 1 ? "under a month" : `${Math.round(n)} month${Math.round(n) === 1 ? "" : "s"}`);

export const recordOf = (stats: unknown) => stats as DeveloperRecordJson | null;
