// ═══════════════════════════════════════════════════════════════════
// LISTING SCORE (0–100) — Seller Mode
//
// Five components: Location 30 · Price 25 · Quality 20 · Trust 15 · Fresh 10.
// The scorer READS existing scores (LandIQ village score / CorridorProfile
// overallScore) and the existing fair-value data — it computes no new
// location or price intelligence of its own.
//
// Rule: never fabricate a component. When the underlying data is missing we
// use the neutral value and mark the component `confidence: 'LOW'`, so the UI
// can say "provisional" instead of implying false precision.
//
// The pure functions here are fully unit-tested (score.test.ts). The async
// `scoreAndPersist` at the bottom is the only DB-touching entry point.
// ═══════════════════════════════════════════════════════════════════

export type Confidence = "HIGH" | "LOW";

export interface ScoreComponent {
  /** integer points awarded */
  points: number;
  /** maximum points for this component */
  max: number;
  confidence: Confidence;
  /** short human explanation, shown to the seller / admin */
  note?: string;
}

export interface ListingScoreBreakdown {
  location: ScoreComponent;
  price: ScoreComponent;
  quality: ScoreComponent;
  trust: ScoreComponent;
  freshness: ScoreComponent;
  total: number; // rounded, clamped 0–100 = sum of the five integer components
}

export interface ListingScoreInput {
  // ── Location ──
  /** LandIQ village score 0–100, preferred when present */
  villageLandIQScore?: number | null;
  /** CorridorProfile.overallScore 0–100, fallback */
  corridorOverallScore?: number | null;

  // ── Price ──
  askingRatePerSqYd?: number | null;
  /** model fair-value p50 (mid) rate for the village/corridor */
  fairValueP50PerSqYd?: number | null;

  // ── Quality ──
  photoCount: number;
  hasLayoutOrFloorPlan: boolean;
  descriptionLength: number;
  descriptionIsBoilerplate: boolean;
  requiredFieldsComplete: boolean;
  hasPlotDimensions: boolean;
  hasVideo: boolean;

  // ── Trust ──
  approvalVerified: boolean;
  ownershipDocApproved: boolean;
  /** RERA verified, OR correctly marked not-required */
  reraVerifiedOrNotRequired: boolean;
  sellerVerified: boolean;

  // ── Freshness ──
  lastRefreshedAt?: Date | null;
  respondedEnquiries: number;
  totalEnquiries: number;
  lastEditedAt?: Date | null;

  /** injectable clock for tests */
  now?: Date;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const daysBetween = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) / 86_400_000;

// ── LOCATION — 30 pts ────────────────────────────────────────────────
export function locationComponent(i: ListingScoreInput): ScoreComponent {
  const base = i.villageLandIQScore ?? i.corridorOverallScore ?? null;
  if (base == null) {
    return {
      points: 15,
      max: 30,
      confidence: "LOW",
      note: "Location score is provisional — we're still building data for this village.",
    };
  }
  const points = Math.round((clamp(base, 0, 100) / 100) * 30);
  const source = i.villageLandIQScore != null ? "village LandIQ score" : "corridor score";
  return { points, max: 30, confidence: "HIGH", note: `Based on the ${source} (${Math.round(base)}/100).` };
}

// ── PRICE — 25 pts ───────────────────────────────────────────────────
export function priceComponent(i: ListingScoreInput): ScoreComponent {
  if (i.askingRatePerSqYd == null || i.fairValueP50PerSqYd == null || i.fairValueP50PerSqYd <= 0) {
    return {
      points: 15,
      max: 25,
      confidence: "LOW",
      note: "No model price for this village yet — price score is provisional.",
    };
  }
  const gap = (i.askingRatePerSqYd - i.fairValueP50PerSqYd) / i.fairValueP50PerSqYd;
  let points: number;
  if (gap <= 0.05) points = 25;
  else if (gap <= 0.2) points = 18;
  else if (gap <= 0.4) points = 10;
  else points = 3;
  const pct = Math.round(gap * 100);
  const note =
    gap <= 0.05
      ? "Priced at or below the model range — attractive to buyers."
      : `Priced ${pct}% above the model range for this village.`;
  return { points, max: 25, confidence: "HIGH", note };
}

// ── QUALITY — 20 pts ─────────────────────────────────────────────────
export function qualityComponent(i: ListingScoreInput): ScoreComponent {
  let p = 0;
  // photos: 5→3, 8→5, 12+→6
  if (i.photoCount >= 12) p += 6;
  else if (i.photoCount >= 8) p += 5;
  else if (i.photoCount >= 5) p += 3;
  if (i.hasLayoutOrFloorPlan) p += 4;
  if (i.descriptionLength >= 200 && !i.descriptionIsBoilerplate) p += 3;
  if (i.requiredFieldsComplete) p += 3;
  if (i.hasPlotDimensions) p += 2;
  if (i.hasVideo) p += 2;
  return { points: clamp(p, 0, 20), max: 20, confidence: "HIGH" };
}

// ── TRUST — 15 pts ───────────────────────────────────────────────────
export function trustComponent(i: ListingScoreInput): ScoreComponent {
  let p = 0;
  if (i.approvalVerified) p += 6;
  if (i.ownershipDocApproved) p += 4;
  if (i.reraVerifiedOrNotRequired) p += 3;
  if (i.sellerVerified) p += 2;
  return { points: clamp(p, 0, 15), max: 15, confidence: "HIGH" };
}

