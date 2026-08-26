import { test } from "node:test";
import assert from "node:assert/strict";
import { serializeEnquiryForSeller, serializeListingCardPublic, type EnquiryRecord, type ListingCardSource } from "./serializer";

function enquiry(over: Partial<EnquiryRecord> = {}): EnquiryRecord {
  return {
    id: "enq1",
    buyerName: "Ramesh K",
    buyerPhone: "+91 98765 43210",
    buyerEmail: "ramesh@example.com",
    message: "Is the plot corner facing?",
    budgetLakh: 80,
    status: "NEW",
    contactReleased: false,
    sellerViewedAt: null,
    sellerRespondedAt: null,
    createdAt: new Date("2026-08-24T00:00:00Z"),
    project: { city: "Hyderabad", corridor: "Kadthal" },
    ...over,
  };
}

test("unreleased enquiry response contains NO buyer phone or email", () => {
  const dto = serializeEnquiryForSeller(enquiry({ contactReleased: false }));
  const json = JSON.stringify(dto);
  assert.equal(dto.buyerPhone, undefined);
  assert.equal(dto.buyerEmail, undefined);
  assert.ok(!json.includes("98765"), "serialized payload must not leak the phone");
  assert.ok(!json.includes("ramesh@example.com"), "serialized payload must not leak the email");
  // but the seller still sees the useful, non-PII fields
  assert.equal(dto.budgetLakh, 80);
  assert.equal(dto.city, "Hyderabad");
  assert.equal(dto.buyerName, "Ramesh K");
});

test("released enquiry response includes phone and email", () => {
  const dto = serializeEnquiryForSeller(enquiry({ contactReleased: true }));
  assert.equal(dto.buyerPhone, "+91 98765 43210");
  assert.equal(dto.buyerEmail, "ramesh@example.com");
});

function card(over: Partial<ListingCardSource> = {}): ListingCardSource {
  return {
    id: "p1",
    name: "267 sq.yd Plot",
    corridor: "Kadthal",
    city: "Hyderabad",
    propertyType: "Plots",
    minBudgetLakhs: 82,
    maxBudgetLakhs: 83,
    imageUrls: ["https://img/1.jpg"],
    listingSource: "SELLER",
    listingStatus: "APPROVED",
    listingScore: 72,
    totalPlots: 48,
    availablePlots: 31,
    approvalStatus: "HMDA_APPROVED",
    approvalVerified: true,
    ...over,
  };
}

test("public card exposes a letter grade, never the raw score", () => {
  const dto = serializeListingCardPublic(card({ listingScore: 72 }));
  assert.equal(dto.grade, "B");
  assert.ok(!("listingScore" in dto), "raw score must not be in the public card");
  assert.equal((dto as unknown as Record<string, unknown>).listingScore, undefined);
});

test("public card flags ADMIN listings as verified inventory", () => {
  assert.equal(serializeListingCardPublic(card({ listingSource: "ADMIN" })).isVerifiedInventory, true);
  assert.equal(serializeListingCardPublic(card({ listingSource: "SELLER" })).isVerifiedInventory, false);
});
