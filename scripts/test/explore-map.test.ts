/**
 * Explore-map end-to-end tests — a REAL browser, not a hidden automation pane.
 *
 *   npm run dev              # in one terminal
 *   npm run test:map         # in another
 *
 * These exist because the map broke in a way none of the other suites could
 * see: the data was correct in the database, correct over HTTP, and correct in
 * React state, but no marker ever appeared. Every check below is one link in
 * the chain from a stored lat/lng to a clickable pin, so a future regression
 * says *which* link broke instead of just "the map looks empty".
 *
 * A headless-but-visible Chrome is required. MapLibre tiles GeoJSON on a Web
 * Worker and only paints on animation frames; a hidden document stalls both, so
 * a hidden browser reports zero markers no matter how healthy the app is.
 */
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { chromium, type Browser, type Page } from "playwright-core";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** A listing known to have coordinates; discovered from the API at setup. */
interface Fixture {
  id: string;
  name: string;
  lng: number;
  lat: number;
}

let browser: Browser;
let page: Page;
let fixture: Fixture;
const consoleErrors: string[] = [];
const failedRequests: string[] = [];

/** Reach the live MapLibre instance through the React fiber on the canvas. */
const MAP_HANDLE = `(() => {
  const cv = document.querySelector('canvas');
  if (!cv) return null;
  let el = cv.parentElement, fk = null, node = null;
  while (el && !fk) {
    fk = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
    if (fk) node = el[fk]; else el = el.parentElement;
  }
  const isMap = o => o && typeof o === 'object'
    && typeof o.getSource === 'function' && typeof o.getZoom === 'function';
  let m = null, f = node, d = 0;
  while (f && d < 40 && !m) {
    let h = f.memoizedState, i = 0;
    while (h && i < 40 && !m) {
      const s = h.memoizedState;
      if (isMap(s)) m = s;
      else if (s && typeof s === 'object' && isMap(s.current)) m = s.current;
      h = h.next; i++;
    }
    f = f.return; d++;
  }
  return m;
})()`;

async function mapState(p: Page) {
  return p.evaluate(`(() => {
    const m = ${MAP_HANDLE};
    if (!m) return { found: false };
    const src = m.getSource('properties');
    let inSource = -1;
    try { inSource = src.serialize().data.features.length; } catch (e) { inSource = -1; }
    return {
      found: true,
      zoom: +m.getZoom().toFixed(2),
      styleLoaded: m.isStyleLoaded(),
      sourceExists: !!src,
      sourceLoaded: m.isSourceLoaded('properties'),
      featuresInSource: inSource,
      featuresInTiles: m.querySourceFeatures('properties').length,
      renderedDots: m.queryRenderedFeatures({ layers: ['property-dots'] }).length,
      dotLayerExists: !!m.getLayer('property-dots'),
    };
  })()`) as Promise<Record<string, unknown>>;
}

/** Poll until the predicate holds or we run out of patience. */
async function waitFor(p: Page, label: string, ok: (s: any) => boolean, ms = 25000) {
  const started = Date.now();
  let last: any = null;
  while (Date.now() - started < ms) {
    last = await mapState(p);
    if (last.found && ok(last)) return last;
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.fail(`timed out waiting for ${label}\nlast state: ${JSON.stringify(last, null, 1)}`);
}

before(async () => {
  // Find a listing that actually has coordinates — the map can only ever show these.
  const res = await fetch(`${BASE}/api/explore/properties?bbox=76,15,80,20`);
  assert.equal(res.status, 200, "explore properties API must respond");
  const fc: any = await res.json();
  assert.ok(fc.features?.length, "need at least one listing with coordinates to test the map");
  const f = fc.features[0];
  fixture = { id: f.properties.id, name: f.properties.name, lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] };

  browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("requestfailed", (r) => failedRequests.push(`${r.url()} — ${r.failure()?.errorText}`));
  page.on("response", (r) => { if (r.status() >= 400) failedRequests.push(`${r.url()} — HTTP ${r.status()}`); });

  await page.goto(`${BASE}/explore?lat=${fixture.lat}&lng=${fixture.lng}&z=15`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { timeout: 20000 });
});

after(async () => { await browser?.close(); });

