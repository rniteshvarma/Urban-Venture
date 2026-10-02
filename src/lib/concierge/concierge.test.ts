/**
 * Concierge unit tests — pure engine, parsers, persona rules, rating and copy.
 * No database, no network.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { advance, initialState, needsExtraction, nextStep } from "./engine";
import { parseAreas, parseBudget, parsePurpose, parseTypes, parseHorizon, parseTimeline, isHandoff } from "./parse";
import { classifyProfile } from "./persona";
import { pickAreas, rankProjects, scoreProject, type CorridorCand, type ProjectCand } from "./match";
import { composeResults } from "./compose";
import type { CorridorOption, EngineState } from "./types";

const CORRIDORS: CorridorOption[] = [
  { slug: "kokapet-neopolis", name: "Kokapet Neopolis Commercial Hub", shortName: "Kokapet", zone: "West", subAreas: ["Narsingi", "Gandipet"] },
  { slug: "shadnagar", name: "Shadnagar NH-44 Growth Corridor", shortName: "Shadnagar", zone: "South", subAreas: ["Kothur"] },
  { slug: "tukkuguda-shamshabad", name: "Tukkuguda-Shamshabad Airport Corridor", shortName: "Tukkuguda", zone: "South", subAreas: ["Shamshabad", "Airport"] },
];

describe("parsers", () => {
  test("budgets in lakhs, crores, rupees and ranges", () => {
    assert.deepEqual(parseBudget("45 lakhs"), { min: 36, max: 45 });
    assert.deepEqual(parseBudget("under 60L"), { min: null, max: 60 });
    assert.deepEqual(parseBudget("1.2 cr"), { min: 96, max: 120 });
    assert.deepEqual(parseBudget("50-80 lakhs"), { min: 50, max: 80 });
    assert.deepEqual(parseBudget("1 to 1.5 crore"), { min: 100, max: 150 });
    assert.deepEqual(parseBudget("₹45,00,000"), { min: 36, max: 45 });
    assert.equal(parseBudget("not decided"), null);
  });

  test("property types, including multi-word ones", () => {
    assert.deepEqual(parseTypes("looking for a villa plot"), { types: ["VILLA_PLOT"], notSure: false });
    assert.deepEqual(parseTypes("2bhk flat"), { types: ["APARTMENT"], notSure: false });
    assert.deepEqual(parseTypes("shop or office"), { types: ["COMMERCIAL_SPACE"], notSure: false });
    assert.deepEqual(parseTypes("not sure"), { types: [], notSure: true });
    assert.equal(parseTypes("hello"), null);
  });

  test("areas by corridor name and sub-area", () => {
    assert.deepEqual(parseAreas("near kokapet", CORRIDORS), { slugs: ["kokapet-neopolis"], suggest: false });
    assert.deepEqual(parseAreas("something in Shamshabad", CORRIDORS), { slugs: ["tukkuguda-shamshabad"], suggest: false });
    assert.deepEqual(parseAreas("anywhere is fine, you suggest", CORRIDORS), { slugs: [], suggest: true });
  });

  test("purpose, horizon, timeline, handoff", () => {
    assert.equal(parsePurpose("for investment"), "INVESTMENT");
    assert.equal(parsePurpose("to live with my family"), "OWN_USE");
    assert.equal(parsePurpose("both"), "BOTH");
    assert.equal(parseHorizon("around 5 years"), 5);
    assert.equal(parseTimeline("ready to move asap"), "READY");
    assert.equal(isHandoff("can I talk to a person"), true);
    assert.equal(isHandoff("villa plot"), false);
  });
});

function run(inputs: Array<{ text?: string; optionId?: string }>, senderName = "Asha Reddy") {
  let state: EngineState = initialState();
  const all = [];
  let last;
  for (const input of inputs) {
    last = advance(state, input, CORRIDORS, { senderName });
    state = last.state;
    all.push(...last.replies);
  }
  return { state, replies: all, last: last! };
}

describe("conversation flow", () => {
  test("a greeting gets the intro plus the first question, using the WhatsApp name", () => {
    const { replies, state } = run([{ text: "Hi" }]);
    assert.equal(replies.length, 1);
    assert.match(replies[0].text, /^Hi Asha 👋/);
    assert.match(replies[0].text, /1\/5 · Is this for \*investment\*/);
    assert.equal(state.step, "PURPOSE");
    assert.deepEqual(replies[0].buttons?.map((b) => b.id), ["p:INVESTMENT", "p:OWN_USE", "p:BOTH"]);
  });

  test("full tap-through reaches completion with every slot filled", () => {
    const { last, state } = run([
      { text: "hello" },
      { optionId: "p:INVESTMENT" },
      { optionId: "t:OPEN_PLOT" },
      { optionId: "a:shadnagar" },
      { optionId: "b:30-60" },
      { optionId: "h:7" },
      { optionId: "x:SKIP" },
    ]);
    assert.equal(last.complete, true);
    assert.equal(state.slots.purpose, "INVESTMENT");
    assert.deepEqual(state.slots.types, ["OPEN_PLOT"]);
    assert.deepEqual(state.slots.areas, ["shadnagar"]);
    assert.equal(state.slots.budgetMaxLakh, 60);
    assert.equal(state.slots.horizonYears, 7);
  });

  test("own-use buyers get the move-in question instead of holding period", () => {
    const { state, replies } = run([{ text: "hi" }, { optionId: "p:OWN_USE" }, { optionId: "t:VILLA" }, { optionId: "a:ANY" }, { optionId: "b:100-200" }]);
    assert.equal(state.step, "TIMELINE");
    assert.match(replies.at(-1)!.text, /move in/);
  });

  test("a rich first message skips everything it already answered", () => {
    const { state, replies } = run([{ text: "Looking for a villa plot in Kokapet for investment, budget around 80 lakhs" }]);
    assert.match(replies[0].text, /Got it: \*villa plot · around Kokapet/);
    assert.equal(state.step, "HORIZON"); // purpose, type, area and budget all captured
  });

  test("typed answers and numbered replies both work", () => {
    const { state } = run([{ text: "hi" }, { text: "investment" }, { text: "2" }]); // "2" → second type option (Villa plot)
    assert.equal(state.slots.purpose, "INVESTMENT");
    assert.deepEqual(state.slots.types, ["VILLA_PLOT"]);
    assert.equal(state.step, "AREA");
  });

  test("an answer to a different question is captured, not treated as a miss", () => {
    const { state, replies } = run([{ text: "hi" }, { optionId: "p:INVESTMENT" }, { text: "somewhere in shadnagar" }]);
    assert.deepEqual(state.slots.areas, ["shadnagar"]);
    assert.equal(state.step, "TYPE");
    assert.match(replies.at(-1)!.text, /^Got it/);
  });

  test("gibberish is re-asked twice, then skipped so nobody gets stuck", () => {
    const r1 = run([{ text: "hi" }, { optionId: "p:BOTH" }, { text: "hmm" }]);
    assert.match(r1.replies.at(-1)!.text, /didn't quite catch/);
    assert.equal(r1.state.step, "TYPE");
    const r2 = run([{ text: "hi" }, { optionId: "p:BOTH" }, { text: "hmm" }, { text: "hmm" }, { text: "hmm" }]);
    assert.equal(r2.state.step, "AREA");
    assert.ok(r2.state.slots.skipped?.includes("TYPE"));
  });

  test("AGENT hands off at any point", () => {
    const { last } = run([{ text: "hi" }, { text: "talk to an agent please" }]);
    assert.equal(last.handoff, true);
  });

  test("the name question only appears when WhatsApp gave no name", () => {
    const { state } = run([{ text: "hi" }], "");
    assert.equal(state.step, "NAME");
    assert.equal(nextStep({ name: "Ravi" }), "PURPOSE");
  });

  test("Claude is only consulted when the parsers can't cope", () => {
    const s = run([{ text: "hi" }, { optionId: "p:INVESTMENT" }]).state; // now at TYPE
    assert.equal(needsExtraction(s, { text: "villa" }, CORRIDORS), false);
    assert.equal(needsExtraction(s, { text: "something my parents can retire into near the lake" }, CORRIDORS), true);
    assert.equal(needsExtraction(s, { optionId: "t:VILLA" }, CORRIDORS), false);
  });

  test("an extraction fills gaps but never overwrites an answer", () => {
    const s = run([{ text: "hi" }, { optionId: "p:INVESTMENT" }]).state;
    const r = advance(s, { text: "some land my family can use later, near the airport, 50L max" }, CORRIDORS, {
      extraction: { purpose: "OWN_USE", propertyTypes: ["OPEN_PLOT"], areaSlugs: ["tukkuguda-shamshabad", "not-a-corridor"], budgetMaxLakh: 50 },
    });
    assert.equal(r.state.slots.purpose, "INVESTMENT");
    assert.deepEqual(r.state.slots.types, ["OPEN_PLOT"]);
    assert.deepEqual(r.state.slots.areas, ["tukkuguda-shamshabad"]); // invalid slug dropped
    assert.equal(r.state.slots.budgetMaxLakh, 50);
  });
});

