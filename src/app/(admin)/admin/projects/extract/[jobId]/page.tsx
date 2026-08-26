"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Job {
  status: string; stage?: string | null; progressPct: number; sourceFormat: string;
  inputFileCount: number; usedOCR: boolean; errorMessage?: string | null;
  fieldsExtracted?: number | null; fieldsLowConfidence?: number | null; projectId?: string | null;
}

const STAGES = ["Uploaded", "Analysing content", "Normalising & building draft", "Ready for review"];

export default function ExtractionProgressPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      const res = await fetch(`/api/admin/extraction/${jobId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!active) return;
      setJob(data);
      if (data.status === "READY_FOR_REVIEW") { setTimeout(() => router.push(`/admin/projects/extract/${jobId}/review`), 800); return; }
      if (data.status !== "FAILED") setTimeout(poll, 2000);
    };
    poll();
    return () => { active = false; };
  }, [jobId, router]);

  const failed = job?.status === "FAILED";
  const done = job?.status === "READY_FOR_REVIEW";

  return (
    <div className="max-w-xl mx-auto py-16 px-6">
      <h1 className="text-xl font-bold text-text-primary mb-1">Reading your brochure</h1>
      <p className="text-sm text-text-secondary mb-8">{job ? `${job.inputFileCount} file(s) · ${job.sourceFormat}${job.usedOCR ? " · OCR" : ""}` : "Loading…"}</p>

      {!failed && (
        <>
          <div className="space-y-2 mb-6">
            {STAGES.map((s) => {
              const idx = STAGES.indexOf(s);
              const curIdx = STAGES.indexOf(job?.stage ?? "Uploaded");
              const state = done || idx < curIdx ? "done" : idx === curIdx ? "active" : "todo";
              return (
                <div key={s} className="flex items-center gap-2 text-sm">
                  <span>{state === "done" ? "✓" : state === "active" ? "⟳" : "○"}</span>
                  <span style={{ color: state === "todo" ? "var(--color-text-tertiary)" : "var(--color-text-primary)" }}>{s}</span>
                </div>
              );
            })}
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-line)" }}>
            <div className="h-full transition-all" style={{ width: `${job?.progressPct ?? 10}%`, background: "var(--color-saffron)" }} />
          </div>
          <p className="text-xs text-text-tertiary mt-3">Usually takes 30–120 seconds. You can leave this page.</p>
        </>
      )}

      {done && <p className="mt-6 text-sm" style={{ color: "var(--color-growth)" }}>✓ Extracted {job?.fieldsExtracted ?? 0} fields{job?.fieldsLowConfidence ? ` (${job.fieldsLowConfidence} need attention)` : ""}. Opening review…</p>}

      {failed && (
        <div className="mt-4 p-4 rounded-lg" style={{ background: "var(--color-danger-light, #FEF2F2)", border: "1px solid var(--color-danger)" }}>
          <p className="font-semibold text-sm" style={{ color: "var(--color-danger)" }}>Extraction failed</p>
          <p className="text-sm text-text-secondary mt-1">{job?.errorMessage || "Unknown error"}</p>
          <div className="flex gap-3 mt-3">
            <Link href="/admin/projects/new" className="uv-btn uv-btn-ghost text-xs">Try again</Link>
            <Link href="/admin/projects/new" className="uv-btn uv-btn-ghost text-xs">Enter manually instead</Link>
          </div>
        </div>
      )}
    </div>
  );
}