describe("Explore map — pin renders and opens a card", () => {
  test("M1: the listing used for this test has real coordinates", () => {
    assert.ok(Number.isFinite(fixture.lng) && Number.isFinite(fixture.lat), "coordinates must be numeric");
    assert.ok(fixture.lat > 5 && fixture.lat < 40, `latitude ${fixture.lat} is outside India — lat/lng are probably swapped`);
    assert.ok(fixture.lng > 65 && fixture.lng < 100, `longitude ${fixture.lng} is outside India — lat/lng are probably swapped`);
  });

  test("M2: MapLibre's worker module loads (404 here means no marker can ever render)", async () => {
    const r = await fetch(`${BASE}/maplibre/maplibre-gl-worker.mjs`);
    assert.equal(r.status, 200, "worker must be served — run scripts/copy-maplibre-worker.mjs");
    const type = r.headers.get("content-type") ?? "";
    assert.match(type, /javascript/, `worker served as "${type}"; the browser refuses non-JS MIME types for module workers`);
    const shared = await fetch(`${BASE}/maplibre/maplibre-gl-shared.mjs`);
    assert.equal(shared.status, 200, "the worker imports ./maplibre-gl-shared.mjs from the same directory");
  });

  test("M3: the map style finishes loading", async () => {
    const s = await waitFor(page, "style to load", (x) => x.styleLoaded === true);
    assert.equal(s.styleLoaded, true);
  });

  test("M4: the GeoJSON source exists and holds the listing", async () => {
    const s = await waitFor(page, "features in source", (x) => x.featuresInSource > 0);
    assert.equal(s.sourceExists, true, "source 'properties' must exist");
    assert.ok((s.featuresInSource as number) > 0, "React state must reach the map source");
  });

  test("M5: the source is tiled by the worker — the step that silently failed", async () => {
    const s = await waitFor(page, "source to tile", (x) => x.sourceLoaded === true && x.featuresInTiles > 0);
    assert.equal(s.sourceLoaded, true, "isSourceLoaded false means the worker never processed the data");
    assert.ok((s.featuresInTiles as number) > 0, "querySourceFeatures 0 means nothing was tiled");
  });

  test("M6: a marker is actually painted on the canvas", async () => {
    const s = await waitFor(page, "a rendered dot", (x) => x.renderedDots > 0);
    assert.equal(s.dotLayerExists, true, "the property-dots layer must exist");
    assert.ok((s.renderedDots as number) > 0, "queryRenderedFeatures found no dot — nothing is painted");
  });

  test("M7: clicking the marker opens the property card with the listing's details", async () => {
    // What the card should show, taken from the API rather than hardcoded.
    const detail: any = await (await fetch(`${BASE}/api/explore/properties/${fixture.id}`)).json();

    // map.project() is canvas-relative and the canvas sits below the navbar, so
    // add the canvas offset to get the viewport coordinates the mouse expects.
    const point = await page.evaluate(`(() => {
      const m = ${MAP_HANDLE};
      const f = m.queryRenderedFeatures({ layers: ['property-dots'] })[0];
      if (!f) return null;
      const p = m.project(f.geometry.coordinates);
      const r = m.getCanvas().getBoundingClientRect();
      return { x: Math.round(r.left + p.x), y: Math.round(r.top + p.y) };
    })()`) as { x: number; y: number } | null;
    assert.ok(point, "expected a rendered dot to click");

    await page.mouse.click(point!.x, point!.y);

    // The card leads with the plot area, not the listing name — the name is
    // carried as the image alt. Assert on what the card actually renders.
    await page.waitForFunction(
      `document.body.innerText.includes(${JSON.stringify(detail.location)})`,
      undefined,
      { timeout: 10000 },
    ).catch(() => { /* asserted below with a clearer message */ });

    const text = (await page.evaluate("document.body.innerText")) as string;
    assert.ok(text.includes(detail.location), `card should show the location "${detail.location}"`);
    assert.ok(text.includes(String(detail.priceLakh)), `card should show the price (${detail.priceLakh} Lakh)`);
    assert.ok(/Contact Agent|Shortlist/.test(text), "card should show its action buttons");

    const alts = (await page.evaluate("[...document.images].map(i => i.alt)")) as string[];
    assert.ok(alts.includes(fixture.name), `card image should carry the listing name "${fixture.name}"`);
  });

  test("M7b: selecting a marker records it in the URL so the view is shareable", async () => {
    const search = (await page.evaluate("location.search")) as string;
    assert.match(search, new RegExp(`sel=${fixture.id}`), "selection should be reflected in the URL");
  });

  test("M8: no failed script or worker requests on the page", () => {
    const relevant = failedRequests.filter((u) => /maplibre|worker|\.mjs|_next\/static/.test(u));
    assert.deepEqual(relevant, [], `failed asset requests:\n${relevant.join("\n")}`);
  });

  test("M9: no MIME-type or worker errors in the console", () => {
    const relevant = consoleErrors.filter((e) => /MIME type|worker|module script/i.test(e));
    assert.deepEqual(relevant, [], `console errors:\n${relevant.join("\n")}`);
  });
});
