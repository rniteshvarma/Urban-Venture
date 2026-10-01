// Shared types for the Weekly Intelligence Report. The assembled `ReportContent`
// is the single source of truth: it is stored on WeeklyReport.content and
// rendered verbatim by the web page, the email, and the WhatsApp message.
// Generate once, render many (Constraint 4 — content is frozen at send time).

export type ReportItemType =
  | "MATCHED_PROPERTY"
  | "NEAR_MISS_PROPERTY"
  | "PRICE_DROP"
  | "NEW_LISTING"
  | "AREA_SCORE_MOVE"
  | "AREA_PRICE_MOVE"
  | "INFRA_MILESTONE"
  | "NEW_APPROVAL"
  | "MARKET_STAT"
  | "LEGAL_ALERT";

/** A preference snapshot the assembler reads (never the Prisma row directly). */
export interface PrefSnapshot {
  city: string;
  budgetMinLakh: number | null;
  budgetMaxLakh: number | null;
  areaSlugs: string[];
  propertyTypes: string[]; // ReportPropertyType enum values
  horizonYears: number | null;
}

/** An APPROVED Project reduced to what the report needs. */
export interface PropertyCand {
  id: string;
  name: string;
  corridorSlug: string | null;
  propertyType: string; // stored free-text
  priceLakh: number;
  rateValue: number | null; // ₹ per unit
  rateUnit: string | null;
  areaValue: number | null;
  areaUnit: string | null;
  listingScore: number | null;
  listingSource: "ADMIN" | "SELLER";
  approvalStatus: string | null;
  approvalVerified: boolean;
  mediaCount: number;
  thumb: string | null;
  createdAt: Date;
  /** model fair-value mid rate for its area, for the "% below model" line */
  fairValueMidRate: number | null;
}

/** A watched corridor's current state plus its value in the user's last report. */
export interface CorridorSnapshot {
  slug: string;
  name: string;
  overallScore: number | null;
  plotPriceMidSqYd: number | null;
  newListings: number;
  // baselines from the previous issue (null on first issue)
  prevScore: number | null;
  prevPriceMidSqYd: number | null;
}

export interface ApprovalCand {
  id: string;
  approvalNumber: string | null;
  approvalType: string;
  corridorSlug: string | null;
  corridorName: string | null;
  areaAcres: number | null;
  approvalDate: Date | null;
}

export interface InfraCand {
  id: string;
  projectShortName: string;
  category: string;
  title: string; // milestone title
  date: Date | null;
  description: string | null;
  affectedSlugs: string[];
  affectedNames: string[];
}

export interface LegalCand {
  id: string;
  title: string;
  severity: string;
  corridorSlug: string | null;
  corridorName: string | null;
}

export interface MarketPulseSnapshot {
  period: string;
  totalRegistrations: number | null;
  yoyGrowthPct: number | null;
  avgAskingPriceSqFt: number | null;
  source: string | null;
}

/** A prior ReportItem, for dedup lookups. */
export interface RecentItem {
  itemType: ReportItemType;
  entityId: string;
  entityHash: string;
  includedAt: Date;
}

/** Everything the pure ladder needs — gathered from the DB, then passed in. */
export interface GatheredData {
  pref: PrefSnapshot;
  approvedProperties: PropertyCand[];
  watchedAreas: CorridorSnapshot[];
  /** adjacency map slug → adjacent slugs; empty when adjacency data is absent */
  adjacency: Record<string, string[]>;
  /** corridors adjacent to watched ones, as extra candidates for L2 */
  adjacentProperties: PropertyCand[];
  newApprovals: ApprovalCand[];
  infraMilestones: InfraCand[];
  legalFlags: LegalCand[];
  marketPulse: MarketPulseSnapshot | null;
  topMovers: CorridorSnapshot[]; // statewide, for L4
  recentItems: RecentItem[];
}

// ── Assembled content (stored & rendered) ──
export interface ReportItemOut {
  itemType: ReportItemType;
  entityId: string;
  entityHash: string;
  section: string;
  position: number;
}

export interface MatchedPropertyView {
  id: string;
  title: string;
  corridorName: string | null;
  priceLakh: number;
  rateValue: number | null;
  rateUnit: string | null;
  grade: string | null;
  belowModelPct: number | null; // negative = below model (cheaper)
  approvalLabel: string | null;
  availabilityLabel: string | null;
  thumb: string | null;
  whyMatched: string[];
  url: string;
  /** honest label for relaxed matches (near-miss only) */
  relaxedLabel?: string;
}

export interface AreaView {
  slug: string;
  name: string;
  score: number | null;
  scoreDelta: number | null;
  priceMidSqYd: number | null;
  pricePct: number | null;
  newListings: number;
  spark: number[]; // small series for an inline sparkline
}

export interface TopThreeItem {
  type: ReportItemType;
  title: string;
  subtitle: string;
  value: string;
}

export interface ReportContent {
  meta: {
    budgetMinLakh: number | null;
    budgetMaxLakh: number | null;
    propertyTypes: string[];
    areaNames: string[];
    city: string;
  };
  thisWeek: { rank: number; text: string }[];
  matched: MatchedPropertyView[];
  nearMisses: MatchedPropertyView[];
  areas: AreaView[];
  infrastructure: {
    id: string;
    icon: string;
    title: string;
    meta: string;
    affects: string[];
    read: string | null;
    url: string;
  }[];
  approvals: { id: string; label: string; corridorName: string | null; areaAcres: number | null; date: string | null }[];
  legal: { id: string; title: string; corridorName: string | null; severity: string }[];
  marketPulse: MarketPulseSnapshot | null;
}

export interface AssembledReport {
  content: ReportContent;
  items: ReportItemOut[];
  topThree: TopThreeItem[];
  itemCount: number;
  usedFallback: boolean;
  fallbackLevel: number; // 1–4, deepest level reached
}
