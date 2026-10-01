/**
 * Operational alerts for admins. A paused template silently kills a whole
 * feature, so these are raised loudly: stored (shown in Admin → Settings →
 * WhatsApp) and emailed when email is live. One alert per condition per day.
 */
import prisma from "../prisma";
import { emailIsLive, sendEmail } from "../email/client";

export type AlertKind = "TEMPLATE_STATUS" | "QUALITY" | "TIER_USAGE" | "HEALTH";
export type AlertSeverity = "INFO" | "WARN" | "CRITICAL";

function istDay(d = new Date()): string {
  return new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

export async function raiseAlert(kind: AlertKind, severity: AlertSeverity, message: string, condition: string): Promise<boolean> {
  const dedupeKey = `${kind}:${condition}:${istDay()}`;
  try {
    await prisma.whatsAppAlert.create({ data: { kind, severity, message, dedupeKey } });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") return false; // already raised today
    throw err;
  }
  console.warn(`[whatsapp:alert] ${severity} ${kind}: ${message}`);

  const to = process.env.WHATSAPP_ALERT_EMAIL || process.env.ADMIN_EMAIL;
  if (to && emailIsLive() && severity !== "INFO") {
    await sendEmail({
      to,
      subject: `WhatsApp ${severity === "CRITICAL" ? "alert" : "warning"}: ${message.slice(0, 80)}`,
      html: `<p>${message.replace(/</g, "&lt;")}</p><p>Review it in Admin → Settings → WhatsApp.</p>`,
      tags: { type: "whatsapp-alert", kind },
    }).catch((e) => console.error("[whatsapp:alert] email failed", e));
  }
  return true;
}
