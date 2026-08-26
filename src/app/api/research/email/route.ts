/**
 * POST /api/research/email  { searchId }
 * Emails the authenticated owner their research report as a branded email with
 * a PDF attachment. Ownership-checked; never sends someone else's report.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email/client';
import { reportEmail } from '@/lib/email/templates';
import { renderReportPdf, renderReportSummaryHtml, type ReportData } from '@/lib/email/report-render';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchId } = await req.json();
    if (!searchId) return NextResponse.json({ error: 'searchId is required' }, { status: 400 });

    const search = await prisma.search.findUnique({ where: { id: searchId }, include: { user: true } });
    if (!search) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    if (search.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const email = search.user?.email;
    if (!email) return NextResponse.json({ error: 'No email on file for this account' }, { status: 400 });

    const report = (search.aiResponse ?? {}) as ReportData;
    const meta = { city: search.city, budgetLakhs: search.budget, horizonYears: search.horizon };
    const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;

    const pdf = renderReportPdf(report, meta);
    const tmpl = reportEmail({
      name: search.user?.name,
      city: meta.city,
      budgetLakhs: meta.budgetLakhs,
      horizonYears: meta.horizonYears,
      contentHtml: renderReportSummaryHtml(report),
      viewUrl: `${base}/dashboard`,
    });

    const res = await sendEmail({
      to: email,
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
      attachments: [{ filename: `property-tiger-report-${meta.city.toLowerCase()}.pdf`, content: pdf }],
      tags: { type: 'report' },
    });

    if (!res.ok) return NextResponse.json({ error: res.error || 'Email failed' }, { status: 502 });
    return NextResponse.json({ success: true, mocked: res.mocked, sentTo: email });
  } catch (error) {
    console.error('POST /api/research/email', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
