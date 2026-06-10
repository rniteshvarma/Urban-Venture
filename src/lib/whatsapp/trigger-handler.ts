import prisma from "../prisma";
import { resolveMergeTags } from "./merge-tags";
import { WATrigger, WAStatus } from "@prisma/client";

export async function fireWhatsAppTrigger(
  leadId: string,
  triggerType: WATrigger,
  customMessage?: string
): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead) {
      return { success: false, error: "Lead not found" };
    }

    // Find the active template for this trigger
    const template = await prisma.whatsAppTemplate.findFirst({
      where: {
        trigger: triggerType,
        isActive: true
      }
    });

    if (!template && !customMessage) {
      console.log(`[WhatsApp Trigger] No active template found for trigger: ${triggerType}`);
      return { success: false, error: `No active template for trigger: ${triggerType}` };
    }

    const templateText = customMessage || template!.message;
    const templateId = template?.id;

    // Resolve merge tags
    const resolvedMessage = await resolveMergeTags(templateText, leadId);

    // Prepare phone number for WATI (must have country code, no +, e.g. 919876543210)
    let cleanPhone = lead.phone.replace(/\D/g, "");
    if (cleanPhone.length === 10 && (cleanPhone.startsWith("7") || cleanPhone.startsWith("8") || cleanPhone.startsWith("9"))) {
      cleanPhone = "91" + cleanPhone;
    }

    // Create the log in DB as PENDING
    const log = await prisma.whatsAppLog.create({
      data: {
        leadId,
        templateId: templateId || "", // Empty if completely custom message
        message: resolvedMessage,
        status: WAStatus.PENDING,
      }
    });

    const endpoint = process.env.WATI_API_ENDPOINT;
    const token = process.env.WATI_API_TOKEN;

    const isMockMode = !endpoint || endpoint.includes("XXXXX") || endpoint.includes("mock") || !token || token.includes("mock");

    if (isMockMode) {
      console.log(`[WATI MOCK SEND] Lead: ${lead.name} (${cleanPhone})`);
      console.log(`[WATI MOCK MSG] "${resolvedMessage}"`);
      
      // Update log to SENT with mock message ID
      await prisma.whatsAppLog.update({
        where: { id: log.id },
        data: {
          status: WAStatus.SENT,
          waMessageId: `mock-msg-${Math.random().toString(36).substr(2, 9)}`,
          sentAt: new Date()
        }
      });

      if (templateId) {
        await prisma.whatsAppTemplate.update({
          where: { id: templateId },
          data: { sentCount: { increment: 1 } }
        });
      }

      return { success: true, logId: log.id };
    }

    // Real API Call
    try {
      // WATI sendSessionMessage POST endpoint format
      const response = await fetch(`${endpoint}/api/v1/sendSessionMessage/${cleanPhone}?messageText=${encodeURIComponent(resolvedMessage)}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const responseJson = await response.json();
        // Typically returns { result: "success", message: { id: "WATI_MESSAGE_ID" } } or similar
        const waMessageId = responseJson?.message?.id || responseJson?.id || "wati-sent-id";
        
        await prisma.whatsAppLog.update({
          where: { id: log.id },
          data: {
            status: WAStatus.SENT,
            waMessageId,
            sentAt: new Date()
          }
        });

        if (templateId) {
          await prisma.whatsAppTemplate.update({
            where: { id: templateId },
            data: { sentCount: { increment: 1 } }
          });
        }

        return { success: true, logId: log.id };
      } else {
        const errorText = await response.text();
        console.error("[WATI Error Response]", errorText);
        
        await prisma.whatsAppLog.update({
          where: { id: log.id },
          data: {
            status: WAStatus.FAILED,
          }
        });

        return { success: false, error: `WATI API error: ${errorText}` };
      }
    } catch (apiErr: any) {
      console.error("[WATI HTTP Request Exception]", apiErr);
      await prisma.whatsAppLog.update({
        where: { id: log.id },
        data: {
          status: WAStatus.FAILED,
        }
      });
      return { success: false, error: apiErr.message };
    }
  } catch (err: any) {
    console.error("fireWhatsAppTrigger failed:", err);
    return { success: false, error: err.message };
  }
}
