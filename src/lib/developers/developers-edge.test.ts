// Edge cases for developer names, TG-RERA parsing and the delay tracker.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { legalForm, normaliseOrgName, slugify } from "./names";
import { cleanOrgName, isOrganisation, organisationIn, parseCertificate, parseOrderList, respondentFromOrderText, respondentFromTitle } from "./rera";
import { developerStats, projectRecord, type ProjectInput } from "./track-record";

const today = new Date("2026-10-12T00:00:00Z");
const base: ProjectInput = { id: "p", name: "P", reraNumbers: ["P1"], status: "UNDER_CONSTRUCTION", target: null, listedReraDate: null, listedLitigation: null, certificate: null, revoked: false };

describe("names — edge cases", () => {
  test("empty and punctuation-only names normalise to nothing; slugs never empty", () => {
    assert.equal(normaliseOrgName(""), "");
    assert.equal(normaliseOrgName("M/s. Pvt. Ltd."), "");
    assert.equal(slugify("!!!"), "");
  });
  test("'(India)', '&' and extra spaces", () => {
    assert.equal(normaliseOrgName("Sri  Aditya  Homes (India) Pvt Ltd"), normaliseOrgName("SRI ADITYA HOMES PRIVATE LIMITED"));
    assert.equal(normaliseOrgName("R & R Constructions"), "r and r construction");
  });
  test("singular / plural business words are one company", () => {
    assert.equal(normaliseOrgName("M/s Pacifica Construction Pvt. Ltd"), normaliseOrgName("Pacifica Constructions Private Limited"));
    assert.equal(normaliseOrgName("Vasavi Realtor LLP"), normaliseOrgName("Vasavi Realtors LLP"));
    // …but other words keep their meaning.
    assert.notEqual(normaliseOrgName("My Home Constructions"), normaliseOrgName("My Homes Constructions"));
  });
  test("legal forms are told apart for matching", () => {
    assert.deepEqual([legalForm("Sterling Heights LLP"), legalForm("M/s Sterling heights Pvt. Ltd"), legalForm("M/s Elemental Realty"), legalForm("X L.L.P.")], ["llp", "company", null, "llp"]);
  });
  test("a developer's name is not trimmed into a different developer's", () => {
    assert.notEqual(normaliseOrgName("My Home Constructions"), normaliseOrgName("My Home Infra"));
    assert.notEqual(normaliseOrgName("Vasavi Group"), normaliseOrgName("Vasavi Realtors LLP"));
  });
});

describe("delay tracker — edge cases", () => {
  const cert = (proposed: string | null, revised: string | null, status = "On-Going Project") => ({ url: "u", projectStatus: status, proposedCompletion: proposed, revisedCompletion: revised, litigation: null, criminalCase: null });

  test("a deadline of today is not yet overdue", () => {
    assert.deepEqual(projectRecord({ ...base, certificate: cert("2026-10-12", null) }, today).flags, []);
  });
  test("a revised date earlier than the original is not an extension", () => {
    const r = projectRecord({ ...base, certificate: cert("2027-06-30", "2027-01-31") }, today);
    assert.deepEqual(r.flags, []);
    assert.equal(r.reraDeadline, "2027-01-31");
  });
  test("malformed dates are ignored, never a crash", () => {
    const r = projectRecord({ ...base, target: "soon", listedReraDate: "2027-13-45", certificate: cert("not a date", null) }, today);
    assert.equal(r.reraDeadline, null);
    assert.deepEqual(r.flags, []);
  });
  test("a READY listing with a past developer target is not behind target", () => {
    assert.deepEqual(projectRecord({ ...base, status: "READY", target: "2025-01-01" }, today).flags, []);
  });
  test("status UNKNOWN with a past target makes no delay claim", () => {
    assert.deepEqual(projectRecord({ ...base, status: "UNKNOWN", target: "2025-01-01" }, today).flags, []);
  });
  test("'New Project' on TG-RERA is not completed", () => {
    assert.deepEqual(projectRecord({ ...base, certificate: cert("2026-01-01", null, "New Project") }, today).flags, ["OVERDUE"]);
  });
  test("a developer with no dated projects has no on-track %", () => {
    assert.equal(developerStats([projectRecord(base, today)], 0).onTrackPct, null);
  });
});

