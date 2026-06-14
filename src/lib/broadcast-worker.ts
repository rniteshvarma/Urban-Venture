import prisma from "./prisma";
import { resolveMergeTags } from "./whatsapp/merge-tags";
import { sendBroadcastEmail } from "./email/broadcast-sender";
import { WAStatus, EmailStatus, BroadcastStatus } from "@prisma/client";

export async function processBroadcastSend(broadcastId: string) {
  try {
    // 1. Fetch broadcast details
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: broadcastId },
      include: {
        recipients: {
          include: { lead: true }
        }
      }
    });

    if (!broadcast) {
      console.error(`[Broadcast Worker] Broadcast ${broadcastId} not found.`);
      return;
    }

    // Update broadcast status to SENDING
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: BroadcastStatus.SENDING }
    });

    console.log(`[Broadcast Worker] Starting broadcast ${broadcast.name} (${broadcastId}) to ${broadcast.recipients.length} recipients...`);

    const channel = broadcast.channel; // WHATSAPP, EMAIL, BOTH
    const recipients = broadcast.recipients;
    const batchSize = 10;
    let successfulSends = 0;
    let failedSends = 0;

    // Process recipients in batches of 10
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      // Send sequentially within the batch to avoid database connection pool exhaustion
      for (const recipient of batch) {
        const lead = recipient.lead;
        let waStatus: WAStatus | null = null;
        let emailStatus: EmailStatus | null = null;
        let waMsgId: string | null = null;
        let emailMsgId: string | null = null;
        let errorMsg: string | null = null;

        const needsWhatsapp = channel === "WHATSAPP" || channel === "BOTH";
        const needsEmail = channel === "EMAIL" || channel === "BOTH";

        try {
          // --- WHATSAPP DISPATCH ---
          if (needsWhatsapp && lead.phone && !lead.whatsappOptOut) {
            const templateText = broadcast.whatsappMessage || "";
            const resolvedWAMessage = await resolveMergeTags(templateText, lead.id);

            let cleanPhone = lead.phone.replace(/\D/g, "");
            if (cleanPhone.length === 10 && (cleanPhone.startsWith("7") || cleanPhone.startsWith("8") || cleanPhone.startsWith("9"))) {
              cleanPhone = "91" + cleanPhone;
            }

            // Create WhatsAppLog for CRM lead audit timeline
            const log = await prisma.whatsAppLog.create({
              data: {
                leadId: lead.id,
                templateId: broadcast.templateId || "",
                message: resolvedWAMessage,
                status: WAStatus.PENDING,
              }
            });

            const endpoint = process.env.WATI_API_ENDPOINT;
            const token = process.env.WATI_API_TOKEN;
            const isMockMode = !endpoint || endpoint.includes("XXXXX") || endpoint.includes("mock") || !token || token.includes("mock");

            if (isMockMode) {
              waMsgId = `mock-broadcast-${Math.random().toString(36).substr(2, 9)}`;
              waStatus = WAStatus.SENT;
              
              await prisma.whatsAppLog.update({
                where: { id: log.id },
                data: { status: WAStatus.SENT, waMessageId: waMsgId, sentAt: new Date() }
              });
            } else {
              const response = await fetch(`${endpoint}/api/v1/sendSessionMessage/${cleanPhone}?messageText=${encodeURIComponent(resolvedWAMessage)}`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json"
                }
              });

              if (response.ok) {
                const responseJson = await response.json();
                waMsgId = responseJson?.message?.id || responseJson?.id || "wati-broadcast-id";
                waStatus = WAStatus.SENT;

                await prisma.whatsAppLog.update({
                  where: { id: log.id },
                  data: { status: WAStatus.SENT, waMessageId: waMsgId, sentAt: new Date() }
                });
              } else {
                const errorText = await response.text();
                waStatus = WAStatus.FAILED;
                errorMsg = `WhatsApp fail: ${errorText}`;

                await prisma.whatsAppLog.update({
                  where: { id: log.id },
                  data: { status: WAStatus.FAILED }
                });
              }
            }
          } else if (needsWhatsapp) {
            waStatus = WAStatus.FAILED;
            errorMsg = lead.whatsappOptOut ? "WhatsApp Opted Out" : "Missing Phone Number";
          }

          // --- EMAIL DISPATCH ---
          if (needsEmail && lead.email && !lead.emailOptOut) {
            const subjectText = broadcast.emailSubject || "Urban Ventures Investment Update";
            const bodyText = broadcast.emailBody || "";

            // Resolve email subject & body merge tags
            const resolvedSubject = await resolveMergeTags(subjectText, lead.id);
            const resolvedBody = await resolveMergeTags(bodyText, lead.id);

            const emailResponse = await sendBroadcastEmail({
              leadId: lead.id,
              to: lead.email,
              name: lead.name,
              subject: resolvedSubject,
              htmlBody: resolvedBody
            });

            if (emailResponse && emailResponse.data && emailResponse.data.id) {
              emailMsgId = emailResponse.data.id;
              emailStatus = EmailStatus.SENT;
            } else {
              emailStatus = EmailStatus.FAILED;
              errorMsg = errorMsg ? `${errorMsg} | Email fail: ${JSON.stringify(emailResponse?.error || "Unknown error")}` : `Email fail: ${JSON.stringify(emailResponse?.error || "Unknown error")}`;
            }
          } else if (needsEmail) {
            emailStatus = EmailStatus.FAILED;
            errorMsg = errorMsg ? `${errorMsg} | Email: ${lead.emailOptOut ? "Opted Out" : "Missing Email"}` : `Email: ${lead.emailOptOut ? "Opted Out" : "Missing Email"}`;
          }

          // --- SAVE LOG RESULTS ---
          const isWAOk = !needsWhatsapp || waStatus === WAStatus.SENT;
          const isEmailOk = !needsEmail || emailStatus === EmailStatus.SENT;

          if (isWAOk && isEmailOk) {
            successfulSends++;
          } else {
            failedSends++;
          }

          await prisma.broadcastRecipient.update({
            where: { id: recipient.id },
            data: {
              whatsappStatus: waStatus,
              emailStatus: emailStatus,
              whatsappMessageId: waMsgId,
              emailMessageId: emailMsgId,
              whatsappSentAt: waStatus === WAStatus.SENT ? new Date() : null,
              emailSentAt: emailStatus === EmailStatus.SENT ? new Date() : null,
              errorMessage: errorMsg,
            }
          });

        } catch (recipientErr: any) {
          console.error(`[Broadcast Worker] Error processing recipient ${recipient.id}:`, recipientErr);
          failedSends++;
          await prisma.broadcastRecipient.update({
            where: { id: recipient.id },
            data: {
              whatsappStatus: needsWhatsapp ? WAStatus.FAILED : null,
              emailStatus: needsEmail ? EmailStatus.FAILED : null,
              errorMessage: recipientErr.message,
            }
          });
        }
      }

      // Increment templates sentCount if templateId is present
      if (broadcast.templateId) {
        if (channel === "WHATSAPP" || channel === "BOTH") {
          await prisma.whatsAppTemplate.updateMany({
            where: { id: broadcast.templateId },
            data: { sentCount: { increment: batch.length } }
          }).catch(() => null);
        }
        if (channel === "EMAIL" || channel === "BOTH") {
          await prisma.emailTemplate.updateMany({
            where: { id: broadcast.templateId },
            data: { sentCount: { increment: batch.length } }
          }).catch(() => null);
        }
      }

      // Add a 1-second delay between batches (except for the last batch)
      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // 4. Update Broadcast status to SENT or FAILED
    const finalStatus = successfulSends > 0 ? BroadcastStatus.SENT : BroadcastStatus.FAILED;
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: {
        status: finalStatus,
        sentAt: new Date()
      }
    });

    console.log(`[Broadcast Worker] Completed broadcast ${broadcastId}. Successes: ${successfulSends}, Failures: ${failedSends}`);
  } catch (err) {
    console.error(`[Broadcast Worker] Critical failure in broadcast ${broadcastId}:`, err);
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: BroadcastStatus.FAILED }
    }).catch(() => null);
  }
}

