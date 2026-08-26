/**
 * Central email client — the single place email is sent from.
 *
 * Every sender goes through sendEmail() so From/Reply-To, dev mock behaviour,
 * error handling and logging are consistent. Provider is Resend.
 *
 * DEV SAFETY: outside production, emails are NOT sent by default — they are
 * logged — so development never emails real users. Set EMAIL_SEND_IN_DEV=true
 * to actually send while testing locally.
 *
 * DELIVERY: real delivery to arbitrary recipients requires a domain verified in
 * Resend. Until RESEND_FROM_EMAIL points at a verified domain, the default
 * onboarding@resend.dev only reaches your own Resend-account address.
 */

import { Resend } from 'resend';

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL || 'Property Tiger <onboarding@resend.dev>';
const REPLY_TO = process.env.RESEND_REPLY_TO || undefined;

/** Whether we actually hand the message to Resend, vs. log it (dev mock). */
function isLive(): boolean {
  if (!API_KEY || API_KEY === 'mock_key') return false;
  if (process.env.NODE_ENV === 'production') return true;
  return process.env.EMAIL_SEND_IN_DEV === 'true';
}

let client: Resend | null = null;
function resend(): Resend {
  if (!client) client = new Resend(API_KEY);
  return client;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string; // Buffer or base64 string
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  /** Freeform tags for observability (e.g. { type: 'verification' }). */
  tags?: Record<string, string>;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  mocked?: boolean;
  error?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const recipients = Array.isArray(input.to) ? input.to : [input.to];

  if (!isLive()) {
    const reason = !API_KEY || API_KEY === 'mock_key' ? 'no API key' : 'dev mode (set EMAIL_SEND_IN_DEV=true to send)';
    console.log(`[email:mock] (${reason}) → ${recipients.join(', ')} · "${input.subject}"${input.attachments?.length ? ` · ${input.attachments.length} attachment(s)` : ''}`);
    return { ok: true, mocked: true, id: `mock_${Date.now()}` };
  }

  try {
    const { data, error } = await resend().emails.send({
      from: FROM,
      to: recipients,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo ?? REPLY_TO,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: typeof a.content === 'string' ? a.content : a.content.toString('base64'),
      })),
      tags: input.tags ? Object.entries(input.tags).map(([name, value]) => ({ name, value })) : undefined,
    });

    if (error) {
      console.error('[email] Resend error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error('[email] send threw:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** True when a real send is currently possible (key present + prod or dev-send enabled). */
export function emailIsLive(): boolean {
  return isLive();
}
