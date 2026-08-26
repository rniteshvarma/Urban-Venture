/**
 * Branded, email-safe HTML templates. Inline styles only (email clients strip
 * <style>/external CSS). Each builder returns { subject, html, text }.
 */

const BRAND = {
  ink: '#0F172A',
  saffron: '#F59E0B',
  paper: '#F8FAFC',
  textMid: '#475569',
  line: '#E2E8F0',
};

const APP_URL = process.env.NEXTAUTH_URL || 'https://property-tiger.vercel.app';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** Shared shell: header wordmark, content, footer. `preheader` is the inbox preview line. */
function layout(opts: { title: string; preheader?: string; bodyHtml: string; footerNote?: string }): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.paper};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader ?? ''}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.paper};padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid ${BRAND.line};border-radius:14px;overflow:hidden;">
        <tr><td style="background:${BRAND.ink};padding:20px 28px;">
          <span style="color:#fff;font-weight:800;font-size:18px;letter-spacing:0.3px;">PROPERTY TIGER<span style="color:${BRAND.saffron};">.</span></span>
        </td></tr>
        <tr><td style="padding:32px 28px;">
          <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${BRAND.ink};">${opts.title}</h1>
          ${opts.bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 28px;border-top:1px solid ${BRAND.line};">
          <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.5;">
            ${opts.footerNote ?? 'Property Tiger — AI investment research for Hyderabad land and property.'}<br/>
            This is a transactional message from your Property Tiger account.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND.saffron};color:${BRAND.ink};font-weight:700;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:8px;">${label}</a>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${BRAND.textMid};">${text}</p>`;
}

// ── Templates ────────────────────────────────────────────────────────────────

export function verificationEmail(o: { name?: string | null; verifyUrl: string }): RenderedEmail {
  const hi = o.name ? `Hi ${o.name},` : 'Hi,';
  return {
    subject: 'Verify your Property Tiger email',
    html: layout({
      title: 'Confirm your email address',
      preheader: 'Verify your email to activate your Property Tiger account.',
      bodyHtml: `${p(hi)}${p('Please confirm this email address to activate your account.')}<p style="margin:8px 0 24px;">${button(o.verifyUrl, 'Verify email')}</p>${p('This link expires in 24 hours. If you did not create an account, you can ignore this email.')}<p style="margin:0;font-size:12px;color:#94A3B8;word-break:break-all;">Or paste this link: ${o.verifyUrl}</p>`,
    }),
    text: `${hi}\n\nConfirm your email address to activate your Property Tiger account:\n${o.verifyUrl}\n\nThis link expires in 24 hours.`,
  };
}

export function passwordResetEmail(o: { name?: string | null; resetUrl: string }): RenderedEmail {
  const hi = o.name ? `Hi ${o.name},` : 'Hi,';
  return {
    subject: 'Reset your Property Tiger password',
    html: layout({
      title: 'Reset your password',
      preheader: 'Reset your Property Tiger password. Link valid for 1 hour.',
      bodyHtml: `${p(hi)}${p('We received a request to reset your password. Click below to choose a new one.')}<p style="margin:8px 0 24px;">${button(o.resetUrl, 'Reset password')}</p>${p('This link expires in 1 hour and can be used once. If you did not request this, you can safely ignore it.')}<p style="margin:0;font-size:12px;color:#94A3B8;word-break:break-all;">Or paste this link: ${o.resetUrl}</p>`,
    }),
    text: `${hi}\n\nReset your password (link valid 1 hour, single use):\n${o.resetUrl}\n\nIf you didn't request this, ignore this email.`,
  };
}

export function welcomeEmail(o: { name?: string | null }): RenderedEmail {
  const hi = o.name ? `Welcome, ${o.name}!` : 'Welcome!';
  return {
    subject: 'Welcome to Property Tiger',
    html: layout({
      title: hi,
      preheader: 'Your Property Tiger account is ready.',
      bodyHtml: `${p('Your account is ready. Explore corridor intelligence, run AI research, and track the Hyderabad land market.')}<p style="margin:8px 0 24px;">${button(`${APP_URL}/dashboard`, 'Go to your dashboard')}</p>`,
    }),
    text: `${hi}\n\nYour Property Tiger account is ready: ${APP_URL}/dashboard`,
  };
}

export function reportEmail(o: {
  name?: string | null;
  city: string;
  budgetLakhs: number;
  horizonYears: number;
  contentHtml: string; // pre-rendered report body
  viewUrl?: string;
}): RenderedEmail {
  const hi = o.name ? `Hi ${o.name},` : 'Hi,';
  const meta = `₹${o.budgetLakhs}L · ${o.horizonYears}yr · ${o.city}`;
  return {
    subject: `Your Property Tiger research report — ${meta}`,
    html: layout({
      title: 'Your investment research report',
      preheader: `Report for ${meta}. PDF attached.`,
      bodyHtml: `${p(hi)}${p(`Here is your AI research report (<strong>${meta}</strong>). The full report is attached as a PDF.`)}<div style="border:1px solid ${BRAND.line};border-radius:10px;padding:16px 18px;margin:0 0 20px;background:${BRAND.paper};">${o.contentHtml}</div>${o.viewUrl ? `<p style="margin:8px 0 0;">${button(o.viewUrl, 'View in your dashboard')}</p>` : ''}`,
      footerNote: 'Model-based estimates from public data. Not investment advice. Verify title independently before any transaction.',
    }),
    text: `${hi}\n\nYour Property Tiger research report (${meta}) is attached as a PDF.${o.viewUrl ? `\nView online: ${o.viewUrl}` : ''}\n\nModel-based estimates from public data. Not investment advice.`,
  };
}
