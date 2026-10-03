/**
 * City-level market figures the corridor numbers are calibrated against.
 * Every figure here was checked against its published source (link + date) —
 * add new ones the same way, never from memory or a model's guess.
 *
 * Corridor-level prices are NOT here: they're measured from our own listings
 * (rates.ts). These anchors set the forecast's growth rates and the city
 * context shown alongside.
 */

export interface SourcedFigure {
  value: number;
  unit: string;
  /** What period the figure describes */
  period: string;
  source: string;
  url: string;
  /** Publication date (ISO) */
  published: string;
  note?: string;
}

const KF_H1_2026 = "https://telanganatoday.com/hyderabad-housing-market-holds-steady-in-h1-2026-gccs-drive-record-office-leasing";
const KF_JUL_2026 = "https://telanganatoday.com/hyderabad-housing-market-enters-stable-phase-in-july-knight-frank-india";
const ANAROCK_2026 = "https://www.businesstoday.in/personal-finance/real-estate/story/top-housing-markets-deliver-up-to-125-price-appreciation-rental-yields-rise-by-100-bps-anarock-547053-2026-08-04";
const RBI_HPI = "https://website.rbi.org.in/web/rbi/-/press-releases/all-india-house-price-index-for-q3-2025-26";
const HMDA_NEOPOLIS_2025 = "https://thesouthfirst.com/news/hyderabads-kokapet-emerges-as-realty-goldmine-hmda-rakes-in-rs-3708-crore-from-neopolis-land-auctions";

export const CITY = {
  /** Average apartment price, H1 2026 */
  avgPriceSqFt: { value: 8258, unit: "₹/sq.ft", period: "H1 2026", source: "Knight Frank India", url: KF_H1_2026, published: "2026-07-09", note: "Up 7% year on year" },
  priceGrowthYoY: { value: 7, unit: "% a year", period: "H1 2026 vs H1 2025", source: "Knight Frank India", url: KF_H1_2026, published: "2026-07-09" },
  salesUnits: { value: 19249, unit: "homes sold", period: "H1 2026", source: "Knight Frank India", url: KF_H1_2026, published: "2026-07-09", note: "Up 1% year on year" },
  launchUnits: { value: 20466, unit: "homes launched", period: "H1 2026", source: "Knight Frank India", url: KF_H1_2026, published: "2026-07-09", note: "Down 2% year on year" },
  officeLeasingMSqFt: { value: 7.5, unit: "mn sq.ft leased", period: "H1 2026", source: "Knight Frank India", url: KF_H1_2026, published: "2026-07-09", note: "Up 29% year on year; GCCs took 3.4 mn sq.ft (45%)" },
  registrationsValueCr: { value: 30847, unit: "₹ Cr registered", period: "Jan–Jul 2026", source: "Knight Frank India (Telangana registration data)", url: KF_JUL_2026, published: "2026-08-19", note: "Up 6% year on year" },
  gccShareOfLeasing: { value: 45, unit: "% of office leasing", period: "H1 2026", source: "Knight Frank India", url: KF_H1_2026, published: "2026-07-09", note: "3.4 mn sq.ft taken by GCCs" },
  registrationsYtd: { value: 44158, unit: "homes registered", period: "Jan–Jul 2026", source: "Knight Frank India (Telangana registration data)", url: KF_JUL_2026, published: "2026-08-19", note: "₹30,847 Cr, up 4% in units and 6% in value" },
  price2019SqFt: { value: 4195, unit: "₹/sq.ft", period: "2019", source: "ANAROCK Research", url: ANAROCK_2026, published: "2026-08-04" },
  priceQ2_2026SqFt: { value: 8090, unit: "₹/sq.ft", period: "Q2 2026", source: "ANAROCK Research", url: ANAROCK_2026, published: "2026-08-04", note: "Up 93% since 2019" },
  rentalYield: { value: 3.6, unit: "% a year", period: "Q2 2026", source: "ANAROCK Research", url: ANAROCK_2026, published: "2026-08-04", note: "Up from 2.6% in 2019" },
  /** All-India house price index — the national, registration-based floor for "normal" growth */
  rbiAllIndiaHpiYoY: { value: 3.6, unit: "% a year", period: "Q3 2025-26", source: "Reserve Bank of India — House Price Index", url: RBI_HPI, published: "2026-02-25", note: "18 cities including Hyderabad; 6.9% a year earlier" },
} satisfies Record<string, SourcedFigure>;

/** Hyderabad's 2019 → Q2 2026 apartment price growth, as a yearly rate (~7 years). */
export const CITY_LONG_RUN_CAGR = Math.round((Math.pow(CITY.priceQ2_2026SqFt.value / CITY.price2019SqFt.value, 1 / 7) - 1) * 1000) / 10;

/** Sourced land-price evidence for areas where plotted listings don't exist. */
export const LAND_EVIDENCE: Record<string, SourcedFigure[]> = {
  "kokapet-neopolis": [
    { value: 137.36, unit: "₹ Cr per acre (average)", period: "Nov–Dec 2025", source: "HMDA Neopolis land auction, 27 acres", url: HMDA_NEOPOLIS_2025, published: "2025-12-05", note: "Bulk land for high-rise development (₹118–151 Cr/acre); 2023's auction averaged about ₹73 Cr/acre" },
  ],
};

export const ANCHOR_SOURCES = [
  { label: "Knight Frank India — Hyderabad H1 2026", url: KF_H1_2026 },
  { label: "Knight Frank India — Hyderabad registrations, July 2026", url: KF_JUL_2026 },
  { label: "ANAROCK Research — price appreciation since 2019", url: ANAROCK_2026 },
  { label: "Reserve Bank of India — All-India House Price Index", url: RBI_HPI },
];
