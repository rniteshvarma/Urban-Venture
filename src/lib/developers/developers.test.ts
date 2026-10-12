import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { firstOrganisation, normaliseOrgName, slugify } from "./names";
import { parseCertificate, parseOrderList, respondentFromOrderText, respondentFromTitle } from "./rera";
import { developerStats, projectRecord, type ProjectInput } from "./track-record";

const fixture = (name: string) => readFileSync(path.join(__dirname, "fixtures", name), "utf8");

describe("developer names", () => {
  test("legal-form noise goes, distinguishing words stay", () => {
    assert.equal(normaliseOrgName("Aparna Constructions And Estates Pvt Ltd"), "aparna construction and estate");
    assert.equal(normaliseOrgName("M/s. APARNA CONSTRUCTIONS & ESTATES PRIVATE LIMITED"), "aparna construction and estate");
    assert.notEqual(normaliseOrgName("Aparna Infra Pvt Ltd"), normaliseOrgName("Aparna Constructions Pvt Ltd"));
    assert.equal(normaliseOrgName("M/s. PBSR Developers Pvt. Ltd., Rep by its MD"), "pbsr developer");
    assert.equal(normaliseOrgName("Vasavi Realtors LLP"), "vasavi realtor");
  });

  test("slugs and the first organisation of a respondent block", () => {
    assert.equal(slugify("My Home Constructions Pvt. Ltd."), "my-home-constructions-pvt-ltd");
    assert.equal(firstOrganisation("M/s. PBSR Developers Pvt. Ltd., Rep by\n1. Ms. A\n(R/o. Jubilee Hills)"), "M/s. PBSR Developers Pvt. Ltd");
  });
});

describe("TG-RERA certificate", () => {
  const c = parseCertificate(fixture("rera-certificate.txt"));
  test("status, dates, declarations and promoter", () => {
    assert.equal(c.projectStatus, "On-Going Project");
    assert.equal(c.approvedDate, "2021-07-03");
    assert.equal(c.proposedCompletion, "2027-04-14");
    assert.equal(c.revisedCompletion, "2027-04-14");
    assert.equal(c.litigation, false);
    assert.equal(c.criminalCase, false);
    assert.equal(c.promoterName, "Aliens Developers Private Limited");
  });
  test("per-tower completion dates", () => {
    assert.deepEqual(c.buildings[0], { name: "Station 1", completion: "2026-12-14" });
  });
});

describe("TG-RERA orders", () => {
  test("the Authority's complaint list: structured respondent when given, document link always", () => {
    const rows = parseOrderList(fixture("rera-orders-authority.html"), "COMPLAINT");
    assert.ok(rows.length >= 4);
    assert.equal(rows[0].date, "2026-10-05");
    assert.match(rows[0].documentUrl, /^https:\/\/rera\.telangana\.gov\.in\/Home\/ShowPdf\?pdffilename=/);
    const withResp = rows.find((r) => r.respondent);
    assert.match(withResp?.respondent ?? "", /Pacifica Constructions|Godrej Properties/);
    // The complainant column is never read.
    assert.ok(rows.every((r) => r.respondent !== "[complainant]" && r.projectName !== "[complainant]"));
  });

  test("suo motu titles name the promoter; revocations give project and promoter", () => {
    const so = parseOrderList(fixture("rera-orders-suomotu.html"), "SUO_MOTU");
    assert.equal(respondentFromTitle(so[0].title), "APR Group Corporate Capital");
    const rv = parseOrderList(fixture("rera-revoked.html"), "REVOCATION");
    // Each document row inherits the project and promoter of its header row.
    assert.deepEqual(rv.map((r) => [r.title, r.respondent]), [
      ["Show Cause Notice — Jayas Platinum", "JAYATHRI INFRASTRUCTURES INDIA PRIVATE LIMITED"],
      ["Revocation Order — Jayas Platinum", "JAYATHRI INFRASTRUCTURES INDIA PRIVATE LIMITED"],
      ["Revocation Order — BRMeadowland Apartments", "YVR Constructions"],
    ]);
  });

  test("complaint orders name the respondent", () => {
    assert.equal(respondentFromOrderText(fixture("rera-order-text.txt")).respondent, "M/s. PBSR Developers Pvt. Ltd");
    assert.equal(respondentFromOrderText("An order with no parties").respondent, null);
  });

  test("suo motu orders name RESPONDENT-1 even without 'Versus'", () => {
    assert.equal(respondentFromOrderText(fixture("rera-order-suomotu.txt"), "SUO_MOTU").respondent, "M/s Iconic Infra Groups");
  });

  test("in an appeal the developer is whichever side is labelled developer — never the complainant", () => {
    assert.equal(respondentFromOrderText(fixture("rera-order-appellate.txt"), "APPELLATE").respondent, "M/s Viana Homes Pvt. Ltd");
    // Without a developer label an appeal names nobody (it could run either way).
    assert.equal(respondentFromOrderText("Between:\nM/s X Developers\n…Appellant\nAND\nA Buyer\n…Respondent\nORDER", "APPELLATE").respondent, null);
  });
});