// ── FRESHNESS — 10 pts ───────────────────────────────────────────────
export function freshnessComponent(i: ListingScoreInput): ScoreComponent {
  const now = i.now ?? new Date();
  let p = 0;
  // refreshed within 14 days → 4, decaying linearly to 0 at 60 days
  if (i.lastRefreshedAt) {
    const d = daysBetween(now, i.lastRefreshedAt);
    if (d <= 14) p += 4;
    else if (d < 60) p += 4 * ((60 - d) / (60 - 14));
  }
  // seller response rate
  if (i.totalEnquiries > 0) {
    p += 3 * clamp(i.respondedEnquiries / i.totalEnquiries, 0, 1);
  }
  // edited within 30 days
  if (i.lastEditedAt && daysBetween(now, i.lastEditedAt) <= 30) p += 3;
  return { points: Math.round(clamp(p, 0, 10)), max: 10, confidence: "HIGH" };
}

// ── Composite ────────────────────────────────────────────────────────
export function computeListingScore(i: ListingScoreInput): ListingScoreBreakdown {
  const location = locationComponent(i);
  const price = priceComponent(i);
  const quality = qualityComponent(i);
  const trust = trustComponent(i);
  const freshness = freshnessComponent(i);
  const total = clamp(
    location.points + price.points + quality.points + trust.points + freshness.points,
    0,
    100,
  );
  return { location, price, quality, trust, freshness, total };
}

// ── Public letter grade (A/B/C) — never expose the raw number publicly ──
export type ListingGrade = "A" | "B" | "C" | null;
export function gradeFor(total: number): ListingGrade {
  if (total >= 80) return "A";
  if (total >= 65) return "B";
  if (total >= 50) return "C";
  return null; // below 50 — excluded from default sort, no public grade
}

/** Minimum composite for a seller listing to appear in the default public sort. */
export const PUBLIC_MIN_SCORE = 40;

// ── Seller-facing improvement list ───────────────────────────────────
export interface Improvement {
  key: string;
  /** points the seller could still gain */
  points: number;
  label: string;
  /** where to send them */
  action: string;
  href?: string;
}

/**
 * Concrete, actionable gaps sorted by points available. Honest version of
 * "64/99 have uploaded more than 6 images" — tells the seller exactly what to
 * do and what it is worth. Never gated behind a paid plan.
 */
export function deriveImprovements(i: ListingScoreInput, b: ListingScoreBreakdown): Improvement[] {
  const out: Improvement[] = [];

  // Price — usually the single biggest lever
  if (i.askingRatePerSqYd != null && i.fairValueP50PerSqYd != null && i.fairValueP50PerSqYd > 0) {
    const gain = 25 - b.price.points;
    if (gain > 0) {
      const target = Math.round(i.fairValueP50PerSqYd * 1.05);
      out.push({
        key: "price",
        points: gain,
        label: `Reduce price to ₹${target.toLocaleString("en-IN")}/sq.yd or below`,
        action: "Edit price",
        href: "?step=3",
      });
    }
  }

  // Photos
  if (i.photoCount < 12) {
    const nextTier = i.photoCount < 5 ? 5 : i.photoCount < 8 ? 8 : 12;
    const gain = i.photoCount < 5 ? 3 : i.photoCount < 8 ? 2 : 1;
    out.push({
      key: "photos",
      points: gain,
      label: `Add ${nextTier - i.photoCount} more photo${nextTier - i.photoCount > 1 ? "s" : ""} (you have ${i.photoCount})`,
      action: "Add photos",
      href: "?step=4",
    });
  }

  if (!i.hasLayoutOrFloorPlan) {
    out.push({ key: "layout", points: 4, label: "Add a layout / floor plan", action: "Upload plan", href: "?step=4" });
  }

  // Trust
  if (!i.ownershipDocApproved) {
    out.push({ key: "ownership", points: 4, label: "Upload your sale deed for verification", action: "Upload", href: "?step=4" });
  }
  if (!i.approvalVerified) {
    out.push({ key: "approval", points: 6, label: "Provide a verifiable approval number", action: "Edit approval", href: "?step=2" });
  }
  if (!i.reraVerifiedOrNotRequired) {
    out.push({ key: "rera", points: 3, label: "Add your RERA number (or confirm it's not required)", action: "Edit details", href: "?step=2" });
  }

  // Quality — smaller wins
  if (!i.hasPlotDimensions) {
    out.push({ key: "dimensions", points: 2, label: "Add plot dimensions", action: "Edit details", href: "?step=2" });
  }
  if (i.descriptionLength < 200 || i.descriptionIsBoilerplate) {
    out.push({ key: "description", points: 3, label: "Write a fuller, specific description (200+ characters)", action: "Edit description", href: "?step=3" });
  }
  if (!i.hasVideo) {
    out.push({ key: "video", points: 2, label: "Add a short site video", action: "Add video", href: "?step=4" });
  }

  return out.filter((x) => x.points > 0).sort((a, z) => z.points - a.points);
}
