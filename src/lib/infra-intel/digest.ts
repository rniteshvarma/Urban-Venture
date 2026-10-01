/**
 * Weekly infra digest for admins: what changed, what is waiting for review,
 * which corridor scores moved, and which sources are unhealthy.
 * Sent by the daily cron on Mondays (IST). Recipients: INFRA_DIGEST_TO
 * (comma-separated) or, if unset, every ADMIN user.
 */
import prisma from '../prisma';
import { sendEmail } from '../email/client';

const APP_URL = process.env.NEXTAUTH_URL || 'https://property-tiger.vercel.app';

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

export async function buildDigest(days = 7) {
  const since = new Date(Date.now() - days * 86400000);
  const [applied, queued, newProjects, snapshots, unhealthy] = await Promise.all([
    prisma.infraSignal.findMany({
      where: { createdAt: { gte: since }, decision: { in: ['AUTO_APPLIED', 'APPROVED'] } },
      include: { infraProject: { select: { name: true, status: true } } },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.infraSignal.count({ where: { decision: 'QUEUED' } }),
    prisma.infraProject.count({ where: { autoCreated: true, isPublished: true, createdAt: { gte: since } } }),
    prisma.corridorScoreSnapshot.findMany({ where: { computedAt: { gte: since } }, orderBy: { computedAt: 'asc' } }),
    prisma.infraSource.findMany({ where: { OR: [{ consecutiveFailures: { gte: 2 } }, { isActive: false }] }, select: { name: true, lastError: true, isActive: true } }),
  ]);

  // First vs last snapshot per corridor this week.
  const moves = new Map<string, { from: number; to: number }>();
  for (const s of snapshots) {
    const m = moves.get(s.corridorSlug);
    if (!m) moves.set(s.corridorSlug, { from: s.infraScore, to: s.infraScore });
    else m.to = s.infraScore;
  }
  const movers = [...moves.entries()].filter(([, m]) => m.to !== m.from).sort((a, b) => Math.abs(b[1].to - b[1].from) - Math.abs(a[1].to - a[1].from));

  return { applied, queued, newProjects, movers, unhealthy };
}

export async function sendWeeklyDigest() {
  const d = await buildDigest();
  const envTo = (process.env.INFRA_DIGEST_TO ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const to = envTo.length ? envTo : (await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true } })).map((u) => u.email).filter((e): e is string => !!e);
  if (to.length === 0) return { sent: false, reason: 'no recipients' };

  const li = (s: string) => `<li style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#334155;">${s}</li>`;
  const changes = d.applied.map((s) => li(`<b>${esc(s.infraProject?.name ?? s.projectName)}</b> — ${esc(s.decisionReason.startsWith('Approved') ? 'approved' : 'auto-applied')}: ${esc(((s.extracted as { notes?: string[] })?.notes ?? []).join('; ') || s.eventType)}`)).join('');
  const movers = d.movers.map(([slug, m]) => li(`${esc(slug)}: infra ${m.from} → <b>${m.to}</b> (${m.to > m.from ? '+' : ''}${m.to - m.from})`)).join('');
  const health = d.unhealthy.map((s) => li(`${esc(s.name)}${s.isActive ? '' : ' <b>(paused)</b>'} — ${esc(s.lastError ?? 'failing')}`)).join('');

  const html = `<!doctype html><html><body style="margin:0;background:#F8FAFC;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #E2E8F0;border-radius:14px;">
<tr><td style="background:#0F172A;padding:18px 26px;color:#fff;font-weight:800;font-size:17px;">PROPERTY TIGER<span style="color:#F59E0B;">.</span> · Weekly infra digest</td></tr>
<tr><td style="padding:24px 26px;">
<p style="font-size:15px;color:#0F172A;margin:0 0 16px;"><b>${d.applied.length}</b> changes applied · <b>${d.newProjects}</b> new projects · <b>${d.queued}</b> waiting for review</p>
${changes ? `<h3 style="font-size:15px;margin:18px 0 8px;">Applied this week</h3><ul style="padding-left:18px;margin:0;">${changes}</ul>` : ''}
${movers ? `<h3 style="font-size:15px;margin:18px 0 8px;">Corridor infra scores that moved</h3><ul style="padding-left:18px;margin:0;">${movers}</ul>` : ''}
${health ? `<h3 style="font-size:15px;margin:18px 0 8px;">Sources needing attention</h3><ul style="padding-left:18px;margin:0;">${health}</ul>` : ''}
<p style="margin:22px 0 0;"><a href="${APP_URL}/admin/infrastructure/updates" style="display:inline-block;background:#F59E0B;color:#0F172A;font-weight:700;text-decoration:none;padding:11px 20px;border-radius:8px;">Open infra updates</a></p>
</td></tr></table></td></tr></table></body></html>`;

  const res = await sendEmail({
    to,
    subject: `Infra digest: ${d.applied.length} changes, ${d.queued} to review`,
    html,
    text: `${d.applied.length} changes applied, ${d.newProjects} new projects, ${d.queued} waiting for review. ${APP_URL}/admin/infrastructure/updates`,
    tags: { type: 'infra-digest' },
  });
  return { sent: res.ok, mocked: res.mocked, to: to.length };
}
