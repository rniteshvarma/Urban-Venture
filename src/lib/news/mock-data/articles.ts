/**
 * Mock news dataset (News module spec, Part 3). Fictional publications only
 * (*.example domains) so no accidental outbound requests and no misattribution.
 * `minutesAgo` is resolved to a rolling `publishedAt` at read time so the feed
 * always looks fresh and the relative-time UI is genuinely exercised.
 *
 * These carry pre-computed enrichment (category/sentiment/impact/analysis/
 * entities) because in mock mode the AI enrichment step is skipped.
 */

import type { NewsCategory, NewsSentiment } from '@prisma/client';

export interface MockArticle {
  id: string;
  headline: string;
  sourceName: string;
  sourceDomain: string;
  canonicalUrl: string;
  minutesAgo: number;
  cityScope: string;
  stateScope?: string;
  blurb?: string;
  category: NewsCategory;
  sentiment: NewsSentiment;
  impactScore: number;
  corridorSlugs: string[];
  infraProjectIds?: string[];
  authorities?: string[];
  goReferences?: string[];
  ourAnalysis: string;
  /** Hard-case flag: seeded already-suppressed so we can verify it never surfaces. */
  suppressed?: boolean;
}

export const MOCK_ARTICLES: MockArticle[] = [
  // ── Hyderabad ──────────────────────────────────────────────────────────────
  {
    id: 'mock-hyd-001',
    headline: 'RRR North package three tender awarded, construction to begin next quarter',
    sourceName: 'Telangana Infra Review',
    sourceDomain: 'telanganainfrareview.example',
    canonicalUrl: 'https://telanganainfrareview.example/rrr-north-package-three-tender',
    minutesAgo: 42,
    cityScope: 'hyderabad',
    stateScope: 'TG',
    blurb: 'The contract for the Sangareddy to Toopran stretch has been finalised under the hybrid annuity model.',
    category: 'INFRASTRUCTURE',
    sentiment: 'POSITIVE',
    impactScore: 9,
    corridorSlugs: ['sangareddy-industrial', 'medchal-dundigal', 'shankarpally-mokila'],
    infraProjectIds: ['rrr-north'],
    authorities: ['NHAI'],
    ourAnalysis:
      'Movement from tender to execution compresses the timeline for villages in the five-kilometre catchment. On comparable ring-road projects the sharpest land price movement has historically occurred between tender award and completion, not after opening.',
  },
  {
    // near-duplicate of mock-hyd-001, different outlet → dedupe should collapse
    id: 'mock-hyd-001b',
    headline: 'Package three of RRR North awarded; work on Sangareddy–Toopran stretch to start next quarter',
    sourceName: 'Metro Corridor Monitor',
    sourceDomain: 'metrocorridormonitor.example',
    canonicalUrl: 'https://metrocorridormonitor.example/rrr-north-pkg3-awarded',
    minutesAgo: 55,
    cityScope: 'hyderabad',
    stateScope: 'TG',
    category: 'INFRASTRUCTURE',
    sentiment: 'POSITIVE',
    impactScore: 8,
    corridorSlugs: ['sangareddy-industrial', 'medchal-dundigal'],
    infraProjectIds: ['rrr-north'],
    authorities: ['NHAI'],
    ourAnalysis:
      'The same award reported by multiple outlets tends to precede a visible uptick in enquiry volume. Buyers should distinguish the confirmed alignment from speculative frontage claims that typically follow such announcements.',
  },
  {
    id: 'mock-hyd-002',
    headline: 'HMDA clears 14 new layout applications across Shadnagar and Kothur mandals',
    sourceName: 'Deccan Land Report',
    sourceDomain: 'deccanlandreport.example',
    canonicalUrl: 'https://deccanlandreport.example/hmda-14-layouts-shadnagar-kothur',
    minutesAgo: 180,
    cityScope: 'hyderabad',
    stateScope: 'TG',
    category: 'POLICY_REGULATION',
    sentiment: 'POSITIVE',
    impactScore: 7,
    corridorSlugs: ['shadnagar'],
    authorities: ['HMDA'],
    ourAnalysis:
      'Approved layouts increase the supply of legally clean inventory in a corridor where title risk has been the main constraint on institutional buyers. Expect the price gap between approved and unapproved plots here to widen rather than narrow.',
  },
  {
    id: 'mock-hyd-003',
    headline: 'Pharma City land allotment resumes after environmental clearance revision',
    sourceName: 'Urban Growth Journal',
    sourceDomain: 'urbangrowthjournal.example',
    canonicalUrl: 'https://urbangrowthjournal.example/pharma-city-allotment-resumes',
    minutesAgo: 240,
    cityScope: 'hyderabad',
    stateScope: 'TG',
    blurb: 'Allotments to formulation units restart following the revised clearance conditions notified last week.',
    category: 'INDUSTRIAL_JOBS',
    sentiment: 'POSITIVE',
    impactScore: 8,
    corridorSlugs: ['maheshwaram-pharma-city', 'kadthal-fcda'],
    infraProjectIds: ['pharma-city'],
    authorities: ['TSIIC'],
    ourAnalysis:
      'Restarted allotments convert a stalled employment anchor back into an active demand driver for surrounding residential land. The revised clearance also lowers the tail risk that had been discouraging longer-horizon buyers in this pocket.',
  },
  {
    id: 'mock-hyd-004',
    headline: 'Registration volumes in western corridor rise 18% quarter on quarter',
    sourceName: 'Realty Signal India',
    sourceDomain: 'realtysignalindia.example',
    canonicalUrl: 'https://realtysignalindia.example/western-corridor-registrations-q3',
    minutesAgo: 95,
    cityScope: 'hyderabad',
    stateScope: 'TG',
    category: 'MARKET_PRICES',
    sentiment: 'POSITIVE',
    impactScore: 7,
    corridorSlugs: ['kokapet-neopolis', 'shankarpally-mokila'],
    authorities: [],
    ourAnalysis:
      'Rising registration counts signal genuine liquidity rather than quoted-price optimism, which matters more for exit certainty than headline appreciation. Sustained volume is the clearer buy-signal here; a single strong quarter can reflect a few large layout releases.',
  },
  {
    id: 'mock-hyd-005',
    headline: 'Kokapet luxury plot auction sees record per-square-yard bids',
    sourceName: 'Peninsula Business Post',
    sourceDomain: 'peninsulabusinesspost.example',
    canonicalUrl: 'https://peninsulabusinesspost.example/kokapet-auction-record-bids',
    minutesAgo: 310,
    cityScope: 'hyderabad',
    stateScope: 'TG',
    category: 'MARKET_PRICES',
    sentiment: 'MIXED',
    impactScore: 6,
    corridorSlugs: ['kokapet-neopolis'],
    ourAnalysis:
      'Record institutional bids set a visible ceiling but rarely translate to retail plot values in the same ratio. Treat the print as a sentiment marker for the micro-market, not a comparable for smaller parcels nearby.',
  },
  {
    id: 'mock-hyd-006',
    headline: 'Airport metro extension civil work crosses forty percent completion',
    sourceName: 'Metro Corridor Monitor',
    sourceDomain: 'metrocorridormonitor.example',
    canonicalUrl: 'https://metrocorridormonitor.example/airport-metro-40pc',
    minutesAgo: 500,
    cityScope: 'hyderabad',
    stateScope: 'TG',
    category: 'INFRASTRUCTURE',
    sentiment: 'POSITIVE',
    impactScore: 8,
    corridorSlugs: ['tukkuguda-shamshabad', 'adibatla'],
    infraProjectIds: ['metro-airport'],
    authorities: ['HMRL'],
    ourAnalysis:
      'Past the forty percent mark, completion risk falls sharply and the corridor moves from speculative to timeline-bound. Land within a comfortable commute of confirmed station sites tends to re-rate ahead of the opening date.',
  },
  {
    id: 'mock-hyd-007',
    headline: 'High Court restrains construction on 12 acres near Osman Sagar over FTL encroachment',
    sourceName: 'Deccan Land Report',
    sourceDomain: 'deccanlandreport.example',
    canonicalUrl: 'https://deccanlandreport.example/hc-restrains-osman-sagar-ftl',
    minutesAgo: 140,
    cityScope: 'hyderabad',
    stateScope: 'TG',
    blurb: 'The order covers parcels the petitioners say fall inside the full tank level buffer.',
    category: 'LEGAL_DISPUTES',
    sentiment: 'NEGATIVE',
    impactScore: 8,
    corridorSlugs: ['shankarpally-mokila'],
    authorities: ['GHMC'],
    ourAnalysis:
      'A court restraint over lake-buffer status is a reminder that FTL and GO 111 exposure can void an otherwise sound purchase. Buyers anywhere near catchment boundaries should treat an independent FTL check as non-negotiable, not a formality.',
  },
  {
    id: 'mock-hyd-008',
    headline: 'Land acquisition notification issued for irrigation canal widening in Bhongir belt',
    sourceName: 'Telangana Infra Review',
    sourceDomain: 'telanganainfrareview.example',
    canonicalUrl: 'https://telanganainfrareview.example/acquisition-bhongir-canal',
    minutesAgo: 220,
    cityScope: 'hyderabad',
    stateScope: 'TG',
    category: 'POLICY_REGULATION',
    sentiment: 'NEGATIVE',
    impactScore: 8,
    corridorSlugs: ['bibinagar-bhongir'],
    authorities: [],
    goReferences: ['G.O.Ms.No.214'],
    ourAnalysis:
      'An acquisition notification overlapping a growth corridor is a direct risk to affected survey numbers and a caution to adjacent ones. Verify whether a specific parcel sits inside the notified alignment before treating the wider area as a straightforward buy.',
  },
  {
    id: 'mock-hyd-009',
    headline: 'GHMC begins trunk sewer laying to serve eastern peripheral layouts',
    sourceName: 'Urban Growth Journal',
    sourceDomain: 'urbangrowthjournal.example',
    canonicalUrl: 'https://urbangrowthjournal.example/ghmc-trunk-sewer-east',
    minutesAgo: 420,
    cityScope: 'hyderabad',
    stateScope: 'TG',
    category: 'CIVIC_UTILITIES',
    sentiment: 'POSITIVE',
    impactScore: 6,
    corridorSlugs: ['ghatkesar-peerzadiguda'],
    authorities: ['GHMC'],
    ourAnalysis:
      'Trunk utility investment is an underrated leading indicator because it precedes occupancy permissions that unlock end-user demand. Corridors that get sewer and water ahead of construction tend to absorb inventory faster than those that do not.',
  },
  {
    id: 'mock-hyd-010',
    headline: 'New integrated township announced near Adibatla with 2,000-unit first phase',
    sourceName: 'South India Property Daily',
    sourceDomain: 'southindiapropertydaily.example',
    canonicalUrl: 'https://southindiapropertydaily.example/adibatla-township-phase-one',
    minutesAgo: 600,
    cityScope: 'hyderabad',
    stateScope: 'TG',
    category: 'PROJECT_LAUNCH',
    sentiment: 'MIXED',
    impactScore: 6,
    corridorSlugs: ['adibatla'],
    ourAnalysis:
      'A large township adds both demand pull and future supply, so the net effect on nearby land depends on absorption pace. Early plots benefit from the amenity halo; later phases can cap appreciation if the release schedule outruns demand.',
  },
  {
    id: 'mock-hyd-011',
    headline: 'TSIIC opens applications for expanded electronics manufacturing cluster',
    sourceName: 'Bharat Infra Wire',
    sourceDomain: 'bharatinfrawire.example',
    canonicalUrl: 'https://bharatinfrawire.example/tsiic-electronics-cluster-expansion',
    minutesAgo: 720,
    cityScope: 'hyderabad',
    stateScope: 'TG',
    category: 'INDUSTRIAL_JOBS',
    sentiment: 'POSITIVE',
    impactScore: 7,
    corridorSlugs: ['maheshwaram-pharma-city', 'kadthal-fcda'],
    authorities: ['TSIIC'],
    ourAnalysis:
      'Confirmed cluster expansion strengthens the employment-gravity case for residential land within a reasonable commute. The effect is strongest where road connectivity already exists, since job access, not raw proximity, drives tenant demand.',
  },
  {
    id: 'mock-hyd-012',
    // very long headline (~140 chars) → truncation test
    headline:
      'State government notifies revised master plan zoning for the southern growth arc covering Maheshwaram, Kandukur and Kadthal mandals with new mixed-use belts',
    sourceName: 'Capital Region Times',
    sourceDomain: 'capitalregiontimes.example',
    canonicalUrl: 'https://capitalregiontimes.example/southern-arc-masterplan-revision',
    minutesAgo: 260,
    cityScope: 'hyderabad',
    stateScope: 'TG',
    category: 'POLICY_REGULATION',
    sentiment: 'POSITIVE',
    impactScore: 9,
    corridorSlugs: ['maheshwaram-pharma-city', 'kadthal-fcda'],
    authorities: ['HMDA'],
    goReferences: ['G.O.Ms.No.68'],
    ourAnalysis:
      'A master-plan revision that adds mixed-use belts can lift the regulatory ceiling for parcels previously capped as agricultural or conservation. The uplift accrues on notification, so the window to enter ahead of re-rating is narrow.',
  },
  {
    id: 'mock-hyd-013',
    headline: 'Stamp duty collections in the district hit a fresh monthly high',
    sourceName: 'Realty Signal India',
    sourceDomain: 'realtysignalindia.example',
    canonicalUrl: 'https://realtysignalindia.example/stamp-duty-monthly-high',
    minutesAgo: 155,
    cityScope: 'hyderabad',
    stateScope: 'TG',
    // empty corridorSlugs → card renders without the corridor chip row
    category: 'MARKET_PRICES',
    sentiment: 'NEUTRAL',
    impactScore: 5,
    corridorSlugs: [],
    ourAnalysis:
      'District-wide stamp duty highs confirm transaction activity but say little about which specific corridors are moving. Use it as a market-temperature read, then look to village-level registration data to locate the actual demand.',
  },
  {
    id: 'mock-hyd-014',
    headline: 'Water board extends supply network to three peripheral mandals',
    sourceName: 'Deccan Land Report',
    sourceDomain: 'deccanlandreport.example',
    canonicalUrl: 'https://deccanlandreport.example/water-board-peripheral-supply',
    minutesAgo: 800,
    cityScope: 'hyderabad',
    stateScope: 'TG',
    category: 'CIVIC_UTILITIES',
    sentiment: 'POSITIVE',
    impactScore: 5,
    corridorSlugs: ['kompally-bachupally'],
    ourAnalysis:
      'Assured water supply removes a common objection for end-users and raises the ceiling on plot conversion to occupied housing. It rarely moves prices on its own but compounds with connectivity and approvals already in place.',
  },
  {
    id: 'mock-hyd-015',
    headline: 'Encroachment demolition drive clears government land in northern suburb',
    sourceName: 'Urban Growth Journal',
    sourceDomain: 'urbangrowthjournal.example',
    canonicalUrl: 'https://urbangrowthjournal.example/encroachment-drive-north',
    minutesAgo: 190,
    cityScope: 'hyderabad',
    stateScope: 'TG',
    category: 'LEGAL_DISPUTES',
    sentiment: 'MIXED',
    impactScore: 5,
    corridorSlugs: ['medchal-dundigal'],
    authorities: ['GHMC'],
    ourAnalysis:
      'Clearing encroachments improves long-run title clarity but signals that assigned or government land nearby carries real enforcement risk. It reinforces the case for buying only where the classification is clean and independently verified.',
  },

  // ── India-wide ──────────────────────────────────────────────────────────────
  {
    id: 'mock-india-001',
    headline: 'RBI holds repo rate steady for fourth consecutive review',
    sourceName: 'Bharat Infra Wire',
    sourceDomain: 'bharatinfrawire.example',
    canonicalUrl: 'https://bharatinfrawire.example/rbi-repo-hold-fourth',
    minutesAgo: 320,
    cityScope: 'india',
    category: 'MACRO_FINANCE',
    sentiment: 'NEUTRAL',
    impactScore: 6,
    corridorSlugs: [],
    ourAnalysis:
      'Stable rates keep home loan EMIs predictable for buyers who are mid-decision. For land buyers this matters less directly, since plot financing is typically capped at 50 to 70 percent loan-to-value regardless of rate.',
  },
  {
    id: 'mock-india-002',
    headline: 'Union budget raises capital outlay for national highway corridors',
    sourceName: 'Bharat Infra Wire',
    sourceDomain: 'bharatinfrawire.example',
    canonicalUrl: 'https://bharatinfrawire.example/budget-highway-outlay',
    minutesAgo: 900,
    cityScope: 'india',
    category: 'INFRASTRUCTURE',
    sentiment: 'POSITIVE',
    impactScore: 6,
    corridorSlugs: [],
    authorities: ['NHAI'],
    ourAnalysis:
      'Higher central highway outlay improves the odds that sanctioned-but-unfunded stretches actually move to construction. The read-through to any one corridor depends entirely on whether its specific package is in the funded list.',
  },
  {
    id: 'mock-india-003',
    headline: 'REIT framework changes open smaller-ticket commercial exposure to retail investors',
    sourceName: 'Peninsula Business Post',
    sourceDomain: 'peninsulabusinesspost.example',
    canonicalUrl: 'https://peninsulabusinesspost.example/reit-framework-retail',
    minutesAgo: 1100,
    cityScope: 'india',
    category: 'MACRO_FINANCE',
    sentiment: 'MIXED',
    impactScore: 4,
    corridorSlugs: [],
    ourAnalysis:
      'Easier REIT access competes for the same rupee that might otherwise go into physical plots, especially for passive investors. It is a slow structural pull rather than an immediate factor in any land decision.',
  },
  {
    id: 'mock-india-004',
    headline: 'National land records digitisation reaches new coverage milestone',
    sourceName: 'Capital Region Times',
    sourceDomain: 'capitalregiontimes.example',
    canonicalUrl: 'https://capitalregiontimes.example/land-records-digitisation-milestone',
    minutesAgo: 1400,
    cityScope: 'india',
    category: 'POLICY_REGULATION',
    sentiment: 'POSITIVE',
    impactScore: 5,
    corridorSlugs: [],
    ourAnalysis:
      'Wider digitised records lower diligence cost and the incidence of surprise disputes, which gradually narrows the discount on harder-to-verify parcels. The benefit is real but accrues over years, not quarters.',
  },

  // ── Other cities ─────────────────────────────────────────────────────────────
  {
    id: 'mock-blr-001',
    headline: 'Peripheral ring road land pooling scheme reopens for objections',
    sourceName: 'South India Property Daily',
    sourceDomain: 'southindiapropertydaily.example',
    canonicalUrl: 'https://southindiapropertydaily.example/blr-prr-land-pooling',
    minutesAgo: 350,
    cityScope: 'bengaluru',
    stateScope: 'KA',
    category: 'POLICY_REGULATION',
    sentiment: 'NEUTRAL',
    impactScore: 6,
    corridorSlugs: [],
    ourAnalysis:
      'Land pooling reopening signals the alignment is being finalised, which usually firms up frontage values while adding process risk for pooled parcels. Owners should weigh the compensation basis against holding for open-market sale.',
  },
  {
    id: 'mock-chn-001',
    headline: 'Coastal industrial corridor adds two anchor units near the port',
    sourceName: 'Peninsula Business Post',
    sourceDomain: 'peninsulabusinesspost.example',
    canonicalUrl: 'https://peninsulabusinesspost.example/chennai-coastal-corridor-anchors',
    minutesAgo: 480,
    cityScope: 'chennai',
    stateScope: 'TN',
    category: 'INDUSTRIAL_JOBS',
    sentiment: 'POSITIVE',
    impactScore: 6,
    corridorSlugs: [],
    ourAnalysis:
      'New port-linked anchors strengthen the employment base that peripheral residential land ultimately depends on. Connectivity to the units, not distance to the port, is what will separate winners from laggards here.',
  },
  {
    id: 'mock-vja-001',
    headline: 'Capital region authority notifies fresh layout norms for Amaravati periphery',
    sourceName: 'AP Realty Bulletin',
    sourceDomain: 'aprealtybulletin.example',
    canonicalUrl: 'https://aprealtybulletin.example/crda-layout-norms-amaravati',
    minutesAgo: 260,
    cityScope: 'vijayawada-amaravati',
    stateScope: 'AP',
    category: 'POLICY_REGULATION',
    sentiment: 'MIXED',
    impactScore: 6,
    corridorSlugs: [],
    authorities: [],
    ourAnalysis:
      'Revised layout norms in the capital periphery can either unlock or constrain conversion depending on the fine print on setbacks and land use. Amaravati has a history of policy reversals, so size positions to survive another change of direction.',
  },
  {
    id: 'mock-vsk-001',
    headline: 'Port-led logistics park clears state investment board',
    sourceName: 'AP Realty Bulletin',
    sourceDomain: 'aprealtybulletin.example',
    canonicalUrl: 'https://aprealtybulletin.example/vizag-logistics-park-cleared',
    minutesAgo: 640,
    cityScope: 'visakhapatnam',
    stateScope: 'AP',
    category: 'INDUSTRIAL_JOBS',
    sentiment: 'POSITIVE',
    impactScore: 6,
    corridorSlugs: [],
    authorities: [],
    ourAnalysis:
      'Board clearance is a real milestone but sits several approvals short of ground-breaking, so treat land nearby as early-stage. The logistics use favours parcels with heavy-vehicle road access over those valued only for residential frontage.',
  },

  // ── Suppressed (takedown) — must NEVER surface in any feed ───────────────────
  {
    id: 'mock-suppressed-001',
    headline: 'Disputed promoter claim about upcoming SEZ near Yacharam',
    sourceName: 'Realty Signal India',
    sourceDomain: 'realtysignalindia.example',
    canonicalUrl: 'https://realtysignalindia.example/disputed-yacharam-sez-claim',
    minutesAgo: 210,
    cityScope: 'hyderabad',
    stateScope: 'TG',
    category: 'PROJECT_LAUNCH',
    sentiment: 'NEGATIVE',
    impactScore: 4,
    corridorSlugs: ['kadthal-fcda'],
    ourAnalysis:
      'Unverified SEZ claims are a classic pre-sale demand-manufacturing tactic. Nothing here should move a decision until an official allotment or GO is on record.',
    suppressed: true,
  },
  {
    id: 'mock-suppressed-002',
    headline: 'Retracted report on metro alignment change through Ghatkesar',
    sourceName: 'Metro Corridor Monitor',
    sourceDomain: 'metrocorridormonitor.example',
    canonicalUrl: 'https://metrocorridormonitor.example/retracted-ghatkesar-metro',
    minutesAgo: 330,
    cityScope: 'hyderabad',
    stateScope: 'TG',
    category: 'INFRASTRUCTURE',
    sentiment: 'NEUTRAL',
    impactScore: 3,
    corridorSlugs: ['ghatkesar-peerzadiguda'],
    ourAnalysis:
      'A retracted alignment report should carry no weight in valuation. Corridor decisions belong on confirmed DPRs and tenders, not on reports the outlet itself has withdrawn.',
    suppressed: true,
  },
];
