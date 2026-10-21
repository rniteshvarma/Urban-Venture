import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { layoutApprovalStatus } from "./layout-approval";

describe("layout approval status", () => {
  test("RERA-registered plotted projects have an approved layout on file", () => {
    const s = layoutApprovalStatus({ reraNumbers: ["P02400001234"], approvals: ["HMDA"], isLandListing: false });
    assert.equal(s.level, "RERA");
    assert.match(s.explain, /P02400001234/);
    assert.deepEqual(s.details, ["Approvals listed by our source: HMDA"]);
  });
  test("a seller's own statements are labelled as unverified", () => {
    const s = layoutApprovalStatus({ reraNumbers: [], approvals: ["Seller-stated layout: approved", "LP number 12/2019"], isLandListing: true });
    assert.equal(s.level, "SELLER_STATED");
    assert.match(s.label, /not verified/);
  });
  test("nothing on record says so", () => {
    assert.equal(layoutApprovalStatus({ reraNumbers: [], approvals: [], isLandListing: true }).level, "UNKNOWN");
    // A land listing with a RERA-looking number is still a land listing.
    assert.equal(layoutApprovalStatus({ reraNumbers: ["P02400001234"], approvals: [], isLandListing: true }).level, "UNKNOWN");
  });
});
