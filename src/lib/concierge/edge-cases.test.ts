/**
 * Concierge engine & parser edge cases — the messy things real customers send.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { advance, initialState, question, nextStep } from "./engine";
import { parseAreas, parseBudget, parseTypes, parseName, parseHorizon, isSkip, corridorAliasTiers } from "./parse";
import { composeResults, quickTakeFallback } from "./compose";
import { classifyProfile } from "./persona";
import { renderOptionsAsText } from "../whatsapp/send";
import type { CorridorOption, EngineState, Inbound } from "./types";

const CORRIDORS: CorridorOption[] = [
  { slug: "kokapet-neopolis", name: "Kokapet Neopolis Commercial Hub", shortName: "Kokapet", zone: "West", subAreas: ["Narsingi"] },
  { slug: "adibatla", name: "Adibatla IT & Aerospace Corridor", shortName: "Adibatla", zone: "SE", subAreas: [] },
  { slug: "tukkuguda-shamshabad", name: "Tukkuguda-Shamshabad Airport Corridor", shortName: "Tukkuguda", zone: "South", subAreas: [] },
  { slug: "maheshwaram-pharma-city", name: "Maheshwaram Pharma City Growth Belt", shortName: "Maheshwaram", zone: "South", subAreas: [] },
  { slug: "kadthal-fcda", name: "Kadthal FCDA Future City Corridor", shortName: "Kadthal", zone: "South", subAreas: [] },
];

function run(inputs: Inbound[], senderName: string | null = "Ravi Kumar") {
  let state: EngineState = initialState();
  const replies = [];
  let last;
  for (const i of inputs) {
    last = advance(state, i, CORRIDORS, { senderName });
    state = last.state;
    replies.push(...last.replies);
  }
  return { state, replies, last: last! };
}

describe("budget parsing edge cases", () => {
  const cases: Array<[string, { min: number | null; max: number | null } | null]> = [
    ["1cr", { min: 80, max: 100 }],
    ["2 crores", { min: 160, max: 200 }],
    ["80L-1cr", { min: 80, max: 100 }],
    ["₹ 75,00,000 - 1,00,00,000", { min: 75, max: 100 }],
    ["between 40 and 60 lakhs", { min: 40, max: 60 }],
    ["max 50 lacs", { min: null, max: 50 }],
    ["above 2 crore", { min: 200, max: 300 }],
    ["around 1.5 cr", { min: 120, max: 173 }],
    ["depends", null],
    ["no idea", null],
  ];
  for (const [text, expected] of cases) {
    test(JSON.stringify(text), () => assert.deepEqual(parseBudget(text), expected));
  }
});

describe("type, area, name, horizon edge cases", () => {
  test("multiple types in one message", () => {
    assert.deepEqual(parseTypes("villa or independent house")?.types.sort(), ["INDEPENDENT_HOUSE", "VILLA"]);
  });
  test("'villa plot' is not also 'villa' and 'plot'", () => {
    assert.deepEqual(parseTypes("villa plot")?.types, ["VILLA_PLOT"]);
  });
  test("areas: place names beat descriptive words; several areas keep mention order", () => {
    assert.deepEqual(parseAreas("Shamshabad / Aerospace SEZ", [...CORRIDORS, { slug: "x", name: "X", shortName: "Shamshabad", subAreas: [] }])?.slugs[0], "tukkuguda-shamshabad");
    assert.deepEqual(parseAreas("kokapet or adibatla", CORRIDORS)?.slugs, ["kokapet-neopolis", "adibatla"]);
    assert.deepEqual(parseAreas("near the Pharma City", CORRIDORS)?.slugs, ["maheshwaram-pharma-city"]);
    assert.deepEqual(parseAreas("future city", CORRIDORS)?.slugs, ["kadthal-fcda"]);
    assert.equal(parseAreas("gachibowli", CORRIDORS), null);
  });
  test("generic words never become aliases", () => {
    const [t1, t2] = corridorAliasTiers(CORRIDORS[4]);
    assert.ok(!t1.includes("future") && !t2.includes("corridor"));
    assert.ok(t2.includes("future city"));
  });
  test("names: honorific phrases stripped, numbers rejected", () => {
    assert.equal(parseName("my name is ravi teja"), "Ravi Teja");
    assert.equal(parseName("call me ANU"), "Anu");
    assert.equal(parseName("9876543210"), null);
  });
  test("horizon ranges average; words map", () => {
    assert.equal(parseHorizon("3-5 years"), 4);
    assert.equal(parseHorizon("long term"), 8);
  });
  test("skip words", () => {
    for (const w of ["skip", "No", "nothing", "that's all", "none."]) assert.equal(isSkip(w), true, w);
    assert.equal(isSkip("no loan needed"), false);
  });
});

describe("conversation edge cases", () => {
  test("empty first message (media / sticker) still gets the intro", () => {
    const { replies, state } = run([{ text: null }]);
    assert.match(replies[0].text, /Hi Ravi/);
    assert.equal(state.step, "PURPOSE");
  });

  test("an unknown locality is noted and the flow moves on", () => {
    const { state } = run([{ text: "hi" }, { optionId: "p:OWN_USE" }, { optionId: "t:APARTMENT" }, { text: "near Gachibowli" }]);
    assert.equal(state.slots.areaText, "Gachibowli");
    assert.deepEqual(state.slots.areas, []);
    assert.equal(state.step, "BUDGET");
  });

  test("filler at the area question is not mistaken for a place", () => {
    const { state, replies } = run([{ text: "hi" }, { optionId: "p:OWN_USE" }, { optionId: "t:APARTMENT" }, { text: "hmm" }]);
    assert.equal(state.step, "AREA");
    assert.match(replies.at(-1)!.text, /didn't quite catch/);
  });

  test("an answer that also carries another slot fills both", () => {
    const { state } = run([{ text: "hi" }, { optionId: "p:OWN_USE" }, { text: "3bhk flat under 1 crore" }]);
    assert.deepEqual(state.slots.types, ["APARTMENT"]);
    assert.equal(state.slots.budgetMaxLakh, 100);
    assert.equal(state.step, "AREA");
    assert.equal(nextStep(state.slots), "AREA");
  });

  test("double-tap of the same button doesn't skip the next question", () => {
    const { state, replies } = run([{ text: "hi" }, { optionId: "p:INVESTMENT" }, { optionId: "p:INVESTMENT" }]);
    assert.equal(state.step, "TYPE");
    assert.match(replies.at(-1)!.text, /Got it|What kind of property/);
  });

  test("a repeated greeting re-asks warmly, without 'sorry' or a retry", () => {
    const { state, replies } = run([{ text: "hi" }, { text: "hello" }]);
    assert.match(replies.at(-1)!.text, /^Hi again, Ravi 👋/);
    assert.equal(state.retries, 0);
  });

  test("a numbered reply out of range is treated as text, not a crash", () => {
    const { state, replies } = run([{ text: "hi" }, { text: "9" }]);
    assert.equal(state.step, "PURPOSE");
    assert.match(replies.at(-1)!.text, /didn't quite catch/);
  });

  test("skipping every question still completes", () => {
    const { last, state } = run([{ text: "hi" }, { text: "skip" }, { text: "skip" }, { text: "skip" }, { text: "skip" }, { text: "skip" }, { text: "skip" }]);
    assert.equal(last.complete, true);
    assert.equal((state.slots.skipped ?? []).length, 6);
  });

  test("restart mid-flow resets the slots", () => {
    const { last } = run([{ text: "hi" }, { optionId: "p:INVESTMENT" }, { text: "restart" }]);
    assert.equal(last.restart, true);
    assert.deepEqual(last.state.slots, {});
  });

  test("Telugu / emoji / very long text never crash the engine", () => {
    const long = "🙂 ".repeat(1500);
    const { state } = run([{ text: "నమస్కారం" }, { text: long }, { text: "ఇన్వెస్ట్మెంట్ 🏡" }]);
    assert.equal(state.step, "PURPOSE"); // not understood → re-asked, no exception
    const extras = run([{ text: "hi" }, { text: "skip" }, { text: "skip" }, { text: "skip" }, { text: "skip" }, { text: "skip" }, { text: "x".repeat(3000) }]);
    assert.equal(extras.state.slots.requirements?.length, 500);
  });

  test("WhatsApp limits: button titles ≤20, list rows ≤24 / ≤72, ≤10 rows", () => {
    for (const step of ["PURPOSE", "TYPE", "AREA", "BUDGET", "HORIZON", "TIMELINE", "EXTRAS"] as const) {
      const q = question(step, { purpose: "INVESTMENT" }, CORRIDORS);
      for (const b of q.buttons ?? []) assert.ok(b.title.length <= 20, `${step} button "${b.title}"`);
      assert.ok((q.buttons ?? []).length <= 3);
      for (const r of q.list?.rows ?? []) {
        assert.ok(r.title.length <= 24, `${step} row "${r.title}"`);
        assert.ok(!r.description || r.description.length <= 72, `${step} row desc`);
      }
      assert.ok((q.list?.rows ?? []).length <= 10);
      assert.ok(!q.list || q.list.button.length <= 20);
      assert.ok(q.text.length <= 1024);
    }
  });

  test("numbered-text fallback lists every option", () => {
    const q = question("TYPE", {}, CORRIDORS);
    const text = renderOptionsAsText(q.text, q.list!.rows);
    assert.match(text, /1️⃣ Open plot/);
    assert.match(text, /9️⃣ Not sure yet/);
    assert.match(text, /Reply with a number/);
  });
});

describe("copy", () => {
  test("no-match results never claim a match and still carry the disclaimer", () => {
    const [r] = composeResults({ name: "Ravi", slots: { types: ["FARM_LAND"] }, profile: {}, matches: [], closestOnly: true, areas: [], quickTake: "x", reportUrl: null });
    assert.match(r.text, /here's where I'd look/);
    assert.doesNotMatch(r.text, /top matches/);
    assert.match(r.text, /message you as soon as/);
    assert.match(r.text, /not financial advice/);
  });
  test("quick-take fallback grammar: 'an open plot', no duplicated reason", () => {
    assert.match(quickTakeFallback("", { types: ["OPEN_PLOT"] }, [], false), /an open plot/);
  });
  test("persona for 'Both' + villa → family upgrader; NRI + own use stays own-use persona", () => {
    assert.equal(classifyProfile({ purpose: "BOTH", types: ["VILLA"], budgetMaxLakh: 120 }).persona, "FAMILY_UPGRADER");
    assert.equal(classifyProfile({ purpose: "OWN_USE", types: ["APARTMENT"], isNri: true, budgetMaxLakh: 70 }).persona, "PROFESSIONAL_FIRST_HOME");
  });
});
