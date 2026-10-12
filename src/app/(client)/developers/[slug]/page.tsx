/**
 * /developers/[slug] — one developer's track record: projects in our
 * listings, TG-RERA completion dates vs the developer's own targets, delays
 * and extensions, declared litigation, and TG-RERA orders naming them.
 * Every figure says how many projects it covers and links its document.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { FLAG_LABEL, ORDER_KIND_LABEL, monthYear, months, recordOf } from "@/lib/developers/display";
import type { Flag } from "@/lib/developers/track-record";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await prisma.developer.findUnique({ where: { slug }, select: { name: true } });
  return d
    ? { title: `${d.name} — track record | Property Tiger`, description: `${d.name}: projects, TG-RERA completion dates, delays, extensions and TG-RERA orders, from public records.` }
    : { title: "Developer not found | Property Tiger" };
}

const TONE = { alert: "bg-alert-wash text-alert border-alert/30", warn: "bg-amber-50 text-amber-800 border-amber-200", info: "bg-slate-50 text-text-secondary border-slate-200" } as const;

function FlagChip({ f, detail }: { f: Flag; detail?: string }) {
  const meta = FLAG_LABEL[f];
  return (
    <span title={meta.explain} className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-bold ${TONE[meta.tone]}`}>
      {meta.label}{detail ? ` · ${detail}` : ""}
    </span>
  );
}

function Tile({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value mt-1">{value}</div>
      {note && <p className="text-[10px] text-text-secondary mt-1 leading-relaxed">{note}</p>}
    </div>
  );
}

export default async function DeveloperPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await prisma.developer.findUnique({ where: { slug } });
  const rec = recordOf(d?.stats);
  if (!d || !rec) notFound();
  const s = rec.stats;

  return (
    <div className="bg-surface-dim min-h-screen">
      <div className="bg-white border-b border-luxury py-3 px-6">
        <div className="max-w-6xl mx-auto"><Link href="/developers" className="text-xs font-semibold text-text-secondary hover:text-text-primary">← All developers</Link></div>
      </div>

      <section className="px-6 py-10" style={{ background: "var(--color-ink)" }}>
        <div className="max-w-6xl mx-auto space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-saffron)", fontFamily: "var(--font-mono)" }}>Developer track record</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white" style={{ fontFamily: "var(--font-jakarta)" }}>{d.name}</h1>
          <p className="text-xs" style={{ color: "var(--color-text-invert-mid)" }}>
            {[d.established ? `Established ${d.established}` : null, d.legalNames.length ? `Registered with TG-RERA as ${d.legalNames.join(", ")}` : null, d.aliases.length ? `Also listed as ${d.aliases.join(", ")}` : null].filter(Boolean).join(" · ")}
          </p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Tile label="Projects in our listings" value={s.projects} note={`${s.completed} ready to move · ${s.underConstruction} under construction`} />
          <Tile
            label="On track with RERA dates"
            value={s.onTrackPct == null ? "—" : `${s.onTrackPct}%`}
            note={s.withReraDeadline ? `Of ${s.withReraDeadline} project${s.withReraDeadline === 1 ? "" : "s"} with a RERA completion date: delivered or still within it` : "We don't have this developer's RERA completion dates yet"}
          />
          <Tile
            label="RERA dates extended"
            value={s.withCertificate ? s.extended : "—"}
            note={s.withCertificate ? `Of ${s.withCertificate} project${s.withCertificate === 1 ? "" : "s"} whose TG-RERA certificate we read${s.avgExtensionMonths ? ` · average ${months(s.avgExtensionMonths)}` : ""}` : "No TG-RERA certificate read yet"}
          />
          <Tile label="TG-RERA orders naming them" value={s.regulatoryOrders} note={`Declared litigation on ${s.litigationDeclared} project${s.litigationDeclared === 1 ? "" : "s"}${s.revoked ? ` · ${s.revoked} registration${s.revoked === 1 ? "" : "s"} revoked` : ""}`} />
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">Delay tracker</h2>
          <p className="text-xs text-text-secondary max-w-3xl leading-relaxed">
            The RERA date is the completion date the developer registered with TG-RERA (the revised one, if extended) — read from the project&apos;s TG-RERA
            certificate where we have it, otherwise as quoted by our listing source. The developer&apos;s target is the possession month they advertise.
          </p>
          <div className="bg-white border border-luxury rounded overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-luxury text-[10px] font-bold uppercase text-text-secondary">
                  <th className="px-4 py-3">Project</th>
                  <th className="px-3 py-3">TG-RERA no.</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">RERA date</th>
                  <th className="px-3 py-3">Developer&apos;s target</th>
                  <th className="px-3 py-3">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rec.projects.map((p) => (
                  <tr key={p.id} className="align-top">
                    <td className="px-4 py-2.5"><Link href={`/projects/${p.id}`} className="font-semibold text-text-primary hover:underline">{p.name}</Link></td>
                    <td className="px-3 py-2.5 font-mono text-[11px]">
                      {p.reraNumbers.length ? (p.certificateUrl ? <a href={p.certificateUrl} target="_blank" rel="noreferrer" className="underline">{p.reraNumbers[0]}</a> : p.reraNumbers[0]) : "—"}
                      {p.reraNumbers.length > 1 && <span className="text-text-secondary"> +{p.reraNumbers.length - 1}</span>}
                    </td>
                    <td className="px-3 py-2.5">{p.completed ? "Ready" : "Under construction"}</td>
                    <td className="px-3 py-2.5">
                      {monthYear(p.reraDeadline)}
                      {p.originalDeadline && <div className="text-[10px] text-text-secondary">originally {monthYear(p.originalDeadline)}</div>}
                      {p.reraDeadlineSource === "listing source" && <div className="text-[10px] text-text-secondary">as listed, not yet checked on TG-RERA</div>}
                    </td>
                    <td className="px-3 py-2.5">{monthYear(p.target)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {p.flags.map((f) => (
                          <FlagChip key={f} f={f} detail={f === "OVERDUE" ? months(p.monthsOverdue) : f === "EXTENDED" ? `+${months(p.monthsExtended)}` : f === "BEHIND_TARGET" ? months(p.monthsBehindTarget) : undefined} />
                        ))}
                        {!p.flags.length && <span className="text-text-secondary">{p.reraDeadline || p.target ? "None" : "No dates to check"}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">TG-RERA orders naming {d.name}</h2>
          {rec.orders.length === 0 ? (
            <p className="text-xs text-text-secondary">None found. We match an order only when the developer named in it is exactly this developer (or its registered promoter).</p>
          ) : (
            <>
              <p className="text-xs text-text-secondary max-w-3xl leading-relaxed">
                Orders published by the Telangana Real Estate Regulatory Authority in which this developer is the respondent. An order records that a case was
                heard — it may have been dismissed, settled or decided either way. Open the order to read the outcome.
              </p>
              <ul className="bg-white border border-luxury rounded divide-y divide-slate-100">
                {rec.orders.map((o) => (
                  <li key={o.id} className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                    <span>
                      <span className="font-semibold text-text-primary">{ORDER_KIND_LABEL[o.kind] ?? o.kind}</span>
                      <span className="text-text-secondary"> · {o.title}{o.projectName ? ` · ${o.projectName}` : ""}</span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0">
                      <span className="text-text-secondary">{o.date ? new Date(o.date).toLocaleDateString("en-IN", { dateStyle: "medium" }) : ""}</span>
                      <a href={o.url} target="_blank" rel="noreferrer" className="underline font-semibold">Read the order</a>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <p className="text-[11px] text-text-secondary leading-relaxed max-w-3xl">
          Sources: TG-RERA project certificates (rerait.telangana.gov.in), TG-RERA orders and revocations (rera.telangana.gov.in), and our listing sources
          for advertised possession dates. This covers only projects in our listings and is not a complete history of the developer. Always check a project
          on TG-RERA before you pay. Spotted an error? Tell us and we&apos;ll correct it.
        </p>
      </main>
    </div>
  );
}