describe("delay tracker", () => {
  const today = new Date("2026-10-12T00:00:00Z");
  const base: ProjectInput = { id: "p", name: "P", reraNumbers: ["P1"], status: "UNDER_CONSTRUCTION", target: null, listedReraDate: null, listedLitigation: null, certificate: null, revoked: false };
  const cert = (proposed: string, revised: string | null, extra: Partial<NonNullable<ProjectInput["certificate"]>> = {}) => ({
    url: "u", projectStatus: "On-Going Project", proposedCompletion: proposed, revisedCompletion: revised, litigation: false, criminalCase: false, ...extra,
  });

  test("past the RERA deadline and not completed is overdue, by months", () => {
    const r = projectRecord({ ...base, certificate: cert("2025-10-12", null) }, today);
    assert.deepEqual(r.flags, ["OVERDUE"]);
    assert.equal(r.monthsOverdue, 12);
    assert.equal(r.reraDeadlineSource, "TG-RERA certificate");
  });

  test("an extension is measured from the original date, and the revised date is the deadline", () => {
    const r = projectRecord({ ...base, certificate: cert("2025-06-30", "2027-06-30") }, today);
    assert.deepEqual(r.flags, ["EXTENDED"]);
    assert.equal(r.monthsExtended, 24);
    assert.equal(r.reraDeadline, "2027-06-30");
    assert.equal(r.originalDeadline, "2025-06-30");
  });

  test("completed projects are never overdue; READY in listings counts as completed", () => {
    assert.deepEqual(projectRecord({ ...base, status: "READY", certificate: cert("2024-01-01", null) }, today).flags, []);
    assert.deepEqual(projectRecord({ ...base, certificate: cert("2024-01-01", null, { projectStatus: "Completed Project" }) }, today).flags, []);
  });

  test("behind the developer's own target, and the target-to-RERA cushion", () => {
    const r = projectRecord({ ...base, target: "2026-03-01", listedReraDate: "2027-03-01" }, today);
    assert.deepEqual(r.flags, ["BEHIND_TARGET"]);
    assert.equal(r.reraDeadlineSource, "listing source");
    assert.ok(r.targetCushionMonths! > 11.9 && r.targetCushionMonths! < 12.1);
  });

  test("declarations and revocations are flagged; no dates means no delay verdict", () => {
    const r = projectRecord({ ...base, certificate: cert("2028-01-01", null, { litigation: true, criminalCase: true }), revoked: true }, today);
    assert.deepEqual(r.flags, ["LITIGATION", "CRIMINAL_CASE", "REVOKED"]);
    assert.deepEqual(projectRecord(base, today).flags, []);
    assert.equal(projectRecord(base, today).reraDeadline, null);
  });

  test("stats say how many projects each figure covers", () => {
    const recs = [
      projectRecord({ ...base, id: "a", certificate: cert("2025-10-12", null) }, today),
      projectRecord({ ...base, id: "b", certificate: cert("2025-06-30", "2027-06-30") }, today),
      projectRecord({ ...base, id: "c", status: "READY" }, today),
      projectRecord({ ...base, id: "d" }, today),
    ];
    const s = developerStats(recs, 3);
    assert.deepEqual(
      [s.projects, s.completed, s.withReraDeadline, s.withCertificate, s.overdue, s.extended, s.avgExtensionMonths, s.onTrackPct, s.regulatoryOrders],
      [4, 1, 2, 2, 1, 1, 24, 50, 3],
    );
  });
});
