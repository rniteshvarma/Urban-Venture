/**
 * Daily buyer alerts: for each buyer, new listings matching their saved
 * searches since the last check, and price changes on their saved projects.
 * One email per buyer, only when there's something to say. The email links
 * to one-click unsubscribe per saved search.
 */
import prisma from "../prisma";
import { sendEmail } from "../email/client";
import { describeFilters, projectWhere, type ProjectFilters } from "../projects/query";
import { PUBLIC_PROJECT, siteUrl } from "../site";
import { lakhLabel } from "../inventory/record";
import { isPlaceholderEmail } from "../placeholder-email";

export interface PriceChange {
  id: string;
  name: string;
  from: number;
  to: number;
}

/** A change worth telling the buyer about: at least 1% and ₹50,000. */
export function priceChanged(from: number | null, to: number): boolean {
  if (from == null || !(from > 0) || !(to > 0)) return false;
  return Math.abs(to - from) >= Math.max(0.5, from * 0.01);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function alertEmailHtml(o: { name: string | null; searches: { label: string; unsubscribe: string; projects: { id: string; name: string; locality: string; price: number }[] }[]; changes: PriceChange[] }) {
  const base = siteUrl();
  const p = (x: string) => `<p style="font-family:sans-serif;font-size:14px;color:#334155;margin:0 0 10px">${x}</p>`;
  const parts: string[] = [p(`Hi${o.name ? ` ${esc(o.name)}` : ""},`)];
  for (const s of o.searches) {
    if (!s.projects.length) continue;
    parts.push(`<h3 style="font-family:sans-serif;font-size:15px;margin:18px 0 6px">${s.projects.length} new for “${esc(s.label)}”</h3>`);
    parts.push(`<ul style="font-family:sans-serif;font-size:14px;padding-left:18px">${s.projects.map((x) => `<li><a href="${base}/projects/${x.id}">${esc(x.name)}</a> — ${esc(x.locality)}, from ${lakhLabel(x.price)}</li>`).join("")}</ul>`);
    parts.push(`<p style="font-family:sans-serif;font-size:11px;color:#94a3b8"><a href="${s.unsubscribe}">Stop alerts for this search</a></p>`);
  }
  if (o.changes.length) {
    parts.push(`<h3 style="font-family:sans-serif;font-size:15px;margin:18px 0 6px">Price changes on your saved projects</h3>`);
    parts.push(`<ul style="font-family:sans-serif;font-size:14px;padding-left:18px">${o.changes.map((c) => `<li><a href="${base}/projects/${c.id}">${esc(c.name)}</a>: starting price ${lakhLabel(c.from)} → <b>${lakhLabel(c.to)}</b></li>`).join("")}</ul>`);
  }
  parts.push(p(`<a href="${base}/dashboard">Manage your alerts</a>`));
  return parts.join("\n");
}

export async function runBuyerAlerts(now = new Date()) {
  const searches = await prisma.savedSearch.findMany({ where: { alertEmail: true }, include: { user: { select: { id: true, email: true, name: true } } } });
  const saved = await prisma.savedProject.findMany({ include: { project: { select: { id: true, name: true, minBudgetLakhs: true, status: true } }, user: { select: { id: true, email: true, name: true } } } });
  const byUser = new Map<string, { email: string; name: string | null; searches: Parameters<typeof alertEmailHtml>[0]["searches"]; changes: PriceChange[]; searchIds: string[]; savedIds: { id: string; price: number }[] }>();
  const bucket = (u: { id: string; email: string; name: string | null }) => {
    if (!byUser.has(u.id)) byUser.set(u.id, { email: u.email, name: u.name, searches: [], changes: [], searchIds: [], savedIds: [] });
    return byUser.get(u.id)!;
  };

  for (const s of searches) {
    const f = s.filters as ProjectFilters;
    const fresh = await prisma.project.findMany({
      where: { AND: [projectWhere(f), PUBLIC_PROJECT, { OR: [{ createdAt: { gt: s.lastCheckedAt } }, { approvedAt: { gt: s.lastCheckedAt } }] }] },
      select: { id: true, name: true, corridor: true, minBudgetLakhs: true, specifications: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    const b = bucket(s.user);
    b.searchIds.push(s.id);
    b.searches.push({
      label: s.name || describeFilters(f),
      unsubscribe: `${siteUrl()}/api/saved/searches/unsubscribe?key=${s.unsubscribeKey}`,
      projects: fresh.map((p) => ({ id: p.id, name: p.name, locality: (p.specifications as { locality?: string } | null)?.locality ?? p.corridor, price: p.minBudgetLakhs })),
    });
  }

  let baselined = 0;
  for (const sp of saved) {
    if (sp.project.status !== "ACTIVE") continue;
    const to = sp.project.minBudgetLakhs;
    if (sp.lastAlertedMinLakh == null) {
      // First look: remember the price; there's nothing to compare yet.
      await prisma.savedProject.update({ where: { id: sp.id }, data: { lastAlertedMinLakh: to } });
      baselined++;
      continue;
    }
    if (priceChanged(sp.lastAlertedMinLakh, to)) {
      const b = bucket(sp.user);
      b.changes.push({ id: sp.project.id, name: sp.project.name, from: sp.lastAlertedMinLakh, to });
      b.savedIds.push({ id: sp.id, price: to });
    }
  }

  let emails = 0, mocked = 0, failed = 0, noEmail = 0;
  for (const b of byUser.values()) {
    const newCount = b.searches.reduce((n, s) => n + s.projects.length, 0);
    // Buyers who signed up by phone have no real email; nothing to send (WhatsApp alerts can come later).
    const reachable = !!b.email && !isPlaceholderEmail(b.email);
    if (!reachable && (newCount || b.changes.length)) noEmail++;
    if (reachable && (newCount || b.changes.length)) {
      const r = await sendEmail({
        to: b.email,
        subject: newCount ? `${newCount} new listing${newCount === 1 ? "" : "s"} for your saved search${b.changes.length ? " + price changes" : ""}` : "Price changes on your saved projects",
        html: alertEmailHtml(b),
        tags: { type: "buyer-alert" },
      });
      if (!r.ok) {
        failed++;
        continue; // leave the markers so the next run tries again
      }
      if (r.mocked) mocked++;
      else emails++;
      for (const sp of b.savedIds) await prisma.savedProject.update({ where: { id: sp.id }, data: { lastAlertedMinLakh: sp.price } });
      if (newCount) await prisma.savedSearch.updateMany({ where: { id: { in: b.searchIds } }, data: { lastAlertedAt: now } });
    }
    await prisma.savedSearch.updateMany({ where: { id: { in: b.searchIds } }, data: { lastCheckedAt: now } });
  }
  return { searches: searches.length, users: byUser.size, emails, mocked, failed, noEmail, baselined };
}
