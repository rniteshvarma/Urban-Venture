/**
 * Layout approval for plots: what we know about the layout permission (LP)
 * and how to check it yourself. We can't verify LP numbers automatically —
 * the official search (BuildNow) sits behind a CAPTCHA — so this says exactly
 * where each statement comes from.
 */
import { ExternalLink, FileCheck } from "lucide-react";
import { layoutApprovalStatus } from "@/lib/inventory/layout-approval";

export default function LayoutApproval(props: { reraNumbers: string[]; approvals: string[]; isLandListing: boolean }) {
  const s = layoutApprovalStatus(props);
  const tone = s.level === "RERA" ? "bg-growth-wash text-growth" : s.level === "SELLER_STATED" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-text-secondary";
  return (
    <section className="card-premium space-y-4 !p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-header text-xl flex items-center gap-2"><FileCheck size={18} className="text-saffron-deep" /> Layout approval</h2>
        <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${tone}`}>{s.label}</span>
      </div>
      <p className="text-sm text-text-secondary leading-relaxed">{s.explain}</p>
      {s.details.length > 0 && (
        <ul className="text-xs text-text-primary list-disc pl-5 space-y-1">
          {s.details.map((d) => <li key={d}>{d}</li>)}
        </ul>
      )}
      <div className="text-xs text-text-secondary space-y-1.5">
        <p className="font-semibold text-text-primary">Check it yourself</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Ask the seller for the layout permission (LP) number and the approved layout copy.</li>
          <li>
            Search the LP number on{" "}
            <a href="https://app.buildnow.telangana.gov.in/citizen-search" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5">BuildNow citizen search <ExternalLink size={10} /></a>{" "}
            (HMDA, GHMC and DTCP layouts). Older HMDA approvals may only be on HMDA&apos;s earlier DPMS system.
          </li>
          <li>Match the survey numbers, the plot number and the approved plot count with what you&apos;re buying, and check the plot isn&apos;t in an area kept for roads or open space.</li>
          <li>An approved layout doesn&apos;t prove the seller&apos;s title — get an Encumbrance Certificate and check the land record too.</li>
        </ol>
      </div>
    </section>
  );
}
