/**
 * Regression sweep: every page and every parameter-free GET endpoint, as an
 * anonymous visitor, a buyer and an admin, against a LOCAL dev server.
 * Flags server errors (5xx), unexpected redirects and access mistakes.
 *
 *   npx tsx --env-file=.env.local --env-file=.env.test.local scripts/test/regression.ts
 */
import prisma from "../../src/lib/prisma";

const BASE = "http://localhost:3000";
const PW = process.env.TEST_PASSWORD!;

class Client {
  jar = new Map<string, string>();
  async req(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (this.jar.size) headers.set("cookie", [...this.jar].map(([k, v]) => `${k}=${v}`).join("; "));
    const res = await fetch(BASE + path, { ...init, headers, redirect: "manual", signal: AbortSignal.timeout(180_000) });
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(";");
      const i = kv.indexOf("=");
      this.jar.set(kv.slice(0, i), kv.slice(i + 1));
    }
    return res;
  }
  async login(email: string) {
    const { csrfToken } = await (await this.req("/api/auth/csrf")).json();
    await this.req("/api/auth/callback/credentials", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrfToken, email, password: PW, json: "true" }).toString() });
    return (await (await this.req("/api/auth/session")).json())?.user;
  }
}

const problems: string[] = [];
let checked = 0;
async function expect(c: Client, who: string, path: string, ok: (status: number, location: string | null) => boolean, what: string) {
  checked++;
  try {
    const r = await c.req(path);
    const loc = r.headers.get("location");
    if (!ok(r.status, loc)) problems.push(`${who.padEnd(6)} ${path} → ${r.status}${loc ? ` → ${loc}` : ""} (expected ${what})`);
  } catch (e) {
    problems.push(`${who.padEnd(6)} ${path} → ${(e as Error).message}`);
  }
}

