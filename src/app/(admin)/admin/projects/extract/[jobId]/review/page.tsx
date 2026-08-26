/**
 * Minimal draft-review page (M2). Shows the extracted project + unit types with
 * confidence, and publishes. The full split-viewer / inline-edit review UI is
 * the next milestone; this makes the extracted data visible and publishable.
 */
import React from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import PublishDraftButton from "@/components/admin/PublishDraftButton";

function badge(c?: number | null) {
  if (c == null) return null;
  const [sym, color] = c >= 0.85 ? ["✓", "var(--color-growth)"] : c >= 0.6 ? ["~", "var(--color-saffron)"] : ["⚠", "var(--color-danger)"];
  return <span style={{ color, fontSize: "0.7rem", fontWeight: 700 }}>{sym} {(c * 100).toFixed(0)}%</span>;
}

export default async function DraftReviewPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = await prisma.extractionJob.findUnique({ where: { id: jobId } });
  if (!job?.projectId) {
    return <div className="max-w-2xl mx-auto py-16 px-6 text-text-secondary">No draft found for this job. <Link href="/admin/projects/new" className="text-text-accent">Start over</Link>.</div>;
  }
  const project = await prisma.project.findUnique({
    where: { id: job.projectId },
    include: { unitTypes: { orderBy: { displayOrder: "asc" } }, fieldAudits: true, media: true },
  });
  if (!project) return <div className="py-16 text-center">Draft not found.</div>;

  const auditByPath = new Map(project.fieldAudits.map((a) => [a.fieldPath, a]));
  const row = (label: string, value: React.ReactNode, path?: string) => (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--color-line)" }}>
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="flex items-center gap-2 text-sm text-text-primary font-medium">{value || <span className="text-text-tertiary">—</span>} {path && badge(auditByPath.get(path)?.confidence)}</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: project.reviewState === "NEEDS_ATTENTION" ? "var(--color-danger)" : "var(--color-saffron)" }}>
            {project.reviewState === "NEEDS_ATTENTION" ? "⚠ Needs attention" : "Draft — review before publishing"}
          </span>
          <h1 className="text-2xl font-bold text-text-primary">{project.name}</h1>
          <p className="text-sm text-text-secondary">Source: {job.sourceFormat} · {job.fieldsExtracted ?? 0} fields · overall confidence {((job.overallConfidence ?? 0) * 100).toFixed(0)}%{job.usedOCR ? " · read via OCR/vision — verify numbers" : ""}</p>
        </div>
      </div>

      <div className="rounded-xl border p-5 mb-5" style={{ borderColor: "var(--color-line)" }}>
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">Basics</h2>
        {row("Developer", project.developer, "developer")}
        {row("Corridor", project.corridor)}
        {row("City", project.city, "city")}
        {row("Property type", project.propertyType)}
        {row("RERA number", project.reraNumber, "reraNumber")}
        {row("Possession", project.possessionText, "possessionText")}
        {row("Total units", project.totalUnits, "totalUnits")}
        {row("Budget band", project.minBudgetLakhs ? `₹${project.minBudgetLakhs}L – ₹${project.maxBudgetLakhs}L` : null)}
      </div>

      <div className="rounded-xl border p-5 mb-5" style={{ borderColor: "var(--color-line)" }}>
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">Unit configurations ({project.unitTypes.length})</h2>
        {project.unitTypes.length === 0 ? (
          <p className="text-sm text-text-tertiary">No unit types extracted.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-text-tertiary text-xs"><th className="py-1">Label</th><th>Area</th><th>Price</th><th>Conf.</th></tr></thead>
            <tbody>
              {project.unitTypes.map((u) => (
                <tr key={u.id} className="border-t" style={{ borderColor: "var(--color-line)" }}>
                  <td className="py-2 text-text-primary font-medium">{u.label}</td>
                  <td className="text-text-secondary">{u.areaSqFt ? `${u.areaSqFt} sq.ft` : "—"}</td>
                  <td className="text-text-secondary">{u.priceLakh ? `₹${u.priceLakh}L` : u.ratePerSqFt ? `₹${u.ratePerSqFt}/sq.ft` : "—"}</td>
                  <td>{badge(u.confidence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {project.media.length > 0 && (
        <div className="rounded-xl border p-5 mb-5" style={{ borderColor: "var(--color-line)" }}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">Media ({project.media.length}) — private until rights cleared</h2>
          <p className="text-sm text-text-tertiary">{project.media.length} image(s) attached, all rights UNVERIFIED and not public.</p>
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <Link href="/admin/projects" className="uv-btn uv-btn-ghost text-sm">Save as draft</Link>
        <PublishDraftButton projectId={project.id} />
      </div>
    </div>
  );
}