describe("persona rules", () => {
  test("covers every branch the questions can produce", () => {
    const cases: Array<[Parameters<typeof classifyProfile>[0], string]> = [
      [{ purpose: "INVESTMENT", types: ["COMMERCIAL_SPACE"], budgetMaxLakh: 90 }, "COMMERCIAL_INVESTOR"],
      [{ purpose: "OWN_USE", types: ["FARM_LAND"] }, "FARMLAND_LIFESTYLE"],
      [{ purpose: "INVESTMENT", types: ["OPEN_PLOT"], isNri: true }, "NRI_INVESTOR"],
      [{ purpose: "INVESTMENT", types: ["OPEN_PLOT"], budgetMaxLakh: 300 }, "HNI_PORTFOLIO_BUILDER"],
      [{ purpose: "INVESTMENT", types: ["APARTMENT"], budgetMaxLakh: 70 }, "RENTAL_INCOME_SEEKER"],
      [{ purpose: "INVESTMENT", types: ["OPEN_PLOT"], horizonYears: 2, budgetMaxLakh: 40 }, "LAND_SPECULATOR"],
      [{ purpose: "INVESTMENT", types: ["OPEN_PLOT"], horizonYears: 7, budgetMaxLakh: 40 }, "LAND_BANKER"],
      [{ purpose: "OWN_USE", types: ["VILLA_PLOT"], budgetMaxLakh: 60 }, "SELF_BUILD_HOMEOWNER"],
      [{ purpose: "OWN_USE", types: ["VILLA"], budgetMaxLakh: 150 }, "FAMILY_UPGRADER"],
      [{ purpose: "OWN_USE", types: ["APARTMENT"], budgetMaxLakh: 35 }, "FIRST_TIME_BUYER"],
      [{ purpose: "OWN_USE", types: ["APARTMENT"], budgetMaxLakh: 75 }, "PROFESSIONAL_FIRST_HOME"],
      [{ purpose: "OWN_USE", types: ["APARTMENT"], requirements: "for my retirement" }, "RETIREMENT_PLANNER"],
      [{ purpose: "INVESTMENT", types: ["VILLA"], budgetMaxLakh: 120 }, "RENTAL_INCOME_SEEKER"],
    ];
    for (const [profile, expected] of cases) assert.equal(classifyProfile(profile).persona, expected, JSON.stringify(profile));
  });
});

