/**
 * Broadcast email sender — now a thin wrapper over the central email layer
 * (src/lib/email/client.ts). Keeps the legacy { data, error } return shape the
 * broadcast worker reads, and appends the required unsubscribe footer.
 */

import { sendEmail } from "./client";

export async function sendBroadcastEmail(params: {
  leadId: string;
  to: string;
  name: string;
  subject: string;
  htmlBody: string; // Already merge-tag-resolved
}) {
  const token = Buffer.from(params.leadId).toString("base64");
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const unsubscribeLink = `${baseUrl}/api/unsubscribe/${token}`;

  const footerHtml = `
    <br/><br/>
    <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;"/>
    <p style="font-size: 11px; color: #666; line-height: 1.5; font-family: sans-serif;">
      You received this because you opted in at our portal.
      <br/>
      <a href="${unsubscribeLink}" style="color: #2563eb; text-decoration: underline;">Unsubscribe</a> from future email broadcasts.
    </p>
  `;

  const res = await sendEmail({
    to: params.to,
    subject: params.subject,
    html: params.htmlBody + footerHtml,
    tags: { type: "broadcast" },
  });

  // Preserve the shape the broadcast worker expects.
  return res.ok ? { data: { id: res.id }, error: null } : { data: null, error: res.error };
}