export async function processBroadcastRetry(broadcastId: string) {
  try {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: broadcastId },
      include: {
        recipients: {
          include: { lead: true }
        }
      }
    });

    if (!broadcast) {
      console.error(`[Broadcast Worker] Broadcast ${broadcastId} not found.`);
      return;
    }

    const channel = broadcast.channel;
    const recipientsToRetry = broadcast.recipients.filter((recipient) => {
      const needsWhatsapp = channel === "WHATSAPP" || channel === "BOTH";
      const needsEmail = channel === "EMAIL" || channel === "BOTH";

      const waFailed = needsWhatsapp && recipient.whatsappStatus === "FAILED";
      const emailFailed = needsEmail && (recipient.emailStatus === "FAILED" || recipient.emailStatus === "BOUNCED");

      return waFailed || emailFailed;
    });

    if (recipientsToRetry.length === 0) {
      console.log(`[Broadcast Worker] No failed recipients to retry for broadcast ${broadcastId}`);
      await prisma.broadcast.update({
        where: { id: broadcastId },
        data: { status: BroadcastStatus.SENT, sentAt: new Date() }
      });
      return;
    }

    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: BroadcastStatus.SENDING }
    });

    console.log(`[Broadcast Worker] Retrying broadcast ${broadcast.name} (${broadcastId}) for ${recipientsToRetry.length} recipients...`);

    const batchSize = 10;
    let successfulSends = 0;
    let failedSends = 0;

    for (let i = 0; i < recipientsToRetry.length; i += batchSize) {
      const batch = recipientsToRetry.slice(i, i + batchSize);

      // Send sequentially within the batch to avoid database connection pool exhaustion
      for (const recipient of batch) {
        const lead = recipient.lead;
        let waStatus: WAStatus | null = recipient.whatsappStatus;
        let emailStatus: EmailStatus | null = recipient.emailStatus;
        let waMsgId: string | null = recipient.whatsappMessageId;
        let emailMsgId: string | null = recipient.emailMessageId;
        let errorMsg: string | null = recipient.errorMessage || "";

        const needsWhatsapp = channel === "WHATSAPP" || channel === "BOTH";
        const needsEmail = channel === "EMAIL" || channel === "BOTH";

        const waFailed = needsWhatsapp && recipient.whatsappStatus === "FAILED";
        const emailFailed = needsEmail && (recipient.emailStatus === "FAILED" || recipient.emailStatus === "BOUNCED");

        try {
          // --- RETRY WHATSAPP ---
          if (waFailed && lead.phone && !lead.whatsappOptOut) {
            const templateText = broadcast.whatsappMessage || "";
            const resolvedWAMessage = await resolveMergeTags(templateText, lead.id);

            let cleanPhone = lead.phone.replace(/\D/g, "");
            if (cleanPhone.length === 10 && (cleanPhone.startsWith("7") || cleanPhone.startsWith("8") || cleanPhone.startsWith("9"))) {
              cleanPhone = "91" + cleanPhone;
            }

            const log = await prisma.whatsAppLog.create({
              data: {
                leadId: lead.id,
                templateId: broadcast.templateId || "",
                message: resolvedWAMessage,
                status: WAStatus.PENDING,
              }
            });

            const endpoint = process.env.WATI_API_ENDPOINT;
            const token = process.env.WATI_API_TOKEN;
            const isMockMode = !endpoint || endpoint.includes("XXXXX") || endpoint.includes("mock") || !token || token.includes("mock");

            if (isMockMode) {
              waMsgId = `mock-broadcast-${Math.random().toString(36).substr(2, 9)}`;
              waStatus = WAStatus.SENT;
              errorMsg = errorMsg.replace(/WhatsApp fail:[^|]*/g, "").trim();

              await prisma.whatsAppLog.update({
                where: { id: log.id },
                data: { status: WAStatus.SENT, waMessageId: waMsgId, sentAt: new Date() }
              });
            } else {
              const response = await fetch(`${endpoint}/api/v1/sendSessionMessage/${cleanPhone}?messageText=${encodeURIComponent(resolvedWAMessage)}`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json"
                }
              });

              if (response.ok) {
                const responseJson = await response.json();
                waMsgId = responseJson?.message?.id || responseJson?.id || "wati-broadcast-id";
                waStatus = WAStatus.SENT;
                errorMsg = errorMsg.replace(/WhatsApp fail:[^|]*/g, "").trim();

                await prisma.whatsAppLog.update({
                  where: { id: log.id },
                  data: { status: WAStatus.SENT, waMessageId: waMsgId, sentAt: new Date() }
                });
              } else {
                const errorText = await response.text();
                waStatus = WAStatus.FAILED;
                const newFailMsg = `WhatsApp fail: ${errorText}`;
                errorMsg = errorMsg.includes("WhatsApp fail:") 
                  ? errorMsg.replace(/WhatsApp fail:[^|]*/g, newFailMsg)
                  : errorMsg ? `${errorMsg} | ${newFailMsg}` : newFailMsg;

                await prisma.whatsAppLog.update({
                  where: { id: log.id },
                  data: { status: WAStatus.FAILED }
                });
              }
            }
          }

          // --- RETRY EMAIL ---
          if (emailFailed && lead.email && !lead.emailOptOut) {
            const subjectText = broadcast.emailSubject || "Urban Ventures Investment Update";
            const bodyText = broadcast.emailBody || "";

            const resolvedSubject = await resolveMergeTags(subjectText, lead.id);
            const resolvedBody = await resolveMergeTags(bodyText, lead.id);

            const emailResponse = await sendBroadcastEmail({
              leadId: lead.id,
              to: lead.email,
              name: lead.name,
              subject: resolvedSubject,
              htmlBody: resolvedBody
            });

            if (emailResponse && emailResponse.data && emailResponse.data.id) {
              emailMsgId = emailResponse.data.id;
              emailStatus = EmailStatus.SENT;
              errorMsg = errorMsg.replace(/Email fail:[^|]*/g, "").trim();
            } else {
              emailStatus = EmailStatus.FAILED;
              const newFailMsg = `Email fail: ${JSON.stringify(emailResponse?.error || "Unknown error")}`;
              errorMsg = errorMsg.includes("Email fail:") 
                ? errorMsg.replace(/Email fail:[^|]*/g, newFailMsg)
                : errorMsg ? `${errorMsg} | ${newFailMsg}` : newFailMsg;
            }
          }

          const isWAOk = !needsWhatsapp || waStatus === WAStatus.SENT;
          const isEmailOk = !needsEmail || emailStatus === EmailStatus.SENT;

          if (isWAOk && isEmailOk) {
            successfulSends++;
          } else {
            failedSends++;
          }

          await prisma.broadcastRecipient.update({
            where: { id: recipient.id },
            data: {
              whatsappStatus: waStatus,
              emailStatus: emailStatus,
              whatsappMessageId: waMsgId,
              emailMessageId: emailMsgId,
              whatsappSentAt: waStatus === WAStatus.SENT ? new Date() : recipient.whatsappSentAt,
              emailSentAt: emailStatus === EmailStatus.SENT ? new Date() : recipient.emailSentAt,
              errorMessage: errorMsg.trim() || null,
            }
          });

        } catch (recipientErr: any) {
          console.error(`[Broadcast Worker] Error retrying recipient ${recipient.id}:`, recipientErr);
          failedSends++;
          await prisma.broadcastRecipient.update({
            where: { id: recipient.id },
            data: {
              whatsappStatus: waFailed ? WAStatus.FAILED : recipient.whatsappStatus,
              emailStatus: emailFailed ? EmailStatus.FAILED : recipient.emailStatus,
              errorMessage: recipientErr.message,
            }
          });
        }
      }

      if (i + batchSize < recipientsToRetry.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const remainingFailed = await prisma.broadcastRecipient.count({
      where: {
        broadcastId,
        OR: [
          { whatsappStatus: "FAILED" },
          { emailStatus: "FAILED" },
          { emailStatus: "BOUNCED" }
        ]
      }
    });

    const finalStatus = remainingFailed === 0 ? BroadcastStatus.SENT : BroadcastStatus.FAILED;
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: {
        status: finalStatus,
        sentAt: new Date()
      }
    });

    console.log(`[Broadcast Worker] Finished retrying broadcast ${broadcastId}. Remaining failed: ${remainingFailed}`);

  } catch (err) {
    console.error(`[Broadcast Worker] Critical failure in retry for broadcast ${broadcastId}:`, err);
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: BroadcastStatus.FAILED }
    }).catch(() => null);
  }
}
