// Serializers for Seller Mode. The single most important rule lives here:
// buyer phone/email are NEVER included in a seller-facing enquiry payload
// until an admin has released the contact (contactReleased === true).
// Enforced here, not in the UI — see serializer.test.ts.

import { gradeFor, type ListingGrade } from "./score";

export interface EnquiryRecord {
  id: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string | null;
  message: string | null;
  budgetLakh: number | null;
  status: string;
  contactReleased: boolean;
  sellerViewedAt: Date | null;
  sellerRespondedAt: Date | null;
  createdAt: Date;
  project?: { city?: string | null; corridor?: string | null } | null;
}

export interface SellerEnquiryDTO {
  id: string;
  buyerName: string;
  message: string | null;
  budgetLakh: number | null;
  city: string | null;
  status: string;
  contactReleased: boolean;
  createdAt: string;
  sellerViewedAt: string | null;
  sellerRespondedAt: string | null;
  // Present ONLY when contactReleased === true
  buyerPhone?: string;
  buyerEmail?: string | null;
}

/** Serialize an enquiry for the seller. Hides contact until released. */
export function serializeEnquiryForSeller(e: EnquiryRecord): SellerEnquiryDTO {
  const dto: SellerEnquiryDTO = {
    id: e.id,
    buyerName: e.buyerName,
    message: e.message,
    budgetLakh: e.budgetLakh,
    city: e.project?.city ?? null,
    status: e.status,
    contactReleased: e.contactReleased,
    createdAt: e.createdAt.toISOString(),
    sellerViewedAt: e.sellerViewedAt ? e.sellerViewedAt.toISOString() : null,
    sellerRespondedAt: e.sellerRespondedAt ? e.sellerRespondedAt.toISOString() : null,
  };
  if (e.contactReleased) {
    dto.buyerPhone = e.buyerPhone;
    dto.buyerEmail = e.buyerEmail;
  }
  return dto;
}

// ── Listing card serialization ──
export interface ListingCardSource {
  id: string;
  name: string;
  corridor: string;
  city: string;
  propertyType: string;
  minBudgetLakhs: number;
  maxBudgetLakhs: number;
  imageUrls: string[];
  listingSource: string;
  listingStatus: string;
  listingScore: number | null;
  totalPlots: number | null;
  availablePlots: number | null;
  approvalStatus: string | null;
  approvalVerified: boolean;
}

export interface PublicListingCardDTO {
  id: string;
  name: string;
  corridor: string;
  city: string;
  propertyType: string;
  minBudgetLakhs: number;
  maxBudgetLakhs: number;
  image: string | null;
  isVerifiedInventory: boolean; // ADMIN listings
  grade: ListingGrade; // public: A/B/C, never the raw number
  availablePlots: number | null;
  totalPlots: number | null;
  approvalStatus: string | null;
  approvalVerified: boolean;
}

/** Public-facing card — exposes a letter grade, never the raw score. */
export function serializeListingCardPublic(p: ListingCardSource): PublicListingCardDTO {
  return {
    id: p.id,
    name: p.name,
    corridor: p.corridor,
    city: p.city,
    propertyType: p.propertyType,
    minBudgetLakhs: p.minBudgetLakhs,
    maxBudgetLakhs: p.maxBudgetLakhs,
    image: p.imageUrls?.[0] ?? null,
    isVerifiedInventory: p.listingSource === "ADMIN",
    grade: p.listingScore != null ? gradeFor(p.listingScore) : null,
    availablePlots: p.availablePlots,
    totalPlots: p.totalPlots,
    approvalStatus: p.approvalStatus,
    approvalVerified: p.approvalVerified,
  };
}
