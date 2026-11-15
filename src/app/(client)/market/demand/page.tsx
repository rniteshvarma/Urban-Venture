/**
 * /market/demand — what Hyderabad buyers are looking at, from their own
 * actions on Property Tiger (src/lib/market/demand.ts). Aggregate counts only;
 * hidden until enough buyers have acted.
 */
import Link from "next/link";
import { pageMeta } from "@/lib/site";
import { buyerDemand, MIN_PER_AREA, MIN_TOTAL } from "@/lib/market/demand";

export const revalidate = 3600;

export const metadata = pageMeta(
  "/market/demand",
  "What Hyderabad buyers are looking at | Property Tiger",
  "Which Hyderabad areas, property types and budgets buyers are asking about on Property Tiger in the last 90 days — counted as distinct buyers, refreshed hourly.",
);

function Bars({ rows, label }: { rows: { name: string; buyers: number; share: number }[]; label: string }) {
  const max = Math.max(...rows.map((r) => r.buyers), 1);
  return (
    <ul className="space-y-2.5" aria-label={label}>
      {rows.map((r) => (
        <li key={r.name} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] sm:grid-cols-[14rem_1fr_auto] items-center gap-3 text-sm">
          <span className="font-semibold text-text-primary truncate" title={r.name}>{r.name}</span>
          <span className="h-2.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden><span className="block h-full rounded-full" style={{ width: `${(r.buyers / max) * 100}%`, background: "var(--color-saffron)" }} /></span>
          <span className="font-mono text-xs text-text-secondary whitespace-nowrap">{r.buyers} buyers · {r.share}%</span>
        </li>
      ))}
    </ul>
  );
}

export default async function DemandPage() {
  const d = await buyerDemand(90).catch(() => null);
  const since = d?.since.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8 w-full">
      <header className="space-y-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-saffron-deep" style={{ fontFamily: "var(--font-mono)" }}>Buyer demand · last 90 days</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary" style={{ fontFamily: "var(--font-jakarta)" }}>What Hyderabad buyers are looking at</h1>
        <p className="text-sm text-text-secondary max-w-3xl">
          From buyers&apos; own actions on Property Tiger: enquiries, site-visit requests, saved homes, saved searches and homes opened by signed-in buyers.
          Each buyer counts once per area, however often they act. Areas with fewer than {MIN_PER_AREA} buyers aren&apos;t shown.
        </p>
      </header>

      {!d || !d.enough ? (
        <div className="card-premium !p-8 text-center space-y-2">
          <p className="font-bold text-text-primary">Not enough buyer activity to publish yet.</p>
          <p className="text-sm text-text-secondary">
            We show this once at least {MIN_TOTAL} different buyers have acted in the last 90 days{d ? ` (${d.buyers} so far)` : ""}, so no one buyer can be picked out.
          </p>
          <Link href="/market" className="text-sm font-semibold underline">See area prices instead</Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-text-primary"><strong>{d.buyers.toLocaleString("en-IN")}</strong> buyers since {since}.</p>
          <section className="card-premium !p-6 space-y-4" aria-labelledby="areas-h">
            <h2 id="areas-h" className="text-lg font-bold text-text-primary">Areas</h2>
            <Bars label="Buyers by area" rows={d.areas.map((a) => ({ name: a.area, buyers: a.buyers, share: a.share }))} />
          </section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="card-premium !p-6 space-y-4" aria-labelledby="types-h">
              <h2 id="types-h" className="text-lg font-bold text-text-primary">Property types</h2>
              <Bars label="Buyers by property type" rows={d.types.map((t) => ({ name: t.type, buyers: t.buyers, share: t.share }))} />
            </section>
            <section className="card-premium !p-6 space-y-4" aria-labelledby="budgets-h">
              <h2 id="budgets-h" className="text-lg font-bold text-text-primary">Budgets buyers stated</h2>
              {d.budgets.length ? <Bars label="Buyers by budget" rows={d.budgets.map((b) => ({ name: b.band, buyers: b.buyers, share: b.share }))} />
                : <p className="text-sm text-text-secondary">Too few buyers stated a budget to show.</p>}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
