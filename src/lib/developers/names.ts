/**
 * Developer / promoter names → a key for EXACT matching.
 *
 * Only legal-form noise is removed ("M/s.", "Pvt. Ltd.", "Private Limited",
 * "LLP", "Rep by …", punctuation, case). Words that tell companies apart —
 * Constructions, Infra, Developers, Estates — are kept, so "Aparna
 * Constructions and Estates Pvt Ltd" and "APARNA CONSTRUCTIONS AND ESTATES
 * PRIVATE LIMITED" match, but "Aparna Infra" does not. Never fuzzy: a wrong
 * match would pin someone else's RERA order on a developer.
 *
 * Pure: unit-tested in developers.test.ts.
 */

const LEGAL_FORM = /\b(private|pvt|limited|ltd|llp|l\.l\.p|inc|incorporated|co|company|corp|corporation|opc|the)\b/g;

/** Business words whose plural is a spelling variant, never a different company. */
const SINGULAR = /\b(constructions|developers|builders|projects|infrastructures|ventures|estates|realtors|infratechs|promoters|associates)\b/g;

export function normaliseOrgName(raw: string): string {
  let s = raw.toLowerCase().replace(/&/g, " and ");
  // "M/s. X Pvt Ltd, Rep by its MD …" → "X Pvt Ltd"
  s = s.replace(/\b(rep(resented)?\.?\s*by|represented|rep\.)\b[\s\S]*$/, "");
  s = s.replace(/^\s*(m\/s\.?|messrs\.?|m\/s)\s*/, "");
  s = s.replace(/\(\s*(india|i)\s*\)/g, " ");
  s = s.replace(/[^a-z0-9 ]+/g, " ");
  s = s.replace(LEGAL_FORM, " ");
  // "Pacifica Construction" and "Pacifica Constructions" are the same company.
  s = s.replace(SINGULAR, (w) => w.replace(/s$/, ""));
  return s.replace(/\s+/g, " ").trim();
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** The first organisation named in a respondent block ("M/s. X Pvt Ltd, Rep by 1. …"). */
export function firstOrganisation(block: string): string | null {
  const line = block
    .split(/\n|;/)
    .map((l) => l.trim())
    .find((l) => l && !/^\(?r\/o|^\d+\.\s*(mr|ms|mrs|sri|smt)\b/i.test(l));
  if (!line) return null;
  const cut = line.replace(/,?\s*(rep(resented)?\.?\s*by|rep\.).*$/i, "").replace(/[,;.]+$/, "").trim();
  return cut.length >= 3 ? cut : null;
}

/**
 * The legal form a name states: an LLP and a company with the same name can be
 * different entities, so a match needs the forms to agree when both are stated.
 */
export function legalForm(raw: string): "llp" | "company" | null {
  const s = raw.toLowerCase();
  if (/\bl\.?l\.?p\b/.test(s)) return "llp";
  if (/\b(pvt|private|ltd|limited)\b/.test(s)) return "company";
  return null;
}
