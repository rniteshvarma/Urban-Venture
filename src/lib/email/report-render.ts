/**
 * Render a research report (Search.aiResponse) into an email summary (HTML) and
 * a full PDF attachment. Shape mirrors getInvestmentRecommendations() in
 * lib/anthropic.ts; all fields are read defensively since aiResponse is Json.
 */

import { jsPDF } from 'jspdf';

export interface ReportCorridor {
  name?: string;
  area?: string;
  matchScore?: number;
  riskLevel?: string;
  appreciationMin?: number;
  appreciationMax?: number;
  reasons?: string[];
  infraHighlights?: string[];
  exitOpportunities?: string[];
  bestFor?: string;
}

export interface ReportData {
  executiveSummary?: string;
  corridors?: ReportCorridor[];
  overallRiskScore?: number;
  riskRationale?: string;
  marketOutlook?: string;
  disclaimer?: string;
}

export interface ReportMeta {
  city: string;
  budgetLakhs: number;
  horizonYears: number;
}

const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] as string);

/** Short HTML block for the email body (the full report is the attached PDF). */
export function renderReportSummaryHtml(report: ReportData): string {
  const parts: string[] = [];
  if (report.executiveSummary) {
    parts.push(`<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;">${esc(report.executiveSummary)}</p>`);
  }
  const corridors = report.corridors ?? [];
  if (corridors.length) {
    parts.push('<p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#0F172A;text-transform:uppercase;letter-spacing:1px;">Top matches</p>');
    parts.push('<ul style="margin:0;padding-left:18px;">');
    for (const c of corridors.slice(0, 4)) {
      const score = typeof c.matchScore === 'number' ? ` — ${c.matchScore}/100` : '';
      const appr = c.appreciationMin != null && c.appreciationMax != null ? ` · ${c.appreciationMin}–${c.appreciationMax}% appr.` : '';
      parts.push(`<li style="font-size:14px;line-height:1.6;color:#334155;"><strong>${esc(c.name ?? 'Corridor')}</strong>${score}${appr}</li>`);
    }
    parts.push('</ul>');
  }
  return parts.join('') || '<p style="font-size:14px;color:#334155;">Your report is attached as a PDF.</p>';
}

/** Full report as a PDF Buffer. Pure text layout — no DOM, works server-side. */
export function renderReportPdf(report: ReportData, meta: ReportMeta): Buffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const M = 48; // margin
  const W = doc.internal.pageSize.getWidth() - M * 2;
  const H = doc.internal.pageSize.getHeight();
  let y = M;

  const ensure = (needed: number) => {
    if (y + needed > H - M) {
      doc.addPage();
      y = M;
    }
  };
  const line = (text: string, size: number, opts: { bold?: boolean; color?: [number, number, number]; gap?: number } = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? [30, 41, 59]));
    const wrapped = doc.splitTextToSize(text, W) as string[];
    for (const w of wrapped) {
      ensure(size + 4);
      doc.text(w, M, y);
      y += size + 4;
    }
    y += opts.gap ?? 4;
  };

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 70, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PROPERTY TIGER', M, 44);
  y = 100;

  line('Investment Research Report', 16, { bold: true, color: [15, 23, 42], gap: 2 });
  line(`Budget ₹${meta.budgetLakhs}L · Horizon ${meta.horizonYears}yr · ${meta.city}`, 11, { color: [100, 116, 139], gap: 12 });

  if (report.executiveSummary) {
    line('Executive Summary', 12, { bold: true, color: [15, 23, 42] });
    line(report.executiveSummary, 11, { gap: 12 });
  }

  for (const [i, c] of (report.corridors ?? []).entries()) {
    line(`${i + 1}. ${c.name ?? 'Corridor'}${c.area ? ` — ${c.area}` : ''}`, 12, { bold: true, color: [180, 83, 9] });
    const bits: string[] = [];
    if (typeof c.matchScore === 'number') bits.push(`Match ${c.matchScore}/100`);
    if (c.riskLevel) bits.push(`Risk ${c.riskLevel}`);
    if (c.appreciationMin != null && c.appreciationMax != null) bits.push(`Appreciation ${c.appreciationMin}–${c.appreciationMax}%`);
    if (bits.length) line(bits.join('  ·  '), 10, { color: [100, 116, 139] });
    for (const r of c.reasons ?? []) line(`• ${r}`, 10);
    if (c.bestFor) line(`Best for: ${c.bestFor}`, 10, { color: [100, 116, 139], gap: 10 });
  }

  if (report.riskRationale) {
    line('Risk Assessment', 12, { bold: true, color: [15, 23, 42] });
    line(`${report.overallRiskScore != null ? `Overall risk ${report.overallRiskScore}/10. ` : ''}${report.riskRationale}`, 11, { gap: 10 });
  }
  if (report.marketOutlook) {
    line('Market Outlook', 12, { bold: true, color: [15, 23, 42] });
    line(report.marketOutlook, 11, { gap: 10 });
  }
  line(report.disclaimer ?? 'Model-based estimates from public data. Not investment advice. Verify title independently before any transaction.', 8, { color: [148, 163, 184] });

  return Buffer.from(doc.output('arraybuffer'));
}
