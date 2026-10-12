/**
 * /developers — every developer with projects in our listings, with the
 * delay and regulatory signals from their projects' public TG-RERA records.
 * Server-rendered (searchable by Google); data from the Developer table
 * (src/lib/developers/sync.ts → rebuildDevelopers).
 */
import Link from "next/link";
import prisma from "@/lib/prisma";
import { recordOf } from "@/lib/developers/display";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Developer track records — Hyderabad | Property Tiger",
  description: "Hyderabad developers' projects, TG-RERA completion dates, delays, extensions, declared litigation and TG-RERA orders — from public records.",
};

type Filter = "all" | "delays" | "orders";

export default async function DevelopersPage({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  const { q = "", f = "all" } = await searchParams;
  const filter: Filter = f === "delays" || f === "orders" ? f : "all";
  const rows = await prisma.developer.findMany({ orderBy: { name: "asc" } });
  const list = rows
    .map((d) => ({ d, r: recordOf(d.stats) }))
    .filter(({ d, r }) => {
      if (!r) return false;
      if (q && !`${d.name} ${d.aliases.join(" ")} ${d.legalNames.join(" ")}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter === "delays") return r.stats.overdue + r.stats.extended + r.stats.behindTarget > 0;
      if (filter === "orders") return r.stats.regulatoryOrders > 0;
      return true;
    })
    .sort((a, b) => b.r!.stats.projects - a.r!.stats.projects || a.d.name.localeCompare(b.d.name));

  const totals = rows.reduce(
    (t, d) => {
      const r = recordOf(d.stats);
      if (!r) return t;
      t.projects += r.stats.projects;
      t.withDeadline += r.stats.withReraDeadline;
      t.overdue += r.stats.overdue;
      t.orders += r.stats.regulatoryOrders;
      return t;
    },
    { projects: 0, withDeadline: 0, overdue: 0, orders: 0 },
  );
  const chip = (key: Filter, label: string) => (
    <Link
      href={{ pathname: "/developers", query: { ...(q ? { q } : {}), ...(key !== "all" ? { f: key } : {}) } }}
      className={filter === key ? "filter-pill-active" : "filter-pill"}
    >
      {label}
    </Link>
  );

  return (
    <div className="bg-surface-dim min-h-screen">
      <section className="px-6 py-12" style={{ background: "var(--color-ink)" }}>
        <div className="max-w-5xl mx-auto space-y-3">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white" style={{ fontFamily: "var(--font-jakarta)" }}>Developer track records</h1>
          <p className="text-sm max-w-2xl leading-relaxed" style={{ color: "var(--color-text-invert-mid)" }}>
            Every developer with projects in our listings: what they&apos;ve delivered, what&apos;s under construction, completion dates registered with
            TG-RERA, extensions, declared litigation, and TG-RERA orders that name them. Built from public records; each figure links to its document.
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-invert-mid)" }}>
            {rows.length} developers · {totals.projects} projects · RERA completion dates for {totals.withDeadline} · {totals.overdue} past their RERA date · {totals.orders} TG-RERA orders matched
          </p>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-5">
        <form action="/developers" className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <input name="q" defaultValue={q} placeholder="Search a developer…" className="input-premium flex-1" aria-label="Search developers" />
          {filter !== "all" && <input type="hidden" name="f" value={filter} />}
          <div className="flex flex-wrap gap-2">{chip("all", "All")}{chip("delays", "With delays")}{chip("orders", "With RERA orders")}</div>
        </form>

        <div className="bg-white border border-luxury rounded overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-luxury text-[10px] font-bold uppercase text-text-secondary">
                <th className="px-4 py-3">Developer</th>
                <th className="px-3 py-3 text-right">Projects</th>
                <th className="px-3 py-3 text-right">Ready</th>
                <th className="px-3 py-3 text-right">Building</th>
                <th className="px-3 py-3 text-right" title="Projects whose TG-RERA completion date has passed without completion">Past RERA date</th>
                <th className="px-3 py-3 text-right" title="Projects whose TG-RERA completion date was extended">Extended</th>
                <th className="px-3 py-3 text-right" title="TG-RERA orders naming the developer">RERA orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map(({ d, r }) => {
                const s = r!.stats;
                return (
                  <tr key={d.slug} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/developers/${d.slug}`} className="font-semibold text-text-primary hover:underline">{d.name}</Link>
                      {d.established && <span className="text-text-secondary"> · since {d.established}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">{s.projects}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{s.completed}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{s.underConstruction}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${s.overdue ? "text-alert font-bold" : "text-text-secondary"}`}>{s.withReraDeadline ? s.overdue : "—"}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${s.extended ? "font-bold" : "text-text-secondary"}`}>{s.withCertificate ? s.extended : "—"}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${s.regulatoryOrders ? "font-bold" : "text-text-secondary"}`}>{s.regulatoryOrders}</td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-text-secondary">No developers match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-text-secondary leading-relaxed">
          “—” means we don&apos;t have that developer&apos;s TG-RERA dates yet, not that there is no delay. Counts cover only projects in our listings.
          Orders are matched to a developer only when the name in the order is exactly the developer&apos;s (or its registered promoter&apos;s) name; an order is
          a record that a case was heard, not a finding of fault — read the order for the outcome.
        </p>
      </main>
    </div>
  );
}