describe("TG-RERA parsing — edge cases", () => {
  test("a certificate page without the fields gives nulls, not wrong values", () => {
    const c = parseCertificate(" | Unauthorized Access | ");
    assert.deepEqual([c.projectStatus, c.proposedCompletion, c.litigation, c.promoterName, c.buildings.length], [null, null, null, null, 0]);
  });
  test("an individual promoter's certificate", () => {
    const c = parseCertificate(" | Promoter Information - Individual | Name | Sri A Builder | Project Status | New Project | Proposed Date of Completion | 01/02/2028 | Revised Proposed Date of Completion | | Litigations related to the project ? | Yes | ");
    assert.equal(c.promoterName, "Sri A Builder");
    assert.equal(c.proposedCompletion, "2028-02-01");
    assert.equal(c.revisedCompletion, null);
    assert.equal(c.litigation, true);
  });
  test("an order list with no links or an empty table yields nothing", () => {
    assert.deepEqual(parseOrderList("<table><tr><td>1</td><td>Order</td><td>01/01/2026</td></tr></table>", "COMPLAINT"), []);
    assert.deepEqual(parseOrderList("", "SUO_MOTU"), []);
  });
  test("backslash paths in links become proper URLs", () => {
    const rows = parseOrderList('<table><tr><td>1</td><td>Order Complaint No. 1</td><td>09/08/2023</td><td><a href="\\Uploads\\BU_1.pdf">View</a></td></tr></table>', "COMPLAINT");
    assert.equal(rows[0].documentUrl, "https://rera.telangana.gov.in/Uploads/BU_1.pdf");
  });
  test("suo motu titles without a name, and 'against'", () => {
    assert.equal(respondentFromTitle("Suo motu order in Case No. 318 of 2025"), null);
    assert.equal(respondentFromTitle("Orders against M/s. Sahithi Infratech Ventures"), "Sahithi Infratech Ventures");
  });
  test("a government body as respondent is still read as the respondent block", () => {
    const t = "Between\nA Buyer\n…Complainant\nVersus\nM/s. Good Homes Pvt Ltd, Rep by its MD\n…Respondent No.1\nORDER\nThe present complaint";
    assert.equal(respondentFromOrderText(t).respondent, "M/s. Good Homes Pvt Ltd");
  });
  test("a complainant block is never taken as the developer", () => {
    const t = "Between\nM/s. Buyer Welfare Association\n…Complainant\nVersus\nSri X\n…Respondent\nORDER";
    assert.notEqual(respondentFromOrderText(t).respondent, "M/s. Buyer Welfare Association");
  });
  test("a 'COMMON ORDER IN COMPLAINT NUMBERS' title above the parties doesn't end the header", () => {
    const t = "Quorum: A, Hon'ble Member\nCOMMON ORDER IN COMPLAINT NUMBERS 434/2025 and 465/2025.\nComplaint No. 434/2025\nA Buyer\n…Complainant\nVersus\nM/s Fortune Projects, Rep by\n1. A\n…Respondents\nComplaint No. 465/2025";
    assert.equal(respondentFromOrderText(t).respondent, "M/s Fortune Projects");
  });
  test("a role label at the end of the address line", () => {
    const t = "Rajitha J\nMiyapur Hyderabad - 500049 …Complainant\nVersus\nM/s. Vasavi Realtor LLP,\nRep by its Designated Partner,\nBanjara Hills, Hyderabad, Telangana – 500034. …Respondent\nThe present matter";
    assert.equal(respondentFromOrderText(t).respondent, "M/s. Vasavi Realtor LLP");
  });
  test("HTML character codes in list cells are decoded, so ';' inside '&#xD;' never splits a name", () => {
    const rows = parseOrderList('<table><tr><td>1</td><td>Suo Motu order</td><td>01/01/2026</td><td><a href="/Home/ShowPdf?pdffilename=a.pdf">v</a></td></tr></table>', "SUO_MOTU");
    assert.equal(rows.length, 1);
    const cells = parseOrderList('<table><tr><td>1</td><td>Order</td><td>02/02/2026</td><td>9</td><td>x</td><td>M/s Sree Vemuri Constructions&#xD;\n</td><td>Proj &#38; Co</td><td></td><td></td><td><a href="/Home/ShowPdf?pdffilename=b.pdf">v</a></td></tr></table>', "COMPLAINT");
    assert.equal(cells[0].respondent, "M/s Sree Vemuri Constructions");
    assert.equal(cells[0].projectName, "Proj & Co");
  });
  test("'…. Complainant' (ellipsis plus full stop) and a name followed by its quoted project", () => {
    const t = "Between\nSri A Buyer …. Complainant\nAND\nM/s Jayathri Infrastructures India Pvt Ltd.– “Jaya Platinum Project”, rep by Sri\nK.Srinivas …. Respondent\n2. COMPLAINT NO.1040";
    assert.equal(respondentFromOrderText(t).respondent, "M/s Jayathri Infrastructures India Pvt Ltd");
  });
  test("names are cut to just the organisation", () => {
    for (const [raw, want] of [
      ["Aaditri Housing Pvt Ltd, Pravritti Bhavan", "Aaditri Housing Pvt Ltd"],
      ["M/s Bharati Builders (Formerly Known as Sirisampada Estates & Builders)", "M/s Bharati Builders"],
      ["M/s Bharathi Builders Pvt Ltd project Bharathi’s Lake View Apartments", "M/s Bharathi Builders Pvt Ltd"],
      ["Googee Properties Managing Director", "Googee Properties"],
      ["1) Trendset Jayabheri Projects LLP, Ground floor, 4th Block", "Trendset Jayabheri Projects LLP"],
      ["M/s. Vasavi Infracon LLP", "M/s. Vasavi Infracon LLP"],
      ["M/s Good Homes, Pvt Ltd", "M/s Good Homes, Pvt Ltd"],
    ]) assert.equal(cleanOrgName(raw), want, raw);
  });
  test("private individuals are never stored as the respondent", () => {
    assert.equal(organisationIn(["Sri Guntupalli Srinivasrao", "(R/o Hyderabad)"]), null);
    assert.equal(organisationIn(["S/o A Kaspa Reddy"]), null);
    assert.equal(organisationIn(["Sri Venkateswara Constructions"]), "Sri Venkateswara Constructions");
    assert.equal(isOrganisation("SRI VYSHNAVI ABODE LLP"), true);
    assert.equal(isOrganisation("Sri Maddirala Rosi Reddy"), false);
  });
});
