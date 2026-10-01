// /report/[token] — the product. Server-rendered from the FROZEN
// WeeklyReport.content snapshot (Constraint 4: a report viewed in November shows
// what was true in September). No login needed — the token identifies the user.
//
// Sections render only when populated (Constraint: never an empty heading).
// noindex — these are personal pages (Constraint 11).

import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";
import type { ReportContent, HeadlineBlob } from "@/lib/reports/render-types";
import { ReportView } from "@/components/reports/ReportView";
import { isPlaceholderEmail } from "@/lib/placeholder-email";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false }, // personal pages
  title: "Your weekly report · Property Tiger",
};

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const report = await prisma.weeklyReport.findUnique({
    where: { accessToken: token },
    include: { user: { select: { name: true, email: true, reportPreference: { select: { unsubToken: true } } } }, deliveries: { select: { id: true, channel: true } } },
  });

  if (!report) {
    return <Shell><Notice title="Report not found" body="This link isn't valid. Please open the most recent link we sent you." /></Shell>;
  }
  if (report.expiresAt.getTime() < Date.now()) {
    return (
      <Shell>
        <Notice title="This report has expired" body="Reports stay live for 60 days. Sign in to see your report archive.">
          <Link href="/login?next=/dashboard/reports" className="uv-btn uv-btn-primary" style={{ fontSize: "0.8125rem" }}>Sign in</Link>
        </Notice>
      </Shell>
    );
  }

  // View tracking (server-side, reliable): first-view stamp, view count, reset
  // the unopened counter, and mark the delivery clicked. Best-effort.
  try {
    const firstView = report.firstViewedAt == null;
    await prisma.weeklyReport.update({
      where: { id: report.id },
      data: { viewCount: { increment: 1 }, lastViewedAt: new Date(), ...(firstView ? { firstViewedAt: new Date() } : {}) },
    });
    if (firstView) {
      await prisma.reportPreference.updateMany({ where: { userId: report.userId }, data: { consecutiveUnopened: 0, lastOpenedAt: new Date(), totalOpened: { increment: 1 }, frequency: "WEEKLY" } });
      await prisma.reportDelivery.updateMany({ where: { reportId: report.id, clickedAt: null }, data: { clickedAt: new Date() } });
    }
  } catch (e) {
    console.error("[reports] view tracking failed:", e);
  }

  const content = report.content as unknown as ReportContent & { _headline?: HeadlineBlob };
  const period = { start: report.periodStart, end: report.periodEnd };

  return (
    <ReportView
      content={content}
      headline={report.headline}
      issueNumber={report.issueNumber}
      period={period}
      firstName={(report.user.name ?? "there").split(" ")[0]}
      unsubToken={isPlaceholderEmail(report.user.email) ? report.user.reportPreference?.unsubToken ?? null : null}
      whatsappOnly={isPlaceholderEmail(report.user.email)}
    />
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-paper, #FAF9F6)", display: "grid", placeItems: "center", padding: 24 }}>
      {children}
    </div>
  );
}

function Notice({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 420, textAlign: "center" }}>
      <h1 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: "1.3rem", color: "var(--color-ink, #0D0D12)" }}>{title}</h1>
      <p style={{ color: "#5A5A66", fontSize: "0.9375rem", marginTop: 8, lineHeight: 1.5 }}>{body}</p>
      {children && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );
}
