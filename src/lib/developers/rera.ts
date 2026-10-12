/**
 * TG-RERA public documents.
 *
 *  - Project certificate pages (rerait.telangana.gov.in/PrintPreview/…):
 *    status, approved date, proposed and revised completion, per-tower
 *    completion, declared litigation and criminal cases, promoter name.
 *    We only open certificate links that are already published (our sources
 *    list them); the site's search is behind a captcha and is never bypassed.
 *  - Order lists on rera.telangana.gov.in (complaint, adjudication, suo motu,
 *    revocation, appellate) and the respondent named inside each order PDF.
 *
 * Pure parsing is unit-tested in developers.test.ts against real documents.
 */
import { normaliseOrgName } from "./names";

export interface CertificateData {
  projectStatus: string | null;
  approvedDate: string | null;
  proposedCompletion: string | null;
  revisedCompletion: string | null;
  litigation: boolean | null;
  criminalCase: boolean | null;
  promoterName: string | null;
  buildings: { name: string; completion: string | null }[];
}

/** HTML → " | "-separated cell text, the shape every parser below reads. */
export function htmlToCells(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, "|")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&rsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .replace(/(\s*\|\s*)+/g, " | ");
}

const dmy = (s: string | undefined) => {
  const m = s?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const yesNo = (s: string | undefined) => (s == null ? null : /^\s*yes\s*$/i.test(s) ? true : /^\s*no\s*$/i.test(s) ? false : null);
/** The cell after a label: "| Label | value |" */
const after = (text: string, label: RegExp) => text.match(new RegExp(`${label.source}\\s*\\|\\s*([^|]*?)\\s*\\|`, "i"))?.[1]?.trim();

export function parseCertificate(text: string): CertificateData {
  const buildings: CertificateData["buildings"] = [];
  const block = text.slice(text.indexOf("Building Details"));
  // "| 1 | Project | Tower name | 14/12/2026 00:00:00 |"
  for (const m of block.matchAll(/\|\s*\d+\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(\d{2}\/\d{2}\/\d{4})(?:\s+00:00:00)?\s*\|/g)) {
    if (buildings.length >= 60) break;
    buildings.push({ name: m[2], completion: dmy(m[3]) });
  }
  const promoter = after(text, /Promoter Information - Organization\s*\|\s*Name/) ?? after(text, /Promoter Information - Individual\s*\|\s*Name/);
  return {
    projectStatus: after(text, /Project Status/) ?? null,
    approvedDate: dmy(after(text, /Approved Date/)),
    proposedCompletion: dmy(after(text, /(?<!Revised )Proposed Date of Completion/)),
    revisedCompletion: dmy(after(text, /Revised Proposed Date of Completion/)),
    litigation: yesNo(after(text, /Litigations related to the project \?/)),
    criminalCase: yesNo(after(text, /Any criminal or police case\/ cases pending \?/)),
    promoterName: promoter && promoter.length > 2 ? promoter : null,
    buildings,
  };
}

// ── Orders ──────────────────────────────────────────────────────────────────

export type OrderKind = "COMPLAINT" | "ADJUDICATION" | "SUO_MOTU" | "REVOCATION" | "APPELLATE";

export interface OrderListRow {
  kind: OrderKind;
  title: string;
  date: string | null;
  caseNumber: string | null;
  respondent: string | null;
  projectName: string | null;
  documentUrl: string;
}

const cellsOf = (tr: string) => [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => htmlToCells(m[1]).replace(/^\s*\|\s*|\s*\|\s*$/g, "").trim());

/**
 * Rows of an order list page. The Authority's complaint list has columns
 * (Sr, Subject, Date, Complaint No, Complainant, Respondent, Project, …);
 * the others have (Sr, Subject, Date, Document) or, for revocations,
 * (Sr, Project, Promoter, #, Document). The complainant column is ignored.
 */
export function parseOrderList(html: string, kind: OrderKind, base = "https://rera.telangana.gov.in"): OrderListRow[] {
  const out: OrderListRow[] = [];
  // Revocations: a header row (rowspan) names the project and promoter, then
  // one row per document (show-cause notice, revocation order) follows it.
  let current: { project: string; promoter: string } | null = null;
  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const cells = cellsOf(tr);
    const href = tr.match(/href=["']([^"']+\.pdf[^"']*|[^"']*ShowPdf[^"']*)["']/i)?.[1];
    if (kind === "REVOCATION") {
      if (/rowspan/i.test(tr) && cells.length >= 3 && /^\d+$/.test(cells[0])) {
        current = { project: cells[1], promoter: cells[2] };
      }
      if (!href || !current) continue;
      const docName = (/rowspan/i.test(tr) ? cells[4] : cells[1]) || "Document";
      out.push({
        kind, title: `${docName} — ${current.project}`, date: null, caseNumber: null,
        respondent: current.promoter || null, projectName: current.project || null,
        documentUrl: new URL(href.replace(/\\/g, "/"), base).toString(),
      });
      continue;
    }
    if (!href || cells.length < 3 || !/^\d+$/.test(cells[0])) continue;
    const documentUrl = new URL(href.replace(/\\/g, "/"), base).toString();
    const complaintCols = cells.length >= 7;
    out.push({
      kind,
      title: cells[1],
      date: dmy(cells[2]),
      caseNumber: complaintCols ? cells[3] || null : null,
      respondent: complaintCols ? cells[5] || null : null,
      projectName: complaintCols ? cells[6] || null : null,
      documentUrl,
    });
  }
  return out;
}

/** "Suo Motu order on APR Group Corporate Capital" → "APR Group Corporate Capital" */
export function respondentFromTitle(title: string): string | null {
  const m = title.match(/\b(?:order|orders)\s+(?:on|against)\s+(?:m\/s\.?\s*)?(.+?)\s*$/i);
  return m ? m[1].trim() : null;
}