async function main() {
  const anon = new Client(), buyer = new Client(), admin = new Client();
  const bu = await buyer.login(process.env.TEST_BUYER_A_EMAIL!);
  const ad = await admin.login(process.env.TEST_ADMIN_EMAIL!);
  if (!bu || ad?.role !== "ADMIN") throw new Error("test sign-in failed");

  // Real ids for the dynamic pages
  const project = await prisma.project.findFirst({ where: { status: "ACTIVE", listingStatus: "APPROVED", reviewState: "PUBLISHED" }, select: { id: true } });
  const land = await prisma.project.findFirst({ where: { propertyType: "Land" }, select: { id: true } });
  const corridor = await prisma.corridorProfile.findFirst({ select: { slug: true } });
  const dev = await prisma.developer.findFirst({ select: { slug: true } });
  const lead = await prisma.lead.findFirst({ select: { id: true } });
  const source = await prisma.inboundSource.findFirst({ select: { id: true } });
  const broadcast = await prisma.broadcast.findFirst({ select: { id: true } });
  const purchase = await prisma.propertyPurchase.findFirst({ select: { id: true } });

  const publicPages = ["/", "/projects", `/projects/${project!.id}`, `/projects/${land?.id ?? project!.id}`, "/projects/compare", "/market", `/market/${corridor!.slug}`, "/market/approvals", "/market/compare", "/market/forecast", "/market/legal", "/developers", `/developers/${dev!.slug}`, "/explore", "/news", "/research", "/calculator", "/legal/privacy", "/legal/terms", "/legal/content-policy", "/login", "/signup", "/forgot-password", "/alerts/unsubscribed", "/reports/unsubscribed", "/sitemap.xml", "/robots.txt"];
  for (const p of publicPages) await expect(anon, "anon", p, (s) => s === 200, "200");

  const userPages = ["/dashboard", "/dashboard/settings/reports", "/dashboard/selling/new", "/portal", "/portal/properties"];
  for (const p of userPages) await expect(anon, "anon", p, (s, l) => s >= 300 && s < 400 && !!l && /login/.test(l), "redirect to login");
  for (const p of userPages) await expect(buyer, "buyer", p, (s, l) => s === 200 || (s >= 300 && s < 400 && !/login/.test(l ?? "")), "200");

  const adminPages = ["/admin/dashboard", "/admin/leads", ...(lead ? [`/admin/leads/${lead.id}`] : []), "/admin/projects", "/admin/projects/new", "/admin/projects/review", ...(project ? [`/admin/projects/${project.id}`] : []), "/admin/pipeline", "/admin/analytics", "/admin/customers", "/admin/enquiries", "/admin/site-visits", "/admin/sellers", "/admin/matches", "/admin/personas", "/admin/purchases", "/admin/purchases/new", ...(purchase ? [`/admin/purchases/${purchase.id}`] : []), "/admin/broadcasts", "/admin/broadcasts/new", "/admin/broadcasts/history", "/admin/broadcasts/templates", ...(broadcast ? [`/admin/broadcasts/history/${broadcast.id}`] : []), "/admin/integrations", "/admin/integrations/setup-guide", ...(source ? [`/admin/integrations/${source.id}/setup`, `/admin/integrations/${source.id}/logs`, `/admin/integrations/${source.id}/settings`, `/admin/integrations/${source.id}/field-mapping`] : []), "/admin/whatsapp", "/admin/whatsapp/logs", "/admin/settings/whatsapp", "/admin/concierge", "/admin/concierge/simulator", "/admin/infrastructure/updates", "/admin/infrastructure/market", "/admin/infrastructure/projects", "/admin/infrastructure/approvals", "/admin/infrastructure/appreciation", "/admin/infrastructure/demand", "/admin/infrastructure/intelligence", "/admin/system"];
  for (const p of adminPages) await expect(admin, "admin", p, (s) => s === 200, "200");
  for (const p of adminPages.slice(0, 6)) await expect(buyer, "buyer", p, (s, l) => s >= 300 && s < 400 && !!l && /admin\/login/.test(l), "redirect to admin login");
  await expect(anon, "anon", "/admin/login", (s) => s === 200, "200");

  const adminApis = ["/api/admin/analytics", "/api/admin/analytics/pipeline", "/api/admin/appreciation", "/api/admin/approvals", "/api/admin/broadcasts", "/api/admin/broadcasts/templates/email", "/api/admin/broadcasts/templates/whatsapp", "/api/admin/concierge/conversations", "/api/admin/corridors", "/api/admin/customers", "/api/admin/demand", "/api/admin/enquiries", "/api/admin/infra-intel/overview", "/api/admin/infra-intel/runs", "/api/admin/infra-intel/signals", "/api/admin/infra-intel/sources", "/api/admin/infra-projects", "/api/admin/integrations", "/api/admin/leads", "/api/admin/market/crosscheck", "/api/admin/market/observations", "/api/admin/matching", "/api/admin/personas/stats", "/api/admin/pipeline", "/api/admin/projects", "/api/admin/purchases", "/api/admin/sellers", "/api/admin/site-visits", "/api/admin/system", "/api/admin/whatsapp/logs", "/api/admin/whatsapp/overview", "/api/admin/whatsapp/templates"];
  for (const p of adminApis) await expect(admin, "admin", p, (s) => s < 400, "<400");
  for (const p of adminApis) await expect(buyer, "buyer", p, (s) => s === 401 || s === 403, "401/403");

  const publicApis = ["/api/health", "/api/calculator/corridors", "/api/explore/count", "/api/explore/infrastructure", "/api/explore/properties?bbox=78.2,17.2,78.7,17.6", "/api/geo/search?q=kokapet", "/api/market/approvals", "/api/market/compare", "/api/market/corridors", "/api/market/infrastructure", "/api/market/legal", "/api/market/pulse", "/api/news", "/api/news/cities", "/api/projects", "/api/projects/corridors", "/api/projects/locations", `/api/market/corridors/${corridor!.slug}`, `/api/market/corridors/${corridor!.slug}/analysis`, `/api/market/corridors/${corridor!.slug}/infra`, `/api/market/corridors/${corridor!.slug}/appreciation`, `/api/projects/${project!.id}`];
  for (const p of publicApis) await expect(anon, "anon", p, (s) => s === 200, "200");

  const userApis = ["/api/dashboard", "/api/reports", "/api/reports/archive", "/api/reports/areas", "/api/reports/preferences", "/api/saved/projects", "/api/saved/searches", "/api/watchlist", "/api/portal/properties", "/api/seller/profile"];
  for (const p of userApis) await expect(buyer, "buyer", p, (s) => s < 500 && s !== 401, "signed-in response");
  for (const p of userApis.filter((p) => p !== "/api/saved/projects")) await expect(anon, "anon", p, (s) => s === 401 || s === 403, "401/403");

  console.log(`${checked} checks, ${problems.length} problem(s)`);
  for (const p of problems) console.log("  " + p);
  await prisma.$disconnect();
  process.exit(problems.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(2);
});
