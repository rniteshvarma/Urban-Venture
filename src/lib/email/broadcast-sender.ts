import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY || "mock_key";
const resend = new Resend(apiKey);

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

  const finalHtml = params.htmlBody + footerHtml;

  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "mock_key") {
    // Mock Mode
    console.log(`[MOCK EMAIL SENT] To: ${params.to}, Subject: ${params.subject}, Link: ${unsubscribeLink}`);
    return { data: { id: `mock_email_${Date.now()}` }, error: null };
  }

  try {
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Your Company <noreply@yourdomain.com>',
      to: params.to,
      subject: params.subject,
      html: finalHtml,
    });
    return response;
  } catch (err: any) {
    console.error("Resend API error:", err);
    return { data: null, error: err };
  }
}