/**
 * The parties in an order's header, as blocks closed by their role label:
 *   M/s. PBSR Developers Pvt. Ltd., Rep by …     →  …Respondents
 *   1. M/s Viana Homes Pvt. Ltd. through its MD  →  ...Appellants/developers
 *   M/s Iconic Infra Groups, (Rep. by …)          →  …RESPONDENT-1
 * Quorum / case-number / "Between" / "Versus" lines start a new block; the
 * order body ("ORDER", "The present …") ends the header.
 */
export function partiesFromOrderText(text: string): { label: string; lines: string[] }[] {
  const blocks: { label: string; lines: string[] }[] = [];
  let cur: string[] = [];
  for (const raw of text.slice(0, 8000).split(/\n/)) {
    const t = raw.trim();
    if (!t) continue;
    // The body starts at a bare "ORDER" heading or the first narrative line — not at
    // "COMMON ORDER IN COMPLAINT NUMBERS …", which is a title above the parties.
    if (/^(ORDER|JUDGMENT|COMMON ORDER|FINAL ORDER)\s*:?$/.test(t) || /^The present\b|proceeds to pass|^This (complaint|appeal)\b/i.test(t)) break;
    if (/hon.?ble|^quorum|^coram|^between:?$|^versus$|^vs\.?$|^and$|complaint no|case no|^t\.?\s?a\.?\s?no|^dated|^\[under|^before\b|appellate tribunal|regulatory authority/i.test(t)) {
      cur = [];
      continue;
    }
    // A role label closes the block — on its own line, or at the end of the last address line
    // ("… Hyderabad – 500034. …Respondent").
    const role = t.match(/(?:^|\s)(?:…|\.{2,})[.\s]*([A-Za-z][A-Za-z/ ().-]*?)(?:\s*[-–]?\s*\d+)?\s*$/);
    if (role && /respondent|complainant|appellant|petitioner|applicant|developer|promoter|builder|allottee/i.test(role[1])) {
      const before = t.slice(0, role.index).trim();
      if (before) cur.push(before);
      blocks.push({ label: role[1].trim(), lines: cur });
      cur = [];
      continue;
    }
    cur.push(t);
  }
  return blocks;
}

const ORG_WORD = /\bm\/s\b|\bpvt\b|private|limited|\bltd\b|\bllp\b|developers?|constructions?|infra|builders?|projects?|homes|estates?|realty|realtors|ventures|group|associates|properties/i;

/**
 * The first organisation in a block. Only organisations are kept: a party that
 * is a private individual (a landowner, a proprietor named personally, a
 * buyer) is never stored, so personal names stay out of our records.
 */
export function organisationIn(lines: string[]): string | null {
  const cleaned = lines.map((l) => l.replace(/^\d+\.\s*/, "")).filter((l) => !/^\(|^r\/o|^office at|^flat no|^plot no|^door no|^[sdw]\/o\b/i.test(l));
  const line = cleaned.find((l) => ORG_WORD.test(l));
  if (!line) return null;
  const name = cleanOrgName(line);
  return name && ORG_WORD.test(name) ? name : null;
}

/** True when a stored name is an organisation (see organisationIn). */
export const isOrganisation = (name: string | null | undefined) => !!name && ORG_WORD.test(name) && !/^[sdw]\/o\b/i.test(name.trim());

/**
 * Just the name: "1) M/s X Pvt Ltd.– “Y Project”, rep by …" → "M/s X Pvt Ltd".
 * Cuts at representation ("rep by", "through"), quoted project names, brackets
 * ("(Formerly known as …)"), dashes, "project …", "having …", job titles, and the
 * first comma that isn't followed by a legal form ("…, Pvt Ltd").
 */
export function cleanOrgName(raw: string): string | null {
  let s = raw.replace(/^\s*(\(?\d+[).]|\d+\.)\s*/, "").trim();
  s = s.replace(/\s*(,\s*)?(\(?rep(resented)?\.?\s*by|\(?rep\.|through|represented|having)\b.*$/i, "");
  s = s.replace(/\s*[“"(].*$/, "");
  s = s.replace(/\s+[–—-]\s*.*$|[–—]\s*.*$/, "");
  s = s.replace(/\s+(project|managing director|director|partner|proprietor|chairman)\b.*$/i, "");
  s = s.replace(/,(?!\s*(pvt|private|ltd|limited|llp)\b).*$/i, "");
  s = s.replace(/[,;.\s]+$/, "").trim();
  return s.length >= 3 ? s : null;
}

/**
 * The developer named in an order: the party labelled developer / promoter /
 * builder if there is one; otherwise, for complaint, adjudication and
 * suo-motu orders, the respondent. Appeals can run either way, so without an
 * explicit developer label we name nobody.
 */
export function respondentFromOrderText(text: string, kind: OrderKind = "COMPLAINT"): { respondent: string | null; projectName: string | null } {
  const blocks = partiesFromOrderText(text);
  const dev = blocks.find((b) => /develop|promoter|builder/i.test(b.label));
  const resp = kind === "APPELLATE" ? undefined : blocks.find((b) => /respondent/i.test(b.label) && !/complainant|allottee|buyer/i.test(b.label));
  const respondent = dev ? organisationIn(dev.lines) : resp ? organisationIn(resp.lines) : null;
  // The project is usually quoted in the facts: … "Smondo Gachibowli" project …
  const project = text.slice(0, 8000).match(/[“"]([A-Z][^”"\n]{2,60})[”"]\s*(?:project|venture|apartments?)/)?.[1] ?? null;
  return { respondent, projectName: project };
}

export const respondentKey = (name: string | null) => (name ? normaliseOrgName(name) || null : null);
