/**
 * Functional test suite — drives a running dev server over HTTP.
 *
 *   npm run dev            # in one terminal
 *   npm run test:func      # in another
 *
 * These are black-box tests: they assert on status codes and payload shapes the
 * way a real client sees them, so middleware, route handlers, auth and the
 * database are all exercised together.
 *
 * NOTE: the suite creates a small number of records (one client account, one
 * seller profile) in whatever database DATABASE_URL points at. Run it against a
 * development database, never production.
 */
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { req, login, whoami, Jar, ADMIN, freshClient } from "./helpers";

let adminJar: Jar;
let clientJar: Jar;
const client = freshClient();

before(async () => {
  const health = await req("/api/projects");
  assert.equal(health.status, 200, "dev server must be running on the test base URL");
});

/* ────────────────────────────────────────────────────────────────────────────
 * A. Access control — the security boundary
 * ──────────────────────────────────────────────────────────────────────────── */
describe("A. Access control", () => {
  test("A1: destructive seed-temp endpoint no longer exists", async () => {
    const r = await req("/api/admin/seed-temp");
    assert.equal(r.status, 404);
  });

  test("A2: seed-production endpoint no longer exists (incl. old key)", async () => {
    assert.equal((await req("/api/admin/seed-production")).status, 404);
    assert.equal((await req("/api/admin/seed-production?key=urban2026")).status, 404);
  });

  test("A3: admin integrations rejects anonymous callers", async () => {
    const r = await req("/api/admin/integrations");
    assert.equal(r.status, 401);
  });

  test("A4: admin integrations does not leak webhook tokens to anonymous callers", async () => {
    const r = await req("/api/admin/integrations");
    assert.ok(!r.text.includes("webhookToken"), "webhookToken must not appear in an unauthorized response");
  });

  test("A5: every admin sub-route rejects anonymous callers", async () => {
    const paths = [
      "/api/admin/integrations",
      "/api/admin/customers",
      "/api/admin/projects",
      "/api/admin/leads",
    ];
    for (const p of paths) {
      const r = await req(p);
      assert.ok([401, 403].includes(r.status), `${p} returned ${r.status}, expected 401/403`);
    }
  });

  test("A6: WhatsApp webhook fails closed without a configured secret", async () => {
    const r = await req("/api/admin/whatsapp/webhook", { method: "POST", body: { id: "x", status: "read" } });
    assert.ok([401, 503].includes(r.status), `expected 401/503, got ${r.status}`);
  });

  test("A7: the dashboard rejects anonymous callers outright", async () => {
    const r = await req("/api/dashboard");
    assert.equal(r.status, 401);
  });

  test("A7b: anon-readable list APIs return an empty list, never another user's rows", async () => {
    // House convention: personalised GETs degrade to `{items: []}` for signed-out
    // visitors (anonymous shortlisting is a product feature via pushAnonActivity),
    // while the corresponding writes require a session. 200 is therefore correct
    // here; leaking rows would not be.
    for (const p of ["/api/saved/projects", "/api/watchlist", "/api/reports"]) {
      const r = await req(p);
      assert.equal(r.status, 200, `${p} should stay anon-readable`);
      assert.deepEqual(r.body?.items, [], `${p} must return an empty list to anonymous callers`);
    }
  });

  test("A7c: report writes still require a session", async () => {
    const r = await req("/api/reports", { method: "POST", body: { searchId: "whatever" } });
    assert.equal(r.status, 401, "saving a report anonymously must be rejected");
  });

  test("A8: seller APIs reject anonymous callers", async () => {
    for (const p of ["/api/seller/profile", "/api/seller/listings", "/api/seller/enquiries"]) {
      const r = await req(p);
      assert.ok([401, 403].includes(r.status), `${p} returned ${r.status}, expected 401/403`);
    }
  });

  test("A9: /dashboard redirects anonymous browsers to /login", async () => {
    const r = await req("/dashboard");
    assert.equal(r.status, 307);
  });

  test("A10: /admin redirects non-admin browsers away", async () => {
    const r = await req("/admin/dashboard");
    assert.ok([302, 307].includes(r.status), `expected redirect, got ${r.status}`);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * B. Authentication flows
 * ──────────────────────────────────────────────────────────────────────────── */
describe("B. Authentication", () => {
  test("B1: signup rejects a malformed email", async () => {
    const r = await req("/api/auth/signup", { method: "POST", body: { ...client, email: "not-an-email" } });
    assert.equal(r.status, 400);
  });

  test("B2: signup rejects a short password", async () => {
    const r = await req("/api/auth/signup", { method: "POST", body: { ...client, password: "short" } });
    assert.equal(r.status, 400);
  });

  test("B3: signup rejects an invalid Indian mobile number", async () => {
    const r = await req("/api/auth/signup", { method: "POST", body: { ...client, phone: "+911234567890" } });
    assert.equal(r.status, 400);
  });

  test("B4: signup succeeds with valid details", async () => {
    const r = await req("/api/auth/signup", { method: "POST", body: client });
    assert.ok([200, 201].includes(r.status), `signup returned ${r.status}: ${r.text.slice(0, 200)}`);
  });

  test("B5: duplicate signup is rejected with 409", async () => {
    const r = await req("/api/auth/signup", { method: "POST", body: client });
    assert.equal(r.status, 409);
  });

  test("B6: login with correct credentials establishes a session", async () => {
    clientJar = await login(client.email, client.password);
    const me = await whoami(clientJar);
    assert.ok(me, "expected a session user");
    assert.equal(me!.email, client.email.toLowerCase());
    assert.equal(me!.role, "CLIENT");
  });

  test("B7: login with a wrong password establishes no session", async () => {
    const jar = await login(client.email, "definitely-wrong-password");
    const me = await whoami(jar);
    assert.equal(me, null, "a bad password must not produce a session");
  });

  test("B8: admin login yields the ADMIN role", async () => {
    adminJar = await login(ADMIN.email, ADMIN.password);
    const me = await whoami(adminJar);
    assert.ok(me, "expected an admin session");
    assert.equal(me!.role, "ADMIN");
  });

  test("B9: forgot-password does not leak whether an account exists", async () => {
    const known = await req("/api/auth/forgot-password", { method: "POST", body: { email: client.email } });
    const unknown = await req("/api/auth/forgot-password", { method: "POST", body: { email: "nobody-here-xyz@example.com" } });
    assert.equal(known.status, unknown.status, "status must not differ by account existence");
    assert.deepEqual(known.body, unknown.body, "body must not differ by account existence");
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * C. Privilege separation — a CLIENT must not reach admin surfaces
 * ──────────────────────────────────────────────────────────────────────────── */
describe("C. Privilege separation", () => {
  test("C1: a signed-in CLIENT cannot read admin integrations", async () => {
    const r = await req("/api/admin/integrations", { jar: clientJar });
    assert.ok([401, 403].includes(r.status), `CLIENT got ${r.status} on an admin route`);
  });

  test("C2: a signed-in CLIENT cannot list admin customers", async () => {
    const r = await req("/api/admin/customers", { jar: clientJar });
    assert.ok([401, 403].includes(r.status), `CLIENT got ${r.status} on an admin route`);
  });

  test("C3: a signed-in CLIENT cannot create an inbound source", async () => {
    const r = await req("/api/admin/integrations", { method: "POST", jar: clientJar, body: { name: "evil", type: "PORTAL_WEBHOOK" } });
    assert.ok([401, 403].includes(r.status), `CLIENT got ${r.status} creating an inbound source`);
  });

  test("C4: an ADMIN can read integrations", async () => {
    const r = await req("/api/admin/integrations", { jar: adminJar });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body?.sources), "expected a sources array");
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * D. Public content APIs
 * ──────────────────────────────────────────────────────────────────────────── */
describe("D. Public content", () => {
  test("D1: projects list returns an array", async () => {
    const r = await req("/api/projects");
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body), "expected an array of projects");
  });

  test("D2: a project detail page resolves by id", async () => {
    const list = await req("/api/projects");
    const first = list.body?.[0];
    assert.ok(first?.id, "need at least one seeded project");
    const r = await req(`/api/projects/${first.id}`);
    assert.equal(r.status, 200);
    assert.equal(r.body?.id, first.id);
  });

  test("D3: an unknown project id returns 404, not 500", async () => {
    const r = await req("/api/projects/does-not-exist-xyz");
    assert.equal(r.status, 404, `expected 404, got ${r.status}`);
  });

  test("D4: explore properties returns valid GeoJSON", async () => {
    const r = await req("/api/explore/properties?bbox=78,17,79,18");
    assert.equal(r.status, 200);
    assert.equal(r.body?.type, "FeatureCollection");
    assert.ok(Array.isArray(r.body?.features));
  });

  test("D5: explore infrastructure returns layers", async () => {
    const r = await req("/api/explore/infrastructure?bbox=78,17,79,18");
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body?.layers));
  });

  test("D6: market corridors list is populated", async () => {
    const r = await req("/api/market/corridors");
    assert.equal(r.status, 200);
    const arr = Array.isArray(r.body) ? r.body : r.body?.corridors;
    assert.ok(Array.isArray(arr) && arr.length > 0, "expected seeded corridors");
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * E. Client dashboard & saved items
 * ──────────────────────────────────────────────────────────────────────────── */
describe("E. Client dashboard", () => {
  test("E1: dashboard returns a payload for a signed-in client", async () => {
    const r = await req("/api/dashboard", { jar: clientJar });
    assert.equal(r.status, 200, `dashboard returned ${r.status}`);
    assert.ok(r.body?.user, "expected a user block");
    assert.ok(r.body?.nextAction, "expected a nextAction block");
  });

  test("E2: dashboard greeting is one of the three expected values", async () => {
    const r = await req("/api/dashboard", { jar: clientJar });
    assert.ok(["Good morning", "Good afternoon", "Good evening"].includes(r.body?.greeting));
  });

  test("E3: saving a project then listing it round-trips", async () => {
    const list = await req("/api/projects");
    const id = list.body?.[0]?.id;
    assert.ok(id, "need a seeded project");

    const save = await req("/api/saved/projects", { method: "POST", jar: clientJar, body: { projectId: id } });
    assert.ok([200, 201].includes(save.status), `save returned ${save.status}`);

    const saved = await req("/api/saved/projects", { jar: clientJar });
    assert.equal(saved.status, 200);
    const items = saved.body?.items ?? [];
    assert.ok(items.some((p: any) => p.projectId === id), "saved project should appear in the list");
  });

  test("E4: watchlist add then list round-trips", async () => {
    const corridors = await req("/api/market/corridors");
    const arr = Array.isArray(corridors.body) ? corridors.body : corridors.body?.corridors ?? [];
    // The slug lives on `corridor` (e.g. "kadthal-fcda"); `name` is the label.
    const slug = arr[0]?.corridor;
    assert.ok(slug, "need a seeded corridor");

    // Adding is POST /api/watchlist { corridorSlug }; removal is DELETE /[slug].
    const add = await req("/api/watchlist", { method: "POST", jar: clientJar, body: { corridorSlug: slug } });
    assert.ok([200, 201].includes(add.status), `watch returned ${add.status}`);
    assert.equal(add.body?.anonymous, false, "an authenticated watch must persist, not fall back to the cookie");

    const list = await req("/api/watchlist", { jar: clientJar });
    assert.equal(list.status, 200);
    assert.ok(
      (list.body?.items ?? []).some((w: any) => w.slug === slug || w.corridorSlug === slug),
      "watched corridor should appear in the list"
    );

    const remove = await req(`/api/watchlist/${slug}`, { method: "DELETE", jar: clientJar });
    assert.ok([200, 204].includes(remove.status), `unwatch returned ${remove.status}`);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * F. Seller mode
 * ──────────────────────────────────────────────────────────────────────────── */
describe("F. Seller mode", () => {
  test("F1: a client without a seller profile is told to onboard", async () => {
    const r = await req("/api/seller/listings", { jar: clientJar });
    assert.equal(r.status, 403, `expected 403 NO_SELLER_PROFILE, got ${r.status}`);
    assert.equal(r.body?.code, "NO_SELLER_PROFILE");
  });

  test("F2: seller onboarding creates a profile", async () => {
    const r = await req("/api/seller/profile", { method: "POST", jar: clientJar, body: { sellerType: "OWNER", displayName: "Test Seller" } });
    assert.ok([200, 201].includes(r.status), `onboarding returned ${r.status}: ${r.text.slice(0, 200)}`);
  });

  test("F3: listings become reachable once a profile exists", async () => {
    const r = await req("/api/seller/listings", { jar: clientJar });
    assert.equal(r.status, 200, `expected 200 after onboarding, got ${r.status}`);
  });

  test("F4: a seller cannot read a listing they do not own", async () => {
    const r = await req("/api/seller/listings/some-other-listing-id", { jar: clientJar });
    assert.equal(r.status, 404, "ownership miss must be 404, never another seller's data");
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * G. Scheduled jobs
 * ──────────────────────────────────────────────────────────────────────────── */
describe("G. Cron", () => {
  test("G1: cron routes are reachable in dev and return JSON, not a crash", async () => {
    for (const p of ["/api/cron/listings-daily", "/api/cron/listings-weekly"]) {
      const r = await req(p);
      assert.ok([200, 401, 503].includes(r.status), `${p} returned ${r.status}`);
    }
  });

  test("G2: a wrong bearer token is rejected when CRON_SECRET is configured", async () => {
    if (!process.env.CRON_SECRET) return; // not configured in this environment
    const r = await req("/api/cron/listings-daily", { headers: { authorization: "Bearer wrong-token" } });
    assert.equal(r.status, 401);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * H. Page rendering
 * ──────────────────────────────────────────────────────────────────────────── */
describe("H. Pages render", () => {
  const pages = ["/", "/explore", "/projects", "/market", "/news", "/login", "/signup", "/calculator"];
  for (const p of pages) {
    test(`H: ${p} returns 200 HTML`, async () => {
      const r = await req(p);
      assert.equal(r.status, 200, `${p} returned ${r.status}`);
      assert.ok(r.text.includes("<html"), `${p} did not return an HTML document`);
    });
  }

  test("H9: an unknown route returns 404", async () => {
    const r = await req("/this-page-does-not-exist-xyz");
    assert.equal(r.status, 404);
  });
});