const P = (over: Partial<ProjectCand>): ProjectCand => ({
  id: over.id ?? "p1", name: over.name ?? "Test Project", developer: "Dev", corridor: "Shadnagar Corridor", corridorSlug: "shadnagar",
  propertyType: "Plots", listingTypes: [], purposes: [], targetPersonas: [], minBudgetLakhs: 20, maxBudgetLakhs: 40,
  minHorizonYears: 3, maxHorizonYears: 8, riskLevel: "MEDIUM", possessionDate: null, reraNumber: null, expectedRentalYieldPct: null, ...over,
});
const C = (over: Partial<CorridorCand>): CorridorCand => ({
  slug: "shadnagar", shortName: "Shadnagar", direction: "SOUTH", overallScore: 70, keyDrivers: ["NH-44 widening"], keyRisks: ["Water supply"],
  forecast5yrMin: 40, forecast5yrMax: 60, plotPriceMidSqYd: 15000, bestHorizonYearsMin: 3, bestHorizonYearsMax: 8, riskLevel: "MEDIUM", ...over,
});

describe("matching and rating", () => {
  const corridors = [C({}), C({ slug: "kokapet-neopolis", shortName: "Kokapet", direction: "WEST", overallScore: 85, plotPriceMidSqYd: 120000 })];
  const profile = { purpose: "INVESTMENT" as const, types: ["OPEN_PLOT" as const], areas: ["shadnagar"], budgetMaxLakh: 40, budgetMinLakh: 25, horizonYears: 6, persona: "LAND_BANKER" as const };

  test("a listing matching type, budget, area and horizon rates highly, with grounded reasons", () => {
    const m = scoreProject(P({}), profile, new Map(corridors.map((c) => [c.slug, c])));
    assert.ok(m.fit >= 90, `fit ${m.fit}`);
    assert.ok(m.rating >= 8, `rating ${m.rating}`);
    assert.match(m.reasons[0], /Open plot — exactly the type you asked for/);
    assert.equal(m.watchOut, "Water supply"); // no mismatch, so the corridor's own risk is the watch-out
  });

  test("mismatches become watch-outs and lower the rating", () => {
    const m = scoreProject(P({ minBudgetLakhs: 46, maxBudgetLakhs: 90, corridor: "Kokapet", corridorSlug: "kokapet-neopolis" }), profile, new Map(corridors.map((c) => [c.slug, c])));
    assert.match(m.watchOut ?? "", /above your budget/);
    assert.ok(m.rating < 8);
  });

  test("untagged listings fall back to the free-text property type", () => {
    const villa = scoreProject(P({ propertyType: "Villa" }), profile, new Map(corridors.map((c) => [c.slug, c])));
    assert.match(villa.watchOut ?? "", /Different property type/);
  });

  test("a listing of a different type is never presented as a match", () => {
    const r = rankProjects([P({ propertyType: "Villa", corridorSlug: "shadnagar" })], { ...profile, types: ["VILLA_PLOT"] }, corridors);
    assert.equal(r.closestOnly, true);
    assert.match(r.matches[0].watchOut ?? "", /Villa rather than villa plot/);
  });

  test("when nothing fits, only the closest two are returned and flagged", () => {
    const r = rankProjects([P({ propertyType: "Villa", minBudgetLakhs: 200, maxBudgetLakhs: 400, corridorSlug: "kokapet-neopolis" })], profile, corridors);
    assert.equal(r.closestOnly, true);
    assert.equal(r.matches.length, 1);
  });

  test("a listing outside the chosen area is only a closest option, and the gap is named", () => {
    const r = rankProjects(
      [
        P({ id: "plot", name: "Shadnagar Plots" }),
        P({ id: "apt", name: "Kokapet Towers", propertyType: "Apartment", corridor: "Kokapet", corridorSlug: "kokapet-neopolis" }),
      ],
      { ...profile, areas: ["kokapet-neopolis"] },
      corridors,
    );
    assert.equal(r.closestOnly, true);
    assert.equal(r.gap, "We don't have an open plot listed in Kokapet yet");
    assert.equal(r.matches[0].project.id, "apt"); // the best listing in their area leads
    assert.ok(r.matches.some((m) => m.project.id === "plot"));
  });

  test("a right-type listing in the area but out of budget names the budget gap", () => {
    const r = rankProjects([P({ corridor: "Kokapet", corridorSlug: "kokapet-neopolis", minBudgetLakhs: 300, maxBudgetLakhs: 500 })], { ...profile, areas: ["kokapet-neopolis"] }, corridors);
    assert.equal(r.closestOnly, true);
    assert.match(r.gap ?? "", /^No open plot in Kokapet fits ₹25L–₹40L yet$/);
  });

  test("a good fit in the chosen area is still a top match", () => {
    const r = rankProjects([P({}), P({ id: "far", corridor: "Kokapet", corridorSlug: "kokapet-neopolis" })], profile, corridors);
    assert.equal(r.closestOnly, false);
    assert.equal(r.gap, null);
    assert.deepEqual(r.matches.map((m) => m.project.id), ["p1"]);
  });

  test("area suggestions respect budget for land buyers", () => {
    const picks = pickAreas({ ...profile, areas: [] }, corridors, 1);
    assert.equal(picks[0].slug, "shadnagar"); // Kokapet scores higher but a plot there is out of a ₹40L budget
  });
});

