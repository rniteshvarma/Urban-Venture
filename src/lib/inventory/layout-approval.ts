/**
 * What we can say about a plot's layout approval, and where it comes from.
 *
 *   RERA            the project is registered with TG-RERA; registering a
 *                   plotted project requires filing the layout plan approved
 *                   by the competent authority (RERA Act, s.4(2)), so an
 *                   approved layout is on file with TG-RERA
 *   SELLER_STATED   a land marketplace listing where the seller says the
 *                   layout is approved (and may give an LP number) — not
 *                   verified by us
 *   UNKNOWN         nothing on record
 *
 * Pure: tested in layout-approval.test.ts.
 */
export type LayoutLevel = "RERA" | "SELLER_STATED" | "UNKNOWN";

export function layoutApprovalStatus(i: { reraNumbers: string[]; approvals: string[]; isLandListing: boolean }): { level: LayoutLevel; label: string; explain: string; details: string[] } {
  const authorities = i.approvals.filter((a) => /\b(HMDA|DTCP|GHMC|TSIIC|TGIIC|panchayat|municipal)/i.test(a) && !/seller-stated/i.test(a));
  const sellerSaid = i.approvals.filter((a) => /seller-stated|LP number|LRS/i.test(a));
  if (!i.isLandListing && i.reraNumbers.length) {
    return {
      level: "RERA",
      label: "Approved layout on file with TG-RERA",
      explain: `This project is registered with TG-RERA (${i.reraNumbers.join(", ")}). To register a plotted project, the developer has to file the layout plan approved by HMDA, DTCP or the local authority, so an approved layout is on file. We haven't seen the LP number itself.`,
      details: authorities.length ? [`Approvals listed by our source: ${authorities.join(", ")}`] : [],
    };
  }
  if (sellerSaid.length) {
    return {
      level: "SELLER_STATED",
      label: "Seller says approved — not verified",
      explain: "This is an individual plot listing. The seller states the details below on the listing; we haven't verified them, and the plot isn't covered by RERA.",
      details: sellerSaid,
    };
  }
  return {
    level: "UNKNOWN",
    label: "Approval not on record",
    explain: i.isLandListing
      ? "The listing doesn't state a layout approval. Unapproved layouts can't get building permission and may face registration problems."
      : "We don't have this layout's approval details.",
    details: authorities.length ? [`Approvals listed by our source: ${authorities.join(", ")}`] : [],
  };
}
