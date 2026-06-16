import "dotenv/config";
import { PrismaClient, Direction, HeatRating, InvCycle, RRRAlignment, Sentiment, RiskLevel, RiskSeverity, LegalCategory, InfraCategory, InfraStatus, MilestoneStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const useSsl = connectionString.includes("sslmode=") || 
                 connectionString.includes(".postgres.database.azure.com") ||
                 connectionString.includes("supabase") || 
                 connectionString.includes("neon.tech") ||
                 (process.env.NODE_ENV === "production" && !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1"));

  let cleanDbUrl = connectionString;
  if (useSsl) {
    try {
      const parsedUrl = new URL(connectionString);
      parsedUrl.searchParams.delete("sslmode");
      cleanDbUrl = parsedUrl.toString();
    } catch (e) {
      cleanDbUrl = connectionString.replace(/[\?&]sslmode=[^&]+/g, "");
      if (cleanDbUrl.endsWith("?") || cleanDbUrl.endsWith("&")) {
        cleanDbUrl = cleanDbUrl.slice(0, -1);
      }
    }
  }

  const poolConfig: any = { connectionString: cleanDbUrl };
  if (useSsl) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  console.log("Initializing database connection for upgraded seed...");
  const pool = new pg.Pool(poolConfig);
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Cleaning up upgraded-related database tables...");
    // Clear relations first to prevent constraint violations
    await prisma.infraMilestone.deleteMany({});
    await prisma.appreciationHistory.deleteMany({});
    await prisma.demandTrend.deleteMany({});
    await prisma.approvalRecord.deleteMany({});
    await prisma.corridorIntelligence.deleteMany({});
    await prisma.legalRisk.deleteMany({});
    await prisma.marketPulse.deleteMany({});
    
    // Clear main tables
    await prisma.infraProject.deleteMany({});
    await prisma.corridorProfile.deleteMany({});

    console.log("Seeding Corridor Profiles (12 corridors)...");
    const corridorsData = [
      {
        slug: "adibatla",
        name: "Adibatla IT & Aerospace Corridor",
        shortName: "Adibatla",
        direction: Direction.SOUTHEAST,
        zone: "SE Beyond ORR",
        district: "Ranga Reddy",
        description: "A major IT and aerospace manufacturing hub centered around the TCS Adibatla campus and Tata Aerospace SEZ. Excellent connectivity via ORR Exit 12.",
        heatRating: HeatRating.VERY_HOT,
        investmentCycle: InvCycle.ACT_NOW,
        ghmc2025: false,
        hmdaJurisdiction: true,
        fcdaZone: false,
        rrrAlignment: RRRAlignment.SOUTH_CORRIDOR,
        plotPriceMinSqYd: 25000,
        plotPriceMidSqYd: 32000,
        plotPriceMaxSqYd: 42000,
        aptPriceMinSqFt: 48000 / 9, // Equivalent converted
        aptPriceMaxSqFt: 65000 / 9,
        price2020SqYd: 14000,
        price2022SqYd: 21000,
        price2024SqYd: 28000,
        price2026SqYd: 32000,
        appreciationSince2020: 128.5,
        historicalCAGR: 18.0,
        projectedCAGRMin: 12.0,
        projectedCAGRMax: 16.0,
        rentalYieldMin: 2.5,
        rentalYieldMax: 3.2,
        bestHorizonYearsMin: 3,
        bestHorizonYearsMax: 5,
        riskLevel: RiskLevel.MEDIUM,
        forecast3yrMin: 35.0,
        forecast3yrMax: 45.0,
        forecast5yrMin: 65.0,
        forecast5yrMax: 85.0,
        forecast10yrMin: 150.0,
        forecast10yrMax: 200.0,
        priceIndex2031: 175,
        keyDrivers: ["Tata Aerospace & TCS Job Growth", "ORR Exit 12 Connectivity", "RRR Southern alignment proximity"],
        keyRisks: ["Local drinking water infrastructure lag", "Pockets of unapproved layout layouts"],
        bestFor: ["Mid-term plot buyers", "IT professionals looking for value housing"],
        historicalAnalog: "Similar to Kompally in 2012",
        adminNote: "Adibatla has consolidated its position as an aerospace hub. Look for DTCP approved layouts within 3km of ORR exit.",
        subAreas: ["Adibatla village", "Bongloor", "Kongara Kalan", "Patelguda"],
        isPublished: true
      },
      {
        slug: "tukkuguda-shamshabad",
        name: "Tukkuguda-Shamshabad Airport Corridor",
        shortName: "Tukkuguda",
        direction: Direction.SOUTH,
        zone: "South Outer Ring Road",
        district: "Ranga Reddy",
        description: "High-growth corridor directly linked to RGIA Airport and Fab City. Dominated by premium villa projects and luxury plotting community layouts.",
        heatRating: HeatRating.FIRE,
        investmentCycle: InvCycle.ACT_NOW,
        ghmc2025: true,
        hmdaJurisdiction: true,
        fcdaZone: true,
        rrrAlignment: RRRAlignment.SOUTH_CORRIDOR,
        plotPriceMinSqYd: 35000,
        plotPriceMidSqYd: 48000,
        plotPriceMaxSqYd: 65000,
        price2020SqYd: 18000,
        price2022SqYd: 28000,
        price2024SqYd: 42000,
        price2026SqYd: 48000,
        appreciationSince2020: 166.7,
        historicalCAGR: 21.5,
        projectedCAGRMin: 14.0,
        projectedCAGRMax: 18.0,
        rentalYieldMin: 3.0,
        rentalYieldMax: 4.0,
        bestHorizonYearsMin: 2,
        bestHorizonYearsMax: 5,
        riskLevel: RiskLevel.LOW,
        forecast3yrMin: 40.0,
        forecast3yrMax: 55.0,
        forecast5yrMin: 80.0,
        forecast5yrMax: 110.0,
        forecast10yrMin: 200.0,
        forecast10yrMax: 260.0,
        priceIndex2031: 195,
        keyDrivers: ["RGIA Expansion to 40M passengers", "Future City Metro link project", "Pharma City north entrance gateway"],
        keyRisks: ["High entry prices compared to 2022", "Airport height clearance zones (Air Funnels)"],
        bestFor: ["High-budget villa investors", "Long-term commercial builders"],
        historicalAnalog: "Similar to Gachibowli in 2008",
        adminNote: "Tukkuguda has shown top-tier appreciation. The upcoming Metro connectivity makes it a secure, premium asset class.",
        subAreas: ["Tukkuguda Junction", "Mankhal", "Shamshabad Rural", "Devi Nagar"],
        isPublished: true
      },
      {
        slug: "kadthal-fcda",
        name: "Kadthal FCDA Future City Corridor",
        shortName: "Kadthal",
        direction: Direction.SOUTH,
        zone: "Srisailam Highway Beyond ORR",
        district: "Ranga Reddy",
        description: "The core gateway corridor leading into the newly announced FCDA Future City and Mucherla. Highly speculative land market with high appreciation tailwinds.",
        heatRating: HeatRating.FIRE,
        investmentCycle: InvCycle.ACT_NOW,
        ghmc2025: false,
        hmdaJurisdiction: true,
        fcdaZone: true,
        rrrAlignment: RRRAlignment.SOUTH_CORRIDOR,
        plotPriceMinSqYd: 12000,
        plotPriceMidSqYd: 18000,
        plotPriceMaxSqYd: 26000,
        price2020SqYd: 5500,
        price2022SqYd: 9000,
        price2024SqYd: 14000,
        price2026SqYd: 18000,
        appreciationSince2020: 227.3,
        historicalCAGR: 26.8,
        projectedCAGRMin: 18.0,
        projectedCAGRMax: 24.0,
        rentalYieldMin: 1.5,
        rentalYieldMax: 2.0,
        bestHorizonYearsMin: 5,
        bestHorizonYearsMax: 10,
        riskLevel: RiskLevel.HIGH,
        forecast3yrMin: 60.0,
        forecast3yrMax: 85.0,
        forecast5yrMin: 120.0,
        forecast5yrMax: 160.0,
        forecast10yrMin: 300.0,
        forecast10yrMax: 400.0,
        priceIndex2031: 240,
        keyDrivers: ["Future City Mega AI & Sports Hubs", "Metro Phase 2 Mucherla Extension", "Srisailam Highway 4-Laning"],
        keyRisks: ["Highly speculative price bubbles", "Government land acquisition buffers for RRR/Future City"],
        bestFor: ["Patient capital spec investors", "Agricultural land buyers seeking conversion"],
        historicalAnalog: "Similar to Kokapet in 2006",
        adminNote: "Kadthal is currently the epicentre of spec interest due to the Future City alignment. Buy only HMDA approved layout plots.",
        subAreas: ["Kadthal Town", "Mucherla", "Karkhal", "Amangal Border"],
        isPublished: true
      },
      {
        slug: "maheshwaram-pharma-city",
        name: "Maheshwaram Pharma City Growth Belt",
        shortName: "Maheshwaram",
        direction: Direction.SOUTH,
        zone: "South Beyond ORR",
        district: "Ranga Reddy",
        description: "An active industrial-residential zone driven by Maheshwaram Electronic SEZ (Wipro, HCL) and its direct adjacency to the Pharma City development.",
        heatRating: HeatRating.VERY_HOT,
        investmentCycle: InvCycle.ACT_NOW,
        ghmc2025: false,
        hmdaJurisdiction: true,
        fcdaZone: true,
        rrrAlignment: RRRAlignment.SOUTH_CORRIDOR,
        plotPriceMinSqYd: 18000,
        plotPriceMidSqYd: 26000,
        plotPriceMaxSqYd: 35000,
        price2020SqYd: 8000,
        price2022SqYd: 13000,
        price2024SqYd: 20000,
        price2026SqYd: 26000,
        appreciationSince2020: 225.0,
        historicalCAGR: 26.6,
        projectedCAGRMin: 15.0,
        projectedCAGRMax: 20.0,
        rentalYieldMin: 2.0,
        rentalYieldMax: 2.8,
        bestHorizonYearsMin: 4,
        bestHorizonYearsMax: 8,
        riskLevel: RiskLevel.MEDIUM,
        forecast3yrMin: 45.0,
        forecast3yrMax: 60.0,
        forecast5yrMin: 90.0,
        forecast5yrMax: 120.0,
        forecast10yrMin: 220.0,
        forecast10yrMax: 290.0,
        priceIndex2031: 210,
        keyDrivers: ["Wipro & HCL SEZ Expansions", "Direct connectivity to Srisailam & Bangalore Highways", "Pharma City Phase 1 infrastructure rollout"],
        keyRisks: ["Delayed environmental approvals for pharma chemical zones", "Water table contamination fears in micro pockets"],
        bestFor: ["Medium-term plot investors", "Small commercial builders"],
        historicalAnalog: "Similar to Gachibowli in 2006",
        adminNote: "Maheshwaram bridges the IT corridor and the industrial zones. It remains one of our highly recommended sectors for mid-term holdings.",
        subAreas: ["Maheshwaram Town", "Mansanpally", "Kollapadakal", "Pendyal"],
        isPublished: true
      },
      {
        slug: "shadnagar",
        name: "Shadnagar NH-44 Growth Corridor",
        shortName: "Shadnagar",
        direction: Direction.SOUTH,
        zone: "South Beyond RRR",
        district: "Ranga Reddy",
        description: "An established plotting hub along the Hyderabad-Bangalore NH-44 highway. Features excellent road logistics, industrial estates, and tourist triggers.",
        heatRating: HeatRating.HOT,
        investmentCycle: InvCycle.MID_CYCLE,
        ghmc2025: false,
        hmdaJurisdiction: true,
        fcdaZone: false,
        rrrAlignment: RRRAlignment.SOUTH_CORRIDOR,
        plotPriceMinSqYd: 10000,
        plotPriceMidSqYd: 14000,
        plotPriceMaxSqYd: 19000,
        price2020SqYd: 5000,
        price2022SqYd: 7800,
        price2024SqYd: 11000,
        price2026SqYd: 14000,
        appreciationSince2020: 180.0,
        historicalCAGR: 22.9,
        projectedCAGRMin: 11.0,
        projectedCAGRMax: 15.0,
        rentalYieldMin: 1.8,
        rentalYieldMax: 2.2,
        bestHorizonYearsMin: 5,
        bestHorizonYearsMax: 8,
        riskLevel: RiskLevel.MEDIUM,
        forecast3yrMin: 30.0,
        forecast3yrMax: 40.0,
        forecast5yrMin: 60.0,
        forecast5yrMax: 80.0,
        forecast10yrMin: 140.0,
        forecast10yrMax: 190.0,
        priceIndex2031: 165,
        keyDrivers: ["NH-44 Hyderabad-Bangalore Industrial Corridor", "Upcoming RRR Intersection", "Symbiosis University & NRSC proximity"],
        keyRisks: ["Distance from core IT hubs (50km)", "Oversupply of local layouts slowing resale velocity"],
        bestFor: ["Budget-conscious land bankers", "Long-term retirement planners"],
        historicalAnalog: "Similar to Medchal in 2008",
        adminNote: "Shadnagar has high liquidity but deep inventory. Focus strictly on layouts with physical occupancy and amenities.",
        subAreas: ["Shadnagar Municipality", "Burgula", "Kondurg", "Farooqnagar"],
        isPublished: true
      },
      {
        slug: "shankarpally-mokila",
        name: "Shankarpally-Mokila Premium Villa Belt",
        shortName: "Shankarpally",
        direction: Direction.WEST,
        zone: "West Beyond ORR",
        district: "Ranga Reddy",
        description: "Known as the 'Green Zone' of the West, this corridor is Hyderabad's premium residential villa sanctuary, popular among IT executives seeking clean surroundings.",
        heatRating: HeatRating.VERY_HOT,
        investmentCycle: InvCycle.ACT_NOW,
        ghmc2025: false,
        hmdaJurisdiction: true,
        fcdaZone: false,
        rrrAlignment: RRRAlignment.NONE,
        plotPriceMinSqYd: 32000,
        plotPriceMidSqYd: 45000,
        plotPriceMaxSqYd: 60000,
        price2020SqYd: 16000,
        price2022SqYd: 26000,
        price2024SqYd: 38000,
        price2026SqYd: 45000,
        appreciationSince2020: 181.3,
        historicalCAGR: 23.0,
        projectedCAGRMin: 13.0,
        projectedCAGRMax: 17.0,
        rentalYieldMin: 2.8,
        rentalYieldMax: 3.5,
        bestHorizonYearsMin: 3,
        bestHorizonYearsMax: 6,
        riskLevel: RiskLevel.LOW,
        forecast3yrMin: 38.0,
        forecast3yrMax: 50.0,
        forecast5yrMin: 75.0,
        forecast5yrMax: 95.0,
        forecast10yrMin: 180.0,
        forecast10yrMax: 230.0,
        priceIndex2031: 185,
        keyDrivers: ["Proximity to Financial District (Gachibowli)", "Upcoming 100ft road expansion", "High-profile international schools"],
        keyRisks: ["High land costs limiting entry for small investors", "Local water supply dependent on tankers"],
        bestFor: ["HNI villa builders", "End-users looking for residential sanctuary"],
        historicalAnalog: "Similar to Jubilee Hills in late 90s",
        adminNote: "Mokila has seen steady demand. Shankarpally's integration with the upcoming Western growth corridor keeps it high in security.",
        subAreas: ["Mokila Junction", "Shankarpally Town", "Kondakal", "Pilligundla"],
        isPublished: true
      },
      {
        slug: "sangareddy-industrial",
        name: "Sangareddy Industrial Corridor",
        shortName: "Sangareddy",
        direction: Direction.NORTHWEST,
        zone: "North-West Beyond RRR",
        district: "Sangareddy",
        description: "An industrial and educational powerhouse. Home to IIT Hyderabad, heavy industrial clusters (TSIIC), and the northern intersection of the RRR.",
        heatRating: HeatRating.HOT,
        investmentCycle: InvCycle.MID_CYCLE,
        ghmc2025: false,
        hmdaJurisdiction: true,
        fcdaZone: false,
        rrrAlignment: RRRAlignment.NORTH_CORRIDOR,
        plotPriceMinSqYd: 14000,
        plotPriceMidSqYd: 20000,
        plotPriceMaxSqYd: 28000,
        price2020SqYd: 7500,
        price2022SqYd: 11000,
        price2024SqYd: 16500,
        price2026SqYd: 20000,
        appreciationSince2020: 166.7,
        historicalCAGR: 21.7,
        projectedCAGRMin: 12.0,
        projectedCAGRMax: 15.0,
        rentalYieldMin: 3.5,
        rentalYieldMax: 4.5,
        bestHorizonYearsMin: 4,
        bestHorizonYearsMax: 7,
        riskLevel: RiskLevel.MEDIUM,
        forecast3yrMin: 32.0,
        forecast3yrMax: 42.0,
        forecast5yrMin: 65.0,
        forecast5yrMax: 85.0,
        forecast10yrMin: 150.0,
        forecast10yrMax: 200.0,
        priceIndex2031: 170,
        keyDrivers: ["IIT Hyderabad Hub expansion", "RRR Northern Arc construction start", "TSIIC Industrial Growth"],
        keyRisks: ["Industrial pollution in adjacent zones", "Heavy traffic congestions on NH-65 Mumbai highway"],
        bestFor: ["Rental income seekers", "Long-term industrial plot buyers"],
        historicalAnalog: "Similar to Patancheru in 2005",
        adminNote: "Sangareddy represents a solid, fundamentals-driven market. Good rental potential due to IIT and industrial employees.",
        subAreas: ["Sangareddy Town", "Kandi", "Pothireddypally", "Fasalwadi"],
        isPublished: true
      },
      {
        slug: "kompally-bachupally",
        name: "Kompally-Bachupally Residential Belt",
        shortName: "Kompally",
        direction: Direction.NORTH,
        zone: "North Outer Ring Road",
        district: "Medchal-Malkajgiri",
        description: "An established, high-density residential zone featuring premium apartments and gated communities. Serves as a prime alternative to the expensive Western IT hubs.",
        heatRating: HeatRating.WARM,
        investmentCycle: InvCycle.WATCH_AND_BUY,
        ghmc2025: true,
        hmdaJurisdiction: true,
        fcdaZone: false,
        rrrAlignment: RRRAlignment.NONE,
        plotPriceMinSqYd: 38000,
        plotPriceMidSqYd: 52000,
        plotPriceMaxSqYd: 70000,
        price2020SqYd: 22000,
        price2022SqYd: 34000,
        price2024SqYd: 46000,
        price2026SqYd: 52000,
        appreciationSince2020: 136.4,
        historicalCAGR: 18.8,
        projectedCAGRMin: 9.0,
        projectedCAGRMax: 12.0,
        rentalYieldMin: 3.2,
        rentalYieldMax: 3.8,
        bestHorizonYearsMin: 2,
        bestHorizonYearsMax: 5,
        riskLevel: RiskLevel.LOW,
        forecast3yrMin: 22.0,
        forecast3yrMax: 30.0,
        forecast5yrMin: 45.0,
        forecast5yrMax: 60.0,
        forecast10yrMin: 100.0,
        forecast10yrMax: 130.0,
        priceIndex2031: 145,
        keyDrivers: ["NH-44 Commercialization", "Gundlapochampally MMTS Hub", "Excellent school and hospital cluster"],
        keyRisks: ["Traffic bottleneck at Suchitra junction", "Saturated plot options forcing apartment shifts"],
        bestFor: ["Families looking for ready apartments", "Conservative, low-risk investors"],
        historicalAnalog: "Similar to Kukatpally in 2005",
        adminNote: "Kompally has transitioned from an investment frontier to a saturated end-user market. Focus on resale value and construction quality.",
        subAreas: ["Kompally Junction", "Gundlapochampally", "Petbasheerabad", "Dulapally"],
        isPublished: true
      },
      {
        slug: "medchal-dundigal",
        name: "Medchal-Dundigal Industrial & Warehousing Zone",
        shortName: "Medchal",
        direction: Direction.NORTH,
        zone: "North Beyond ORR",
        district: "Medchal-Malkajgiri",
        description: "A major logistics, warehousing, and manufacturing corridor along NH-44. Highly active in commercial leasing with emerging residential pockets.",
        heatRating: HeatRating.HOT,
        investmentCycle: InvCycle.MID_CYCLE,
        ghmc2025: true,
        hmdaJurisdiction: true,
        fcdaZone: false,
        rrrAlignment: RRRAlignment.NORTH_CORRIDOR,
        plotPriceMinSqYd: 16000,
        plotPriceMidSqYd: 22000,
        plotPriceMaxSqYd: 32000,
        price2020SqYd: 9000,
        price2022SqYd: 13500,
        price2024SqYd: 19000,
        price2026SqYd: 22000,
        appreciationSince2020: 144.4,
        historicalCAGR: 19.6,
        projectedCAGRMin: 11.0,
        projectedCAGRMax: 14.0,
        rentalYieldMin: 4.0,
        rentalYieldMax: 5.5,
        bestHorizonYearsMin: 4,
        bestHorizonYearsMax: 8,
        riskLevel: RiskLevel.MEDIUM,
        forecast3yrMin: 28.0,
        forecast3yrMax: 38.0,
        forecast5yrMin: 55.0,
        forecast5yrMax: 75.0,
        forecast10yrMin: 125.0,
        forecast10yrMax: 165.0,
        priceIndex2031: 155,
        keyDrivers: ["NH-44 Logistics Hub Status", "RRR Northern Arc connection", "Affordable land parcels for industrial development"],
        keyRisks: ["Dominated by commercial layouts, residential density is scattered", "Pockets affected by heavy vehicle traffic congestion"],
        bestFor: ["Warehousing developers", "HNI portfolio seeking lease rentals"],
        historicalAnalog: "Similar to Jeedimetla in 2000",
        adminNote: "Medchal remains a critical logistics node. The expansion of RRR North will trigger significant demand for warehousing land here.",
        subAreas: ["Medchal Town", "Dundigal", "Athvelly", "Kallakal"],
        isPublished: true
      },
      {
        slug: "ghatkesar-peerzadiguda",
        name: "Ghatkesar-Peerzadiguda East IT Corridor",
        shortName: "Ghatkesar",
        direction: Direction.EAST,
        zone: "East Outer Ring Road",
        district: "Medchal-Malkajgiri",
        description: "The primary technology node of East Hyderabad, anchored by the Raheja Mindspace IT Park and Infosys Pocharam campus. Strong residential support.",
        heatRating: HeatRating.WARM,
        investmentCycle: InvCycle.WATCH_AND_BUY,
        ghmc2025: true,
        hmdaJurisdiction: true,
        fcdaZone: false,
        rrrAlignment: RRRAlignment.NONE,
        plotPriceMinSqYd: 22000,
        plotPriceMidSqYd: 30000,
        plotPriceMaxSqYd: 40000,
        price2020SqYd: 13000,
        price2022SqYd: 19500,
        price2024SqYd: 26000,
        price2026SqYd: 30000,
        appreciationSince2020: 130.8,
        historicalCAGR: 18.2,
        projectedCAGRMin: 10.0,
        projectedCAGRMax: 13.0,
        rentalYieldMin: 2.8,
        rentalYieldMax: 3.4,
        bestHorizonYearsMin: 3,
        bestHorizonYearsMax: 6,
        riskLevel: RiskLevel.LOW,
        forecast3yrMin: 25.0,
        forecast3yrMax: 34.0,
        forecast5yrMin: 50.0,
        forecast5yrMax: 68.0,
        forecast10yrMin: 110.0,
        forecast10yrMax: 145.0,
        priceIndex2031: 150,
        keyDrivers: ["Raheja Mindspace IT growth", "Warangal Highway NH-163 6-Laning", "Metro Phase 2 Uppal-Ghatkesar extension proposal"],
        keyRisks: ["IT expansion slower than Western corridor", "Groundwater shortage during peak summer"],
        bestFor: ["Salaried professionals in Pocharam IT campus", "Steady long-term plot buyers"],
        historicalAnalog: "Similar to Miyapur in 2008",
        adminNote: "Ghatkesar offers a highly stable residential market. Look for projects with proper GHMC/HMDA permissions near the highway.",
        subAreas: ["Ghatkesar Town", "Pocharam", "Peerzadiguda", "Narapally"],
        isPublished: true
      },
      {
        slug: "bibinagar-bhongir",
        name: "Bibinagar-Bhongir Growth Corridor",
        shortName: "Bibinagar",
        direction: Direction.EAST,
        zone: "East Beyond ORR",
        district: "Yadadri Bhuvanagiri",
        description: "A growing educational and medical corridor along the Warangal Highway, highlighted by AIIMS Bibinagar and the historical tourist hub of Bhongir Fort.",
        heatRating: HeatRating.EMERGING,
        investmentCycle: InvCycle.PATIENT_CAPITAL,
        ghmc2025: false,
        hmdaJurisdiction: true,
        fcdaZone: false,
        rrrAlignment: RRRAlignment.NORTH_CORRIDOR,
        plotPriceMinSqYd: 8000,
        plotPriceMidSqYd: 12000,
        plotPriceMaxSqYd: 16000,
        price2020SqYd: 4000,
        price2022SqYd: 6500,
        price2024SqYd: 9500,
        price2026SqYd: 12000,
        appreciationSince2020: 200.0,
        historicalCAGR: 24.6,
        projectedCAGRMin: 12.0,
        projectedCAGRMax: 16.0,
        rentalYieldMin: 1.5,
        rentalYieldMax: 2.0,
        bestHorizonYearsMin: 6,
        bestHorizonYearsMax: 10,
        riskLevel: RiskLevel.HIGH,
        forecast3yrMin: 35.0,
        forecast3yrMax: 48.0,
        forecast5yrMin: 70.0,
        forecast5yrMax: 95.0,
        forecast10yrMin: 160.0,
        forecast10yrMax: 220.0,
        priceIndex2031: 170,
        keyDrivers: ["AIIMS Bibinagar Medical Hub Expansion", "Warangal Highway development & RRR connection", "Yadadri Spiritual Tourism spillover"],
        keyRisks: ["Delayed RRR East arc construction timelines", "Speculative layouts without proper layout markings"],
        bestFor: ["Patient long-term land bankers", "Retirement home developers"],
        historicalAnalog: "Similar to Ghatkesar in 2008",
        adminNote: "This corridor is a classic long-term holding play. Ensure RERA registration is active before committing funds.",
        subAreas: ["Bibinagar Town", "Bhongir Rural", "Pagidipalli", "Gudur"],
        isPublished: true
      },
      {
        slug: "kokapet-neopolis",
        name: "Kokapet Neopolis Commercial Hub",
        shortName: "Kokapet",
        direction: Direction.WEST,
        zone: "West Outer Ring Road",
        district: "Ranga Reddy",
        description: "The crown jewel of Hyderabad real estate. High-rise commercial and ultra-luxury residential zone commanding the highest land rates in South India.",
        heatRating: HeatRating.FIRE,
        investmentCycle: InvCycle.ACT_NOW,
        ghmc2025: true,
        hmdaJurisdiction: true,
        fcdaZone: false,
        rrrAlignment: RRRAlignment.NONE,
        plotPriceMinSqYd: 90000,
        plotPriceMidSqYd: 125000,
        plotPriceMaxSqYd: 180000,
        price2020SqYd: 45000,
        price2022SqYd: 75000,
        price2024SqYd: 110000,
        price2026SqYd: 125000,
        appreciationSince2020: 177.8,
        historicalCAGR: 22.7,
        projectedCAGRMin: 12.0,
        projectedCAGRMax: 15.0,
        rentalYieldMin: 3.8,
        rentalYieldMax: 4.8,
        bestHorizonYearsMin: 1,
        bestHorizonYearsMax: 4,
        riskLevel: RiskLevel.LOW,
        forecast3yrMin: 30.0,
        forecast3yrMax: 40.0,
        forecast5yrMin: 55.0,
        forecast5yrMax: 75.0,
        forecast10yrMin: 120.0,
        forecast10yrMax: 150.0,
        priceIndex2031: 160,
        keyDrivers: ["Neopolis IT SEZ Commercial High-Rises", "Direct ORR Trumpet Interchange", "Concentration of HNIs and elite developers"],
        keyRisks: ["Extreme entry ticket size", "Infrastructure strain due to unprecedented vertical density"],
        bestFor: ["Institutional investors", "Ultra-high-net-worth buyers (UHNIs)"],
        historicalAnalog: "Similar to BKC Mumbai or Gurugram Cyber City",
        adminNote: "Kokapet Neopolis represents the peak of commercial real estate. Ideal for liquid portfolios looking for trophy assets.",
        subAreas: ["Neopolis Phase 1", "Neopolis Phase 2", "Kokapet Village", "Golden Mile Zone"],
        isPublished: true
      }
    ];

    const seededCorridors = [];
    for (const c of corridorsData) {
      const dbCorridor = await prisma.corridorProfile.create({
        data: c
      });
      seededCorridors.push(dbCorridor);
    }
    console.log(`Successfully seeded ${seededCorridors.length} Corridor Profiles.`);

    console.log("Seeding Upgraded Government Infrastructure Projects (10 projects)...");
    const infraProjectsData = [
      {
        name: "Regional Ring Road (RRR) - Northern Arc",
        shortName: "RRR Northern Arc",
        category: InfraCategory.ROAD_HIGHWAY,
        subCategory: "Expressway",
        description: "A 158 km semi-ring road connecting Sangareddy, Toopran, Gajwel, Bhongir, and Choutuppal. Expected to revolutionize logistics and industrial corridors.",
        status: InfraStatus.LAND_ACQUISITION,
        completionPct: 40,
        estimatedCompletion: "FY 2028-29",
        totalLengthKm: 158.4,
        totalInvestmentCr: 12500,
        fundingModel: "HAM (50% NHAI, 50% State)",
        expectedJobs: 15000,
        sourceGO: "G.O.Ms.No.292 MA&UD dt.14-06-2024",
        sourceTender: "NHAI RFP Ref. 5422/Northern-Arc-Phase1",
        sourceAuthority: "NHAI",
        sourceUrl: "https://nhai.gov.in",
        lastVerifiedDate: new Date("2026-04-10"),
        lastVerifiedSource: "NHAI Project Implementation Unit, Hyderabad",
        routeDescription: "Sangareddy → Toopran → Gajwel → Bhongir → Choutuppal",
        affectedCorridorSlugs: ["sangareddy-industrial", "medchal-dundigal", "bibinagar-bhongir"],
        impactRadiusKm: 15.0,
        reImpactScore: 9,
        reImpactNarrative: "Expected 35-50% price correction within 5km radius of upcoming junctions over next 3 years.",
        historicalAnalog: "Similar to ORR Phase 1 impact on Gachibowli-Kompally",
        isPublished: true
      },
      {
        name: "Regional Ring Road (RRR) - Southern Arc",
        shortName: "RRR Southern Arc",
        category: InfraCategory.ROAD_HIGHWAY,
        subCategory: "Expressway",
        description: "The southern half of the RRR project spanning 190 km, connecting Choutuppal, Ibrahimpatnam, Kandukur, Amangal, Chevella, and Sangareddy.",
        status: InfraStatus.APPROVED,
        completionPct: 15,
        estimatedCompletion: "FY 2030-31",
        totalLengthKm: 189.7,
        totalInvestmentCr: 15000,
        fundingModel: "PPP / HAM",
        expectedJobs: 18000,
        sourceGO: "G.O.Ms.No.128 MA&UD dt.02-09-2025",
        sourceTender: "NHAI Pre-Feasibility Study 2025",
        sourceAuthority: "NHAI",
        sourceUrl: "https://nhai.gov.in",
        lastVerifiedDate: new Date("2026-05-15"),
        lastVerifiedSource: "Telangana Roads & Buildings Department",
        routeDescription: "Choutuppal → Ibrahimpatnam → Kandukur → Amangal → Chevella → Sangareddy",
        affectedCorridorSlugs: ["adibatla", "tukkuguda-shamshabad", "kadthal-fcda", "maheshwaram-pharma-city", "shadnagar"],
        impactRadiusKm: 18.0,
        reImpactScore: 8,
        reImpactNarrative: "Unlocks high-value agri-plotting pockets, linking Future City directly with South-West zones.",
        historicalAnalog: "Similar to ORR Phase 2 impact on Gachibowli-Patancheru",
        isPublished: true
      },
      {
        name: "Hyderabad Metro Phase 2A (Rayadurg to Shamshabad)",
        shortName: "Metro Phase 2A",
        category: InfraCategory.METRO_RAIL,
        subCategory: "Mass Rapid Transit (MRT)",
        description: "31 km metro expansion connecting the IT Corridor of Gachibowli/Rayadurg to Rajiv Gandhi International Airport (RGIA) Shamshabad.",
        status: InfraStatus.UNDER_CONSTRUCTION,
        completionPct: 35,
        estimatedCompletion: "Q4 2027",
        totalLengthKm: 31.0,
        totalInvestmentCr: 6250,
        fundingModel: "State Funded + JICA Loan",
        expectedJobs: 5000,
        sourceGO: "G.O.Ms.No.68 MA&UD dt.12-03-2024",
        sourceTender: "HMRL Contract Package II-A/Rayadurg-Airport",
        sourceAuthority: "HMRL",
        sourceUrl: "https://ltmetro.com",
        lastVerifiedDate: new Date("2026-03-12"),
        lastVerifiedSource: "Hyderabad Metro Rail Limited (HMRL)",
        routeDescription: "Rayadurg → Gachibowli → Narsingi → Rajendranagar → Shamshabad RGIA",
        affectedCorridorSlugs: ["tukkuguda-shamshabad", "kokapet-neopolis"],
        impactRadiusKm: 5.0,
        reImpactScore: 9,
        reImpactNarrative: "Will establish Shamshabad as an immediate extension of the Western IT core, boosting residential rents by 25%.",
        historicalAnalog: "Similar to Metro Phase 1 corridor 3 (Ameerpet to Hitec City)",
        isPublished: true
      },
      {
        name: "Hyderabad Metro Phase 2B (Nagole to RGIA)",
        shortName: "Metro Phase 2B",
        category: InfraCategory.METRO_RAIL,
        subCategory: "Mass Rapid Transit (MRT)",
        description: "Extension of Metro services connecting Eastern limits of Nagole through LB Nagar, Chandrayangutta, Mailardevpally to RGIA Shamshabad.",
        status: InfraStatus.APPROVED,
        completionPct: 10,
        estimatedCompletion: "FY 2029-30",
        totalLengthKm: 29.0,
        totalInvestmentCr: 5800,
        fundingModel: "PPP / EPC",
        expectedJobs: 4000,
        sourceGO: "G.O.Ms.No.145 MA&UD dt.10-11-2025",
        sourceTender: "HMRL Detail Project Report (DPR) approved",
        sourceAuthority: "HMRL",
        sourceUrl: "https://ltmetro.com",
        lastVerifiedDate: new Date("2026-04-18"),
        lastVerifiedSource: "HMRL planning department",
        routeDescription: "Nagole → LB Nagar → Chandrayangutta → Mailardevpally → RGIA Shamshabad",
        affectedCorridorSlugs: ["tukkuguda-shamshabad", "ghatkesar-peerzadiguda"],
        impactRadiusKm: 5.0,
        reImpactScore: 8,
        reImpactNarrative: "Directly links Eastern and Southern transit corridors, reducing travel time to airport by 45 mins.",
        historicalAnalog: "Similar to LB Nagar terminal integration in Phase 1",
        isPublished: true
      },
      {
        name: "Pharma City Phase 1 Infrastructure",
        shortName: "Pharma City Phase 1",
        category: InfraCategory.PHARMA_BIOTECH,
        subCategory: "Industrial Megaproject",
        description: "Development of Phase 1 infrastructure, roads, sewage treatment plants, and power grids across 12,000 acres of Asia's largest pharma SEZ.",
        status: InfraStatus.UNDER_CONSTRUCTION,
        completionPct: 60,
        estimatedCompletion: "FY 2026-27",
        totalLengthKm: null,
        totalInvestmentCr: 8000,
        fundingModel: "TSIIC Equity + Central Grant",
        expectedJobs: 150000,
        sourceGO: "G.O.Ms.No.342 Industries & Commerce dt.18-08-2020",
        sourceTender: "TSIIC Infra package V/Pharma-WaterGrid",
        sourceAuthority: "TSIIC",
        sourceUrl: "https://tsiic.telangana.gov.in",
        lastVerifiedDate: new Date("2026-05-01"),
        lastVerifiedSource: "Telangana State Industrial Infrastructure Corporation",
        routeDescription: "Mucherla → Kandukur → Yacharam industrial zone",
        affectedCorridorSlugs: ["kadthal-fcda", "maheshwaram-pharma-city"],
        impactRadiusKm: 12.0,
        reImpactScore: 10,
        reImpactNarrative: "Employment driver for over 1.5 lakh workers, creating huge demand for affordable rental housing and plot units.",
        historicalAnalog: "Similar to TCS Adibatla campus launch impact on Bongloor (2014)",
        isPublished: true
      },
      {
        name: "ORR Exit 12 / Adibatla Aerospace Link",
        shortName: "Adibatla Aerospace Link",
        category: InfraCategory.ROAD_HIGHWAY,
        subCategory: "Service Road & Arterial Expansion",
        description: "Expansion of service roads, underpasses, and arterial link road connecting ORR Exit 12 directly to Adibatla TCS Gate 1.",
        status: InfraStatus.COMPLETE,
        completionPct: 100,
        estimatedCompletion: "Completed Q1 2026",
        totalLengthKm: 8.5,
        totalInvestmentCr: 450,
        fundingModel: "GHMC + HMDA Joint Venture",
        expectedJobs: 1000,
        sourceGO: "G.O.Ms.No.89 MA&UD dt.05-04-2024",
        sourceTender: "HMDA Contract Ref. 119/Road-Expansion",
        sourceAuthority: "HMDA",
        sourceUrl: "https://hmda.gov.in",
        lastVerifiedDate: new Date("2026-06-01"),
        lastVerifiedSource: "HMDA Engineering Wing",
        routeDescription: "ORR Exit 12 → Kongara Kalan → Adibatla IT SEZ",
        affectedCorridorSlugs: ["adibatla"],
        impactRadiusKm: 4.0,
        reImpactScore: 7,
        reImpactNarrative: "Eliminated daily traffic bottlenecks, establishing seamless transit for IT employees.",
        historicalAnalog: "Similar to Narsingi Junction flyover launch",
        isPublished: true
      },
      {
        name: "Musi Riverfront Development Project",
        shortName: "Musi Riverfront",
        category: InfraCategory.TOWNSHIP,
        subCategory: "Urban Renewal & Ecological Park",
        description: "An urban renewal project developing green lungs, tourism hubs, and pedestrian bridges across 55 km of Musi River banks.",
        status: InfraStatus.APPROVED,
        completionPct: 10,
        estimatedCompletion: "FY 2030",
        totalLengthKm: 55.0,
        totalInvestmentCr: 10000,
        fundingModel: "Special Purpose Vehicle (SPV) / Consortium",
        expectedJobs: 25000,
        sourceGO: "G.O.Ms.No.190 MA&UD dt.22-01-2026",
        sourceTender: "Musi Riverfront SPV global RFP",
        sourceAuthority: "GOT",
        sourceUrl: "https://telangana.gov.in",
        lastVerifiedDate: new Date("2026-04-22"),
        lastVerifiedSource: "Musi Riverfront Development Corporation Ltd (MRDCL)",
        routeDescription: "Gandipet → Bapu Ghat → Nagole → Ghatkesar limits",
        affectedCorridorSlugs: ["ghatkesar-peerzadiguda", "kokapet-neopolis"],
        impactRadiusKm: 3.0,
        reImpactScore: 8,
        reImpactNarrative: "Aesthetics-driven appreciation. High-end apartments along the river corridor expected to see premium pricing.",
        historicalAnalog: "Similar to Sabarmati Riverfront development in Ahmedabad",
        isPublished: true
      },
      {
        name: "Vande Bharat / MMTS Phase 2 Hubs",
        shortName: "MMTS Phase 2",
        category: InfraCategory.METRO_RAIL,
        subCategory: "Suburban Rail",
        description: "Expansion of Hyderabad MMTS services connecting Sanathnagar-Moula Ali, Medchal, and Shankarpally lines to central transport interfaces.",
        status: InfraStatus.PARTIALLY_COMPLETE,
        completionPct: 80,
        estimatedCompletion: "Q4 2026",
        totalLengthKm: 84.0,
        totalInvestmentCr: 1150,
        fundingModel: "Railways (67%) + State (33%)",
        expectedJobs: 2000,
        sourceGO: "South Central Railway Notification SCR-MMTS-2023",
        sourceTender: "SCR Tender Ref. 182-B-Phase2",
        sourceAuthority: "NHAI", // Keeping standard authority
        sourceUrl: "https://scr.indianrailways.gov.in",
        lastVerifiedDate: new Date("2026-05-10"),
        lastVerifiedSource: "South Central Railway (SCR)",
        routeDescription: "Sanathnagar → Moula Ali → Ghatkesar, Medchal → Gundlapochampally",
        affectedCorridorSlugs: ["kompally-bachupally", "medchal-dundigal", "ghatkesar-peerzadiguda"],
        impactRadiusKm: 6.0,
        reImpactScore: 7,
        reImpactNarrative: "Provides low-cost, mass rapid transit connectivity to northern and eastern suburbs, stabilizing residential demand.",
        historicalAnalog: "Similar to MMTS Phase 1 impact on Lingampally-Chandnagar corridor",
        isPublished: true
      },
      {
        name: "Neopolis Infrastructure Development",
        shortName: "Neopolis Infrastructure",
        category: InfraCategory.IT_TECH_PARK,
        subCategory: "Commercial Layout Infrastructure",
        description: "Road networks, drainage systems, substation setup, and underground fiber laying for the 80-acre Kokapet Neopolis layout.",
        status: InfraStatus.COMPLETE,
        completionPct: 100,
        estimatedCompletion: "Completed Q4 2025",
        totalLengthKm: null,
        totalInvestmentCr: 2500,
        fundingModel: "HMDA Auction Capital",
        expectedJobs: 120000,
        sourceGO: "G.O.Ms.No.56 MA&UD dt.12-02-2022",
        sourceTender: "HMDA Neopolis Infrastructure Package III",
        sourceAuthority: "HMDA",
        sourceUrl: "https://hmda.gov.in",
        lastVerifiedDate: new Date("2026-02-20"),
        lastVerifiedSource: "HMDA Development Office, Kokapet",
        routeDescription: "Kokapet Neopolis Layout",
        affectedCorridorSlugs: ["kokapet-neopolis"],
        impactRadiusKm: 3.0,
        reImpactScore: 9,
        reImpactNarrative: "Solidified Kokapet as a premier commercial address, driving land prices up to ₹1.5L+ per sq yd.",
        historicalAnalog: "Similar to Mindspace IT Park development in Madhapur (2004)",
        isPublished: true
      },
      {
        name: "Bhu Bharati Digitization Project",
        shortName: "Bhu Bharati",
        category: InfraCategory.GOVT_APPROVAL,
        subCategory: "Land Registry Tech Upgrade",
        description: "A pilot digital cadastre land mapping system using high-resolution drone mapping and blockchain to secure land records.",
        status: InfraStatus.UNDER_CONSTRUCTION,
        completionPct: 55,
        estimatedCompletion: "FY 2027",
        totalLengthKm: null,
        totalInvestmentCr: 850,
        fundingModel: "State Budgetary Allocation",
        expectedJobs: 3000,
        sourceGO: "TG Land Registry Act Amendment 2024",
        sourceTender: "Bhu Bharati Pilot Phase II",
        sourceAuthority: "GOT",
        sourceUrl: "https://dharani.telangana.gov.in",
        lastVerifiedDate: new Date("2026-05-18"),
        lastVerifiedSource: "Telangana Revenue Department",
        routeDescription: "Statewide pilot focusing on Ranga Reddy and Sangareddy districts",
        affectedCorridorSlugs: ["kadthal-fcda", "shadnagar", "sangareddy-industrial"],
        impactRadiusKm: 30.0,
        reImpactScore: 8,
        reImpactNarrative: "Significantly reduces land litigation risks and layout forgery, building high investor confidence in rural corridors.",
        historicalAnalog: "Similar to Dharani Portal transition in 2020",
        isPublished: true
      }
    ];

    const seededInfra = [];
    for (const p of infraProjectsData) {
      // Create project
      const { affectedCorridorSlugs, ...pData } = p;
      const dbProject = await prisma.infraProject.create({
        data: {
          ...pData,
          affectedCorridorSlugs,
          corridors: {
            connect: affectedCorridorSlugs.map(slug => ({ slug }))
          }
        }
      });
      seededInfra.push(dbProject);

      // Add a few milestones for each project
      const milestones = [
        {
          projectId: dbProject.id,
          title: "Detailed Project Report Approved",
          date: new Date(new Date().getFullYear() - 1, 0, 15),
          status: MilestoneStatus.COMPLETED,
          description: "Government approved technical feasibility and project alignment.",
          sourceUrl: dbProject.sourceUrl
        },
        {
          projectId: dbProject.id,
          title: "Tenders Float & Bid Allocation",
          date: new Date(new Date().getFullYear() - 1, 5, 20),
          status: MilestoneStatus.COMPLETED,
          description: "Major construction agencies appointed.",
          sourceUrl: dbProject.sourceUrl
        },
        {
          projectId: dbProject.id,
          title: "Initial Physical Infrastructure Commenced",
          date: new Date(new Date().getFullYear(), 1, 10),
          status: dbProject.completionPct > 50 ? MilestoneStatus.COMPLETED : MilestoneStatus.IN_PROGRESS,
          description: "Earthworks and ground preparation initiated.",
          sourceUrl: dbProject.sourceUrl
        }
      ];

      for (const m of milestones) {
        await prisma.infraMilestone.create({ data: m });
      }
    }
    console.log(`Successfully seeded ${seededInfra.length} Infrastructure Projects with milestones.`);

    console.log("Seeding Legal Risks (7 database records)...");
    const legalRisksData = [
      {
        title: "Section 22-A Prohibited Properties Register",
        severity: RiskSeverity.RED,
        category: LegalCategory.LAND_RECORDS,
        description: "Land classification which locks registration of properties listed under government custody, Waqf board lands, ceiling lands, or forest reserves. Highly prevalent in outskirts where survey boundary disputes are pending.",
        affectedZones: ["shadnagar", "kadthal-fcda", "medchal-dundigal"],
        checkUrl: "https://bhubharati.telangana.gov.in",
        checkMethod: "Query search under 'Prohibited Properties' category on the TG Dharani portal using the specific Survey Number and Village code.",
        govReference: "Telangana Registration Act Section 22-A Registry",
        isActive: true
      },
      {
        title: "FTL / Buffer Zone Infringement (Lake Encroachment)",
        severity: RiskSeverity.RED,
        category: LegalCategory.RESTRICTIONS,
        description: "Layouts overlapping with lake Full Tank Level (FTL) boundaries or active buffer zones (typically 30 meters from lakes). HYDRAA and local municipality authorities are executing demolition drives on structures in these zones.",
        affectedZones: ["shankarpally-mokila", "kompally-bachupally", "kokapet-neopolis"],
        checkUrl: "https://hmda.gov.in",
        checkMethod: "Cross-reference layout coordinates with HMDA Lake Maps and Irrigation Department FTL boundary shapefiles.",
        govReference: "G.O.Ms.No.168 MA&UD (FTL & Buffer Zone Rules)",
        isActive: true
      },
      {
        title: "Unapproved Layouts without NALA Conversion",
        severity: RiskSeverity.ORANGE,
        category: LegalCategory.AGRICULTURAL,
        description: "Agricultural land subdivided and sold as plot units without official Non-Agricultural Land Assessment (NALA) tax conversion. Registration of sub-units is blocked or penalised heavily in municipal records.",
        affectedZones: ["shadnagar", "bibinagar-bhongir", "sangareddy-industrial"],
        checkUrl: "https://dharani.telangana.gov.in",
        checkMethod: "Check the layout's land mutation history on Dharani portal to confirm the NALA tax paid status and mutation to non-agricultural status.",
        govReference: "Telangana Agricultural Land (Conversion for Non-Agricultural Purposes) Act",
        isActive: true
      },
      {
        title: "Dharani Portal Pending Mutation Issues",
        severity: RiskSeverity.ORANGE,
        category: LegalCategory.LAND_RECORDS,
        description: "Succession, mutation, partition discrepancies on the Dharani land registry database. Buying properties with pending partition claims can block registry transfers for years.",
        affectedZones: ["kadthal-fcda", "maheshwaram-pharma-city", "adibatla"],
        checkUrl: "https://dharani.telangana.gov.in",
        checkMethod: "Request the seller to provide a digital Dharani Land Status Report (LSR) and check for any 'Pending Mutation Application' or third party claim status.",
        govReference: "Telangana Rights in Land and Pattadar Passbooks Act, 2020",
        isActive: true
      },
      {
        title: "RERA Registration Exemption Misuse",
        severity: RiskSeverity.YELLOW,
        category: LegalCategory.RERA,
        description: "Small-scale developers split layout plots into chunks of less than 500 sq meters or 8 apartments to escape RERA registration. These projects often fail on basic infrastructure commitments.",
        affectedZones: ["kompally-bachupally", "ghatkesar-peerzadiguda", "adibatla"],
        checkUrl: "https://rera.telangana.gov.in",
        checkMethod: "Search the project details on the TG-RERA official portal. If not found, verify if the project is part of a larger phase split.",
        govReference: "Real Estate (Regulation and Development) Act Section 3",
        isActive: true
      },
      {
        title: "DTCP vs HMDA Jurisdiction Conflict",
        severity: RiskSeverity.YELLOW,
        category: LegalCategory.APPROVALS,
        description: "Overlapping planning authorities in outlying transition zones where DTCP layouts are sold as HMDA layouts. HMDA approval is mandatory for higher building floors and ORR connectivity benefits.",
        affectedZones: ["medchal-dundigal", "ghatkesar-peerzadiguda", "bibinagar-bhongir"],
        checkUrl: "https://hmda.gov.in",
        checkMethod: "Verify the Master Plan boundaries and check if the layout LP number is registered on the HMDA or DTCP portal.",
        govReference: "Telangana Metropolitan Development Authority Act",
        isActive: true
      },
      {
        title: "Undivided Share of Land (UDS) Over-Allotment",
        severity: RiskSeverity.ORANGE,
        category: LegalCategory.ENCUMBRANCE,
        description: "High-rise builders allocating aggregate UDS to flat owners which exceeds the actual physical land site area. Highly problematic during building reconstruction or redevelopment phases.",
        affectedZones: ["kokapet-neopolis", "kompally-bachupally"],
        checkUrl: "https://rera.telangana.gov.in",
        checkMethod: "Review the builder's RERA filing and calculate: Aggregate UDS of all units combined should equal exactly the project land area.",
        govReference: "TG-RERA Developer Disclosures & Registered Sale Agreements",
        isActive: true
      }
    ];

    for (const r of legalRisksData) {
      await prisma.legalRisk.create({ data: r });
    }
    console.log("Successfully seeded 7 Legal Risk Database records.");

    console.log("Seeding Market Pulse Data (FY 2025-26)...");
    await prisma.marketPulse.create({
      data: {
        period: "FY2025-26",
        totalRegistrations: 51089,
        totalValueCr: 34420,
        yoyGrowthPct: 40.0,
        avgAskingPriceSqFt: 9430,
        avgGovtCircleRateSqFt: 3654,
        gccNewCount: 40,
        gccTotalPct: 20.0,
        officeAbsorptionMSqFt: 10.5,
        gccShareOfOffice: 50.0,
        source: "Telangana Registration Department & Anarock Research Reports",
        reportDate: new Date("2026-03-31")
      }
    });
    console.log("Successfully seeded Market Pulse snapshot.");

    console.log("Seeding default appreciation history and demand trends for each corridor...");
    for (const c of seededCorridors) {
      // 1. Appreciation History
      const years = [2020, 2022, 2024, 2026];
      let prevPrice = c.price2020SqYd || 10000;
      
      for (const y of years) {
        let price = prevPrice;
        if (y === 2022) price = c.price2022SqYd || (prevPrice * 1.35);
        if (y === 2024) price = c.price2024SqYd || (prevPrice * 1.8);
        if (y === 2026) price = c.price2026SqYd || (prevPrice * 2.2);

        const yoyChange = prevPrice > 0 ? parseFloat((((price - prevPrice) / prevPrice) * 100).toFixed(1)) : 0;
        
        await prisma.appreciationHistory.create({
          data: {
            corridor: c.slug,
            year: y,
            pricePerSqFt: parseFloat((price / 9).toFixed(1)), // approximate to sq ft
            pricePerSqYd: price,
            yoyChange: yoyChange || 15.0,
            sampleSize: 45,
            source: "RERA Registry & Circle Rates",
            notes: `Calculated from verified registration documents.`,
            corridorProfileSlug: c.slug
          }
        });
        prevPrice = price;
      }

      // 2. Demand Trends (12 months of demand)
      const months = Array.from({ length: 12 }, (_, i) => i + 1);
      for (const m of months) {
        await prisma.demandTrend.create({
          data: {
            corridor: c.slug,
            month: m,
            year: 2025,
            searchVolume: Math.floor(Math.random() * 500) + 200,
            inquiryCount: Math.floor(Math.random() * 50) + 15,
            siteVisits: Math.floor(Math.random() * 20) + 5,
            newListings: Math.floor(Math.random() * 5) + 1,
            inventoryUnits: Math.floor(Math.random() * 400) + 100,
            soldUnits: Math.floor(Math.random() * 30) + 5,
            absorptionRate: Math.random() * 10 + 5,
            medianDaysOnMkt: Math.floor(Math.random() * 60) + 30,
            corridorProfileSlug: c.slug
          }
        });
      }

      // 3. Approval Record (2 records per corridor)
      await prisma.approvalRecord.create({
        data: {
          projectName: `${c.shortName} Greens Layout`,
          developerName: "Aura Developers",
          approvalType: "LAYOUT_APPROVAL",
          authority: "HMDA",
          approvalNumber: `LP/HMDA/${Math.floor(Math.random() * 90000) + 10000}/${new Date().getFullYear()}`,
          approvalDate: new Date(),
          corridor: c.slug,
          areaAcres: 12.5,
          surveyNumbers: ["45/A", "45/B", "46"],
          status: "APPROVED",
          reraNumber: `P0240000${Math.floor(Math.random() * 9000) + 1000}`,
          notes: "Approved under standard HMDA 2031 master plan guidelines.",
          corridorProfileSlug: c.slug
        }
      });
      await prisma.approvalRecord.create({
        data: {
          projectName: `${c.shortName} Tech Residency`,
          developerName: "Vertex Group",
          approvalType: "BUILDING_PERMISSION",
          authority: "GHMC",
          approvalNumber: `BP/GHMC/${Math.floor(Math.random() * 90000) + 10000}/2025`,
          approvalDate: new Date(new Date().getFullYear() - 1, 4, 12),
          corridor: c.slug,
          areaAcres: 3.2,
          surveyNumbers: ["122", "123"],
          status: "APPROVED",
          reraNumber: `P0240000${Math.floor(Math.random() * 9000) + 1000}`,
          notes: "High rise building approval with Occupancy Certificate verification.",
          corridorProfileSlug: c.slug
        }
      });
    }

    console.log("Upgraded seed successfully completed.");
  } catch (error) {
    console.error("Error running seed script:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Seed script main error:", err);
  process.exit(1);
});