describe("result messages", () => {
  test("when only closest options exist, the headline names what is missing", () => {
    const corridors = [C({}), C({ slug: "kokapet-neopolis", shortName: "Kokapet", direction: "WEST" })];
    const slots = { types: ["OPEN_PLOT" as const], areas: ["kokapet-neopolis"], budgetMaxLakh: 40 };
    const r = rankProjects([P({ name: "Shadnagar Plots" })], slots, corridors);
    const [results] = composeResults({ name: "Asha", slots, profile: {}, matches: r.matches, closestOnly: r.closestOnly, gap: r.gap, areas: [], quickTake: "x", reportUrl: null });
    assert.match(results.text, /^\*Asha, we don't have an open plot listed in Kokapet yet\.\* Here are the closest options:/);
    assert.doesNotMatch(results.text, /top matches/);
  });

  test("lists matches with rating, reasons, watch-out, disclaimer and next-step buttons", () => {
    const corridors = [C({})];
    const matches = rankProjects([P({ name: "Elite Green Meadows" })], { types: ["OPEN_PLOT"], areas: ["shadnagar"], budgetMaxLakh: 40 }, corridors).matches;
    const [results, next] = composeResults({
      name: "Asha", slots: { types: ["OPEN_PLOT"], areas: ["shadnagar"], budgetMaxLakh: 40 }, profile: {}, matches, closestOnly: false, areas: corridors,
      quickTake: "A strong fit.", reportUrl: "https://example.com/report/abc",
    });
    assert.match(results.text, /\*Asha, here are your top matches\* 🏆/);
    assert.match(results.text, /\*1\. Elite Green Meadows\* — ⭐ \*\d\.\d\/10\*/);
    assert.match(results.text, /⚠️|✅/);
    assert.match(results.text, /not financial advice/);
    assert.ok(results.text.length < 4096);
    assert.match(next.text, /report\/abc/);
    assert.deepEqual(next.buttons?.map((b) => b.id), ["c:VISIT", "c:ADVISOR", "c:WEEKLY"]);
  });
});
