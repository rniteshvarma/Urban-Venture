/**
 * What a purchase in Telangana costs on top of the price, and the loan EMI.
 *
 * Stamp duty, transfer duty and registration fee (sale deeds):
 *   municipal areas   5.5% stamp + 1.5% transfer + 0.5% registration = 7.5%
 *   gram panchayat    5.5% stamp + 2% registration                    = 7.5%
 *   — G.O.Ms.No.59 (20 Jul 2021) raised the total from 6% to 7.5%; the
 *   registration fee table is the Registration Dept notification of 2 Sep 2021.
 *   Duty is charged on the higher of the price and the government guidance value.
 * GST (GST Council, 34th meeting, from 1 Apr 2019):
 *   under-construction homes 5%; "affordable" ones (≤ ₹45 lakh and carpet
 *   ≤ 60 sq.m in Hyderabad) 1%; completed homes with a completion/occupancy
 *   certificate, plots and land: none. Commercial rates differ — not computed.
 * Pure: tested in buyer.test.ts.
 */
export type PurchaseKind = "apartment" | "villa" | "plot" | "land" | "commercial";

export const DUTY = {
  stampPct: 5.5,
  transferPct: 1.5,
  registrationPct: 0.5,
  gramPanchayatRegistrationPct: 2,
  source: "Telangana Registration & Stamps Dept — G.O.Ms.No.59 (2021) and Table of Fees (2 Sep 2021)",
} as const;

export const GST = { underConstructionPct: 5, affordablePct: 1, affordableMaxLakh: 45, affordableMaxCarpetSqm: 60, source: "GST Council, 34th meeting (rates from 1 Apr 2019)" } as const;

export interface CostInput {
  priceLakh: number;
  kind: PurchaseKind;
  underConstruction: boolean;
  /** Carpet area in sq.m, for the affordable-housing GST test; unknown → treated as not affordable */
  carpetSqm?: number | null;
  /** Property in a gram panchayat (registration 2%, no transfer duty) */
  gramPanchayat?: boolean;
  /** Government guidance value, if higher than the price, in lakh */
  guidanceLakh?: number | null;
}

export interface CostBreakdown {
  dutiableLakh: number;
  stampDutyLakh: number;
  transferDutyLakh: number;
  registrationLakh: number;
  /** null when it can't be worked out (commercial) */
  gstLakh: number | null;
  gstPct: number | null;
  gstNote: string;
  totalLakh: number;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

export function purchaseCosts(i: CostInput): CostBreakdown {
  const dutiable = Math.max(i.priceLakh, i.guidanceLakh ?? 0);
  const stamp = (dutiable * DUTY.stampPct) / 100;
  const transfer = i.gramPanchayat ? 0 : (dutiable * DUTY.transferPct) / 100;
  const registration = (dutiable * (i.gramPanchayat ? DUTY.gramPanchayatRegistrationPct : DUTY.registrationPct)) / 100;
  let gstPct: number | null = 0;
  let gstNote = "No GST on a completed home with its completion certificate.";
  if (i.kind === "plot" || i.kind === "land") gstNote = "No GST on plots or land.";
  else if (i.kind === "commercial") {
    gstPct = null;
    gstNote = "GST on commercial property depends on the deal — ask the developer.";
  } else if (i.underConstruction) {
    const affordable = i.priceLakh <= GST.affordableMaxLakh && i.carpetSqm != null && i.carpetSqm <= GST.affordableMaxCarpetSqm;
    gstPct = affordable ? GST.affordablePct : GST.underConstructionPct;
    gstNote = affordable ? "1% GST: an affordable home (≤ ₹45 L, carpet ≤ 60 sq.m)." : "5% GST on an under-construction home.";
  }
  const gst = gstPct == null ? null : (i.priceLakh * gstPct) / 100;
  return {
    dutiableLakh: r2(dutiable),
    stampDutyLakh: r2(stamp),
    transferDutyLakh: r2(transfer),
    registrationLakh: r2(registration),
    gstLakh: gst == null ? null : r2(gst),
    gstPct,
    gstNote,
    totalLakh: r2(i.priceLakh + stamp + transfer + registration + (gst ?? 0)),
  };
}

/** Monthly EMI in rupees for a loan in lakh at an annual rate (%) over years. */
export function emi(loanLakh: number, annualRatePct: number, years: number): number {
  const p = loanLakh * 100_000;
  const n = Math.round(years * 12);
  if (p <= 0 || n <= 0) return 0;
  const r = annualRatePct / 1200;
  if (r === 0) return Math.round(p / n);
  return Math.round((p * r * (1 + r) ** n) / ((1 + r) ** n - 1));
}

/** The purchase kind for a project's type label. */
export function kindOf(propertyType: string, listingKind?: string | null): PurchaseKind {
  const t = propertyType.toLowerCase();
  if (listingKind === "LAND_LISTING") return t.includes("plot") ? "plot" : "land";
  if (t.includes("plot")) return "plot";
  if (t.includes("land")) return "land";
  if (t.includes("villa")) return "villa";
  if (t.includes("commercial")) return "commercial";
  return "apartment";
}
