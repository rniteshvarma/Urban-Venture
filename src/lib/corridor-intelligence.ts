import prisma from "./prisma";
import Anthropic from "@anthropic-ai/sdk";
import { Sentiment } from "@prisma/client";
import { corridorInfraFromDb, loadScoringProjects, snapshotCorridor } from "./infra-intel/rescore";
import { buildCorridorMarket, corridorCentre, loadMarketContext, syncReraApprovals, writeCorridorMarket, type CorridorMarketStats, type MarketContext } from "./market/compute";
import { marketScores } from "./market/scores";

// Static fallback drivers / risks when the AI commentary isn't available
function getFallbackAIAnalysis(corridor: string) {
  const driversMap: Record<string, string[]> = {
    "adibatla": [
      "Tata Aerospace & TCS jobs expansion driving local housing demand.",
      "Direct connectivity to Outer Ring Road (ORR) via Exit 12.",
      "Proximity to RRR Southern Corridor alignment."
    ],
    "tukkuguda-shamshabad": [
      "Immediate adjacency to Rajiv Gandhi International Airport expansion plans.",
      "Upcoming Metro Phase 2 Airport connectivity.",
      "High concentration of luxury villa projects and premium layouts."
    ],
    "kadthal-fcda": [
      "Gateway position to the newly planned FCDA Future City Mucherla.",
      "Proximity to proposed Metro extension and Srisailam Highway 4-laning.",
      "High developer acquisition and plotting layout launches."
    ],
    "maheshwaram-pharma-city": [
      "Direct exposure to the massive Hyderabad Pharma City Green SEZ project.",
      "Maheshwaram Electronic Hardware Park and Wipro SEZ employee base.",
      "Strategic link connecting Srisailam Highway and Bangalore Highway."
    ],
    "shadnagar": [
      "Strategic proximity to the upcoming Regional Ring Road (RRR) Southern Corridor.",
      "High affordability with residential plotting rates."
    ],
    "shankarpally-mokila": [
      "Premium eco-sanctuary and green zone status in West Hyderabad.",
      "Proximity to Financial District (Gachibowli) via 4-lane roads.",
      "Presence of elite international schools and villa layouts."
    ],
    "sangareddy-industrial": [
      "Strong demand anchors from IIT Hyderabad and TSIIC industrial parks.",
      "RRR Northern Arc intersection junction hub.",
      "Excellent rental yield potential from students and staff."
    ],
    "kompally-bachupally": [
      "Established residential corridor in North Hyderabad with robust lifestyle retail.",
      "Stable rental demand driven by IT professionals and families.",
      "Flyover and highway widening projects easing traffic bottlenecks."
    ],
    "medchal-dundigal": [
      "Major logistics and warehousing hub status along NH-44.",
      "Upcoming RRR Northern Arc connectivity catalyst.",
      "Affordable industrial and commercial leasing demand."
    ],
    "ghatkesar-peerzadiguda": [
      "Anchored by Raheja Mindspace IT Park and Infosys Pocharam campus.",
      "Warangal Highway NH-163 widening and metro transit proposals.",
      "Highly stable middle-income residential demand."
    ],
    "bibinagar-bhongir": [
      "Growth corridor anchored by AIIMS Bibinagar Medical Hub expansion.",
      "Warangal Highway development and RRR Northern connection.",
      "Budget-friendly long-term land banking options."
    ],
    "kokapet-neopolis": [
      "Premium location in West Hyderabad close to the Financial District.",
      "High-density Neopolis commercial and residential high-rise bidding.",
      "Excellent connectivity via Outer Ring Road (ORR) Exit 1."
    ]
  };

  const risksMap: Record<string, string[]> = {
    "adibatla": [
      "Local water supply infrastructure lag.",
      "Slow retail utility growth."
    ],
    "tukkuguda-shamshabad": [
      "High entry ticket sizes.",
      "Airport height restriction zone (Air Funnel) limitations."
    ],
    "kadthal-fcda": [
      "Speculative pricing bubbles.",
      "Delayed government implementation of Mucherla projects."
    ],
    "maheshwaram-pharma-city": [
      "Environmental clearance delays in immediate pharma zone boundaries.",
      "Water table contamination concerns in micro pockets."
    ],
    "shadnagar": [
      "Longer gestation period (5-7 years) for commercial and utility infra development.",
      "Speculative pricing bubbles in localized outer layouts."
    ],
    "shankarpally-mokila": [
      "High land costs limiting entry for small retail investors.",
      "Local water supply dependent on tankers."
    ],
    "sangareddy-industrial": [
      "Industrial pollution in adjacent zones.",
      "Heavy traffic congestions on NH-65 Mumbai highway."
    ],
    "kompally-bachupally": [
      "Traffic bottleneck at Suchitra junction.",
      "Saturated plot options forcing apartment shifts."
    ],
    "medchal-dundigal": [
      "Scattered residential density.",
      "Heavy commercial vehicle traffic congestion."
    ],
    "ghatkesar-peerzadiguda": [
      "IT expansion slower than Western corridor.",
      "Groundwater shortage during peak summer."
    ],
    "bibinagar-bhongir": [
      "Delayed RRR East arc construction timelines.",
      "Speculative unapproved layout setups."
    ],
    "kokapet-neopolis": [
      "Very high entry ticket size limiting retail investor participation.",
      "Potential high-density infrastructure congestion over the next decade."
    ]
  };

  const defaultDrivers = [
    `Strong connectivity improvements via key highway projects.`,
    `Rapid developer layouts acquisition in the region.`
  ];

  const defaultRisks = [
    `Delayed infrastructure completion timelines.`,
    `Water supply and public utility grid connectivity bottlenecks.`
  ];

  const keyDrivers = driversMap[corridor.toLowerCase()] || defaultDrivers;
  const keyRisks = risksMap[corridor.toLowerCase()] || defaultRisks;

  let bestFor = ["NRI_INVESTOR", "LAND_SPECULATOR"];
  if (corridor.toLowerCase() === "kokapet-neopolis") bestFor = ["NRI_INVESTOR", "HNI_PORTFOLIO_BUILDER"];
  else if (corridor.toLowerCase() === "kompally-bachupally") bestFor = ["FIRST_TIME_BUYER", "PROFESSIONAL_FIRST_HOME"];

  return {
    keyDrivers,
    keyRisks,
    bestFor,
  };
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** One-paragraph commentary from measured figures only. */
export function marketSummary(label: string, m: CorridorMarketStats): string {
  const parts: string[] = [];
  if (m.rates.plot) parts.push(`plots around ${inr(m.rates.plot.median)}/sq.yd (${m.rates.plot.projects} projects)`);
  if (m.rates.apartment) parts.push(`apartments around ${inr(m.rates.apartment.median)}/sq.ft (${m.rates.apartment.projects} projects)`);
  const f = m.forecast[m.primaryAsset].scenarios;
  const prices = parts.length ? `Our listings put ${label} at ${parts.join(" and ")}.` : `We don't have enough listings in ${label} yet to measure prices.`;
  return `${prices} Base-case outlook: about ${f.base.cagr5}% a year over five years (range ${f.conservative.cagr5}–${f.optimistic.cagr5}%), based on Hyderabad's published price growth and the area's infrastructure pipeline.`;
}

export async function computeCorridorScore(
  corridor: string,
  opts: { ctx?: MarketContext; scoringProjects?: Awaited<ReturnType<typeof loadScoringProjects>>; skipAI?: boolean } = {},
) {
  console.log(`Calculating Corridor Intelligence Score for: ${corridor}`);

  // 1. INFRA SCORE (0-25) — dynamic: distance, stage, time-to-completion,
  // 90-day momentum and staleness per project (src/lib/infra-intel/scoring.ts).
  // Replaces the old Σ statusWeight × reImpactScore × 0.2, which saturated at
  // three projects and ignored distance, time and change.
  const labelRow = await prisma.corridorProfile.findUnique({ where: { slug: corridor }, select: { shortName: true, name: true, centroidLat: true, centroidLng: true } });
  const corridorLabel = labelRow?.shortName || labelRow?.name || corridor;
  // A corridor without a stored centre gets its gazetteer location, so the
  // infra scorer can use real distances and the price radius has a middle.
  const centre = labelRow ? corridorCentre(labelRow) : null;
  if (labelRow && labelRow.centroidLat == null && centre) {
    await prisma.corridorProfile.update({ where: { slug: corridor }, data: { centroidLat: centre.lat, centroidLng: centre.lng } });
  }
  const infraResult = await corridorInfraFromDb(corridor, opts.scoringProjects);
  const infraScore = infraResult.infraScore;
  const infraProjects = infraResult.drivers.map((d) => ({ name: d.name, status: d.status, reImpactScore: Math.round(d.contribution * 10) }));

  // 2–4. RERA projects, developer activity and growth outlook — measured
  // from our listings and the published city anchors (src/lib/market/).
  // These used to read synthetic absorption / search / price-history tables.
  const ctx = opts.ctx ?? (await loadMarketContext());
  const market = buildCorridorMarket(corridor, centre, infraScore, ctx);
  await writeCorridorMarket(corridor, market, false);
  const primary = market.forecast[market.primaryAsset];
  const { approvalScore, demandScore, appreciationScore, overallScore, sentiment: investorSentiment } = marketScores({
    infraScore,
    reraProjects: market.counts.reraProjects,
    activeProjects: market.counts.activeProjects,
    baseCagr5: primary.scenarios.base.cagr5,
  });
  const measured = marketSummary(corridorLabel, market);

  // 6. CALL CLAUDE FOR KEY DRIVERS AND COMMENTARY (with fallback)
  let keyDrivers: string[] = [];
  let keyRisks: string[] = [];
  let bestFor: string[] = [];
  let adminNote = "";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (opts.skipAI || !apiKey || apiKey === "mock-anthropic-key-for-local-testing" || apiKey.trim() === "") {
    console.log("Using local mock AI commentary (API key not configured/mocked)");
    const fallback = getFallbackAIAnalysis(corridor);
    keyDrivers = fallback.keyDrivers;
    keyRisks = fallback.keyRisks;
    bestFor = fallback.bestFor;
    adminNote = measured;
  } else {
    try {
      const anthropic = new Anthropic({ apiKey });
      const systemPrompt = "You are a senior real estate analyst specializing in Hyderabad markets. Always respond ONLY with a clean JSON object. Do not include markdown formatting or explanations.";
      
      const userPrompt = `
        Corridor: ${corridor}
        Infrastructure projects nearby: ${JSON.stringify(infraProjects.map(p => ({ name: p.name, status: p.status, score: p.reImpactScore })))}
        Measured market data: ${JSON.stringify({ rates: market.rates, counts: market.counts, baseCaseGrowthPerYear: primary.scenarios.base.cagr5 })}
        Use only these figures for any numbers you mention; do not invent prices, growth rates or search/demand statistics.
        Overall calculated intelligence score: ${overallScore}/100
        Sentiment: ${investorSentiment}

        Generate key drivers, risks, suitability, and an investor commentary for this corridor.
        Respond ONLY in valid JSON:
        {
          "keyDrivers": ["driver1", "driver2", "driver3"],
          "keyRisks": ["risk1", "risk2"],
          "bestFor": ["PERSONA_NAME1", "PERSONA_NAME2"],
          "adminNote": "2-sentence market commentary for investors"
        }

        Note: bestFor values MUST be selected from: "FIRST_TIME_BUYER", "NRI_INVESTOR", "LAND_SPECULATOR", "RETIREMENT_PLANNER", "HNI_PORTFOLIO_BUILDER", "PROFESSIONAL_FIRST_HOME".
      `;

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const content = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonStart = content.indexOf("{");
      const jsonEnd = content.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(content.substring(jsonStart, jsonEnd + 1));
        keyDrivers = parsed.keyDrivers || [];
        keyRisks = parsed.keyRisks || [];
        bestFor = parsed.bestFor || [];
        adminNote = parsed.adminNote || "";
      } else {
        throw new Error("Could not parse JSON from Claude response");
      }
    } catch (e) {
      console.error("Failed to generate AI commentary from Claude, falling back", e);
      const fallback = getFallbackAIAnalysis(corridor);
      keyDrivers = fallback.keyDrivers;
      keyRisks = fallback.keyRisks;
      bestFor = fallback.bestFor;
      adminNote = measured;
    }
  }

  // Update or Create CorridorIntelligence record
  const result = await prisma.corridorIntelligence.upsert({
    where: {
      corridor: corridor
    },
    update: {
      overallScore,
      infraScore,
      approvalScore,
      demandScore,
      appreciationScore,
      investorSentiment,
      adminNote,
      keyDrivers,
      keyRisks,
      bestFor,
      corridorProfileSlug: corridor,
      lastComputedAt: new Date()
    },
    create: {
      corridor,
      overallScore,
      infraScore,
      approvalScore,
      demandScore,
      appreciationScore,
      investorSentiment,
      adminNote,
      keyDrivers,
      keyRisks,
      bestFor,
      corridorProfileSlug: corridor,
      lastComputedAt: new Date()
    }
  });

  await snapshotCorridor(corridor, infraResult, overallScore);

  // Also update CorridorProfile directly
  await prisma.corridorProfile.update({
    where: { slug: corridor },
    data: {
      overallScore,
      infraScore,
      approvalScore,
      demandScore,
      appreciationScore,
      sentiment: investorSentiment as Sentiment,
      keyDrivers,
      keyRisks,
      bestFor,
      adminNote
    }
  });

  return result;
}

export async function computeAllCorridorScores(opts: { skipAI?: boolean } = {}) {
  // Get all unique corridors from CorridorProfile
  const corridors = await prisma.corridorProfile.findMany({
    select: {
      slug: true
    }
  });

  console.log(`Starting scoring recomputation for ${corridors.length} corridors...`);
  const ctx = await loadMarketContext();
  const scoringProjects = await loadScoringProjects();
  const results = [];
  for (const c of corridors) {
    try {
      const res = await computeCorridorScore(c.slug, { ctx, scoringProjects, skipAI: opts.skipAI });
      results.push(res);
    } catch (e) {
      console.error(`Failed to compute score for ${c.slug}:`, e);
    }
  }
  const centres = await prisma.corridorProfile.findMany({ select: { slug: true, centroidLat: true, centroidLng: true } });
  const synced = await syncReraApprovals(ctx, centres.map((c) => ({ slug: c.slug, centre: c.centroidLat != null && c.centroidLng != null ? { lat: c.centroidLat, lng: c.centroidLng } : null })));
  console.log(`Rebuilt ${synced} RERA approval records from listings`);
  return results;
}

