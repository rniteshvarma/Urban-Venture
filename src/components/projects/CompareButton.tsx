"use client";

import Link from "next/link";
import { GitCompare } from "lucide-react";
import { useCompare, COMPARE_MAX } from "@/lib/buyer/compare-store";

/** Add / remove a project from the compare list, with a link once there are two. */
export default function CompareButton({ projectId, className = "" }: { projectId: string; className?: string }) {
  const c = useCompare();
  const on = c.has(projectId);
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => c.toggle(projectId)}
        disabled={!on && c.full}
        title={!on && c.full ? `You can compare up to ${COMPARE_MAX} projects` : undefined}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${on ? "bg-saffron text-ink border-saffron" : "bg-white border-slate-200 text-text-primary hover:border-saffron"}`}
      >
        <GitCompare size={13} /> {on ? "In compare" : "Compare"}
      </button>
      {c.ids.length >= 2 && (
        <Link href={`/projects/compare?ids=${c.ids.join(",")}`} className="text-xs font-semibold text-saffron-deep underline">
          Compare {c.ids.length}
        </Link>
      )}
    </div>
  );
}
