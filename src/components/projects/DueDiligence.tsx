/** Before-you-pay checks for this kind of purchase (src/lib/buyer/checklist.ts). */
import Link from "next/link";
import { ClipboardCheck, ExternalLink } from "lucide-react";
import { checklistFor } from "@/lib/buyer/checklist";
import type { PurchaseKind } from "@/lib/buyer/costs";

export default function DueDiligence({ kind, isLandListing }: { kind: PurchaseKind; isLandListing: boolean }) {
  const list = checklistFor(kind, isLandListing);
  return (
    <section className="card-premium space-y-4 !p-8">
      <h2 className="section-header text-xl flex items-center gap-2"><ClipboardCheck size={18} className="text-saffron-deep" /> Before you pay: {list.label.toLowerCase()} checks</h2>
      <ol className="space-y-3">
        {list.items.map((it, i) => (
          <li key={it.title} className="flex gap-3 text-xs">
            <span className="shrink-0 w-5 h-5 rounded-full bg-saffron-wash text-saffron-deep font-bold flex items-center justify-center text-[10px]">{i + 1}</span>
            <div>
              <div className="font-semibold text-text-primary">{it.title}</div>
              <p className="text-text-secondary leading-relaxed mt-0.5">
                {it.why}
                {it.where && (
                  <>
                    {" "}
                    <a href={it.where.url} target="_blank" rel="noreferrer" className="text-saffron-deep font-semibold inline-flex items-center gap-0.5">{it.where.label} <ExternalLink size={9} /></a>
                  </>
                )}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-[10px] text-text-secondary">General checks, not legal advice — have a property lawyer read the documents. <Link href="/market/legal" className="underline">Common problems in Hyderabad</Link>.</p>
    </section>
  );
}
