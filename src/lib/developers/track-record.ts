/**
 * A developer's track record from what we can verify.
 *
 * Per project:
 *   RERA deadline   the revised (else proposed) completion date on the
 *                   project's TG-RERA certificate — the official date. Where
 *                   we haven't read the certificate, the RERA possession date
 *                   our listing source quotes, marked as such.
 *   developer target the possession month the developer advertises
 *   flags           OVERDUE        RERA deadline passed and not completed
 *                   EXTENDED       revised completion later than the original
 *                   BEHIND_TARGET  advertised possession passed, still under construction
 *                   LITIGATION     litigation declared to TG-RERA (or in our source)
 *                   CRIMINAL_CASE  criminal / police case declared to TG-RERA
 *                   REVOKED        RERA registration revoked
 *
 * Nothing is inferred beyond the documents: a project with no dates gets no
 * delay verdict, and the stats say how many projects each figure covers.
 *
 * Pure: unit-tested in developers.test.ts.
 */

export type Flag = "OVERDUE" | "EXTENDED" | "BEHIND_TARGET" | "LITIGATION" | "CRIMINAL_CASE" | "REVOKED";

export interface ProjectInput {
  id: string;
  name: string;
  reraNumbers: string[];
  /** Listing status: UNDER_CONSTRUCTION | READY | UNKNOWN */
  status: string;
  /** Developer's advertised possession (ISO date) */
  target: string | null;
  /** RERA possession date as quoted by our listing source (ISO) */
  listedReraDate: string | null;
  /** Litigation as quoted by our listing source */
  listedLitigation: "Yes" | "No" | null;
  certificate: {
    url: string;
    projectStatus: string | null;
    proposedCompletion: string | null;
    revisedCompletion: string | null;
    litigation: boolean | null;
    criminalCase: boolean | null;
  } | null;
  revoked: boolean;
}

export interface ProjectRecord {
  id: string;
  name: string;
  reraNumbers: string[];
  completed: boolean;
  reraDeadline: string | null;
  reraDeadlineSource: "TG-RERA certificate" | "listing source" | null;
  originalDeadline: string | null;
  target: string | null;
  monthsOverdue: number | null;
  monthsExtended: number | null;
  monthsBehindTarget: number | null;
  /** Developer target earlier than the RERA date, in months (the usual marketing cushion) */
  targetCushionMonths: number | null;
  flags: Flag[];
  certificateUrl: string | null;
}

export interface DeveloperStats {
  projects: number;
  completed: number;
  underConstruction: number;
  /** Projects with a RERA deadline we could read */
  withReraDeadline: number;
  withCertificate: number;
  overdue: number;
  extended: number;
  avgExtensionMonths: number | null;
  behindTarget: number;
  litigationDeclared: number;
  criminalCaseDeclared: number;
  revoked: number;
  regulatoryOrders: number;
  /** Delivered or still within the RERA deadline, out of projects with a deadline */
  onTrackPct: number | null;
}

const monthsBetween = (a: Date, b: Date) => Math.round(((b.getTime() - a.getTime()) / (30.44 * 86_400_000)) * 10) / 10;
/** ISO date → Date, or null for missing / malformed values (never an Invalid Date). */
const d = (iso: string | null) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const v = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(v.getTime()) || v.toISOString().slice(0, 10) !== iso.slice(0, 10) ? null : v;
};

export function projectRecord(p: ProjectInput, today = new Date()): ProjectRecord {
  const c = p.certificate;
  const completed = p.status === "READY" || /complet/i.test(c?.projectStatus ?? "");
  const proposed = d(c?.proposedCompletion ?? null);
  const revised = d(c?.revisedCompletion ?? null);
  const certDeadline = revised ?? proposed;
  const deadline = certDeadline ?? d(p.listedReraDate);
  const source = certDeadline ? "TG-RERA certificate" : p.listedReraDate ? "listing source" : null;
  const target = d(p.target);

  const flags: Flag[] = [];
  let monthsOverdue: number | null = null;
  if (deadline && !completed && deadline < today) {
    monthsOverdue = monthsBetween(deadline, today);
    flags.push("OVERDUE");
  }
  let monthsExtended: number | null = null;
  if (proposed && revised && revised > proposed) {
    monthsExtended = monthsBetween(proposed, revised);
    if (monthsExtended >= 1) flags.push("EXTENDED");
  }
  let monthsBehindTarget: number | null = null;
  if (target && !completed && p.status === "UNDER_CONSTRUCTION" && target < today) {
    monthsBehindTarget = monthsBetween(target, today);
    flags.push("BEHIND_TARGET");
  }
  if (c?.litigation === true || p.listedLitigation === "Yes") flags.push("LITIGATION");
  if (c?.criminalCase === true) flags.push("CRIMINAL_CASE");
  if (p.revoked) flags.push("REVOKED");

  return {
    id: p.id,
    name: p.name,
    reraNumbers: p.reraNumbers,
    completed,
    reraDeadline: deadline ? deadline.toISOString().slice(0, 10) : null,
    reraDeadlineSource: source,
    originalDeadline: proposed && revised && revised > proposed ? proposed.toISOString().slice(0, 10) : null,
    target: p.target,
    monthsOverdue,
    monthsExtended,
    monthsBehindTarget,
    targetCushionMonths: target && deadline && deadline > target ? monthsBetween(target, deadline) : null,
    flags,
    certificateUrl: c?.url ?? null,
  };
}

export function developerStats(records: ProjectRecord[], regulatoryOrders: number): DeveloperStats {
  const withDeadline = records.filter((r) => r.reraDeadline);
  const ext = records.filter((r) => r.flags.includes("EXTENDED")).map((r) => r.monthsExtended!);
  const has = (f: Flag) => records.filter((r) => r.flags.includes(f)).length;
  return {
    projects: records.length,
    completed: records.filter((r) => r.completed).length,
    underConstruction: records.filter((r) => !r.completed).length,
    withReraDeadline: withDeadline.length,
    withCertificate: records.filter((r) => r.reraDeadlineSource === "TG-RERA certificate").length,
    overdue: has("OVERDUE"),
    extended: ext.length,
    avgExtensionMonths: ext.length ? Math.round((ext.reduce((a, b) => a + b, 0) / ext.length) * 10) / 10 : null,
    behindTarget: has("BEHIND_TARGET"),
    litigationDeclared: has("LITIGATION"),
    criminalCaseDeclared: has("CRIMINAL_CASE"),
    revoked: has("REVOKED"),
    regulatoryOrders,
    onTrackPct: withDeadline.length ? Math.round((withDeadline.filter((r) => !r.flags.includes("OVERDUE")).length / withDeadline.length) * 100) : null,
  };
}
