import prisma from "../prisma";
import { SourceChannel, InboundStatus, WATrigger } from "@prisma/client";
import { extractLeadIntelligence } from "./ai-extractor";
import { classifyLeadPersona } from "../persona-engine";
import { calculateLeadScore } from "../lead-scorer";
import { fireWhatsAppTrigger } from "../whatsapp/trigger-handler";

export interface ProcessInboundParams {
  sourceId: string;
  rawPayload: Record<string, any>;
  parsedData: {
    name?: string;
    phone?: string;
    email?: string;
    message?: string;
    propertyId?: string;
    propertyName?: string;
    budget?: string;
    location?: string;
    sourceMessageId?: string;
  };
}

function mapSourceToChannel(sourceType: string, sourceName: string): SourceChannel {
  const nameLower = sourceName.toLowerCase();
  if (nameLower.includes("99acres")) return SourceChannel.PORTAL_99ACRES;
  if (nameLower.includes("magicbricks")) return SourceChannel.PORTAL_MAGICBRICKS;
  if (nameLower.includes("housing")) return SourceChannel.PORTAL_HOUSING;
  if (nameLower.includes("nobroker")) return SourceChannel.PORTAL_NOBROKER;
  if (sourceType === "WHATSAPP" || nameLower.includes("whatsapp")) return SourceChannel.WHATSAPP_BUSINESS;
  if (sourceType === "GMAIL" || nameLower.includes("gmail")) return SourceChannel.GMAIL;
  if (sourceType === "WEBSITE_FORM" || nameLower.includes("website")) return SourceChannel.WEBSITE_FORM;
  if (sourceType === "CSV_IMPORT" || nameLower.includes("csv")) return SourceChannel.CSV_IMPORT;
  if (sourceType === "MANUAL" || nameLower.includes("manual")) return SourceChannel.MANUAL;
  if (sourceType === "PORTAL_WEBHOOK") return SourceChannel.PORTAL_OTHER;
  return SourceChannel.MANUAL;
}

function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  return phone.trim().replace(/[^\d+]/g, '');
}

export async function processInboundLead(params: ProcessInboundParams) {
  const { sourceId, rawPayload, parsedData } = params;

  // Find source
  const source = await prisma.inboundSource.findUnique({
    where: { id: sourceId }
  });

  if (!source) {
    throw new Error(`InboundSource with ID ${sourceId} not found`);
  }

  const phone = cleanPhoneNumber(parsedData.phone);
  const email = parsedData.email?.trim().toLowerCase();

  // Helper to log and return
  const logAndReturn = async (
    status: InboundStatus,
    leadId?: string | null,
    duplicateOfId?: string | null,
    failureReason?: string | null
  ) => {
    const log = await prisma.inboundLog.create({
      data: {
        sourceId: source.id,
        rawPayload,
        parsedData: parsedData as any,
        status,
        leadId,
        duplicateOfId,
        failureReason
      }
    });

    // Update source metrics
    await prisma.inboundSource.update({
      where: { id: source.id },
      data: {
        totalReceived: { increment: 1 },
        totalCreated: status === InboundStatus.CREATED ? { increment: 1 } : undefined,
        totalDupes: status === InboundStatus.DUPLICATE ? { increment: 1 } : undefined,
        lastReceivedAt: new Date()
      }
    });

    return { status, leadId, logId: log.id, failureReason };
  };

  // Step 1: Validate — phone OR email must be present
  if (!phone && !email) {
    return logAndReturn(InboundStatus.FAILED, null, null, 'No phone or email in payload');
  }

  // Step 2: Deduplicate — check if lead with same phone or email exists
  const existing = await prisma.lead.findFirst({
    where: {
      OR: [
        ...(phone ? [{ phone: { contains: phone.slice(-10) } }] : []),
        ...(email ? [{ email: { equals: email, mode: 'insensitive' as const } }] : [])
      ]
    },
    orderBy: { createdAt: 'desc' }
  });

  if (existing) {
    const dedupeWindowHours = source.dedupeWindow || 24;
    const hoursSinceCreation = Math.abs(new Date().getTime() - new Date(existing.createdAt).getTime()) / (1000 * 60 * 60);

    // If within deduplication window or has same source message ID
    if (hoursSinceCreation <= dedupeWindowHours || (parsedData.sourceMessageId && existing.sourceMessageId === parsedData.sourceMessageId)) {
      const noteMsg = `\n[${source.name} Enquiry - ${new Date().toLocaleString('en-IN')}] ${parsedData.message || 'No enquiry text provided'}`;
      await prisma.lead.update({
        where: { id: existing.id },
        data: {
          notes: (existing.notes || '') + noteMsg,
          updatedAt: new Date()
        }
      });

      // Recalculate lead score in background
      calculateLeadScore(existing.id).catch(console.error);

      return logAndReturn(InboundStatus.DUPLICATE, existing.id, existing.id);
    }
  }

  // Step 3: AI extraction — parse message for budget/horizon/property/intent
  const aiExtracted = await extractLeadIntelligence(parsedData.message);

  // Step 4: Create Lead
  const mappedChannel = mapSourceToChannel(source.type, source.name);
  const leadName = parsedData.name && parsedData.name.trim() !== '' ? parsedData.name.trim() : 'Inbound Enquiry';

  const newLead = await prisma.lead.create({
    data: {
      name: leadName,
      phone: phone || `+91000000${Math.floor(1000 + Math.random() * 9000)}`,
      email: email || `${leadName.toLowerCase().replace(/\s+/g, '')}${Math.floor(1000 + Math.random() * 9000)}@inbound.uv`,
      notes: parsedData.message || `Lead created via ${source.name}`,
      budget: aiExtracted.budget || (parsedData.budget ? parseFloat(parsedData.budget) : 35.0),
      horizon: aiExtracted.horizon || 3,
      city: aiExtracted.city || parsedData.location || 'Hyderabad',
      status: source.defaultStatus || 'NEW',
      source: source.name.toLowerCase().replace(/\s+/g, '_'),
      sourceChannel: mappedChannel,
      sourceMessageId: parsedData.sourceMessageId || null,
      rawEnquiryText: parsedData.message || null,
      aiExtractedBudget: aiExtracted.budget,
      aiExtractedHorizon: aiExtracted.horizon,
      aiExtractedProperty: aiExtracted.propertyName || parsedData.propertyName || null,
      aiConfidenceScore: aiExtracted.confidence,
      assignedTo: source.autoAssignTo || null,
    }
  });

  // Step 5: Fire downstream automations (non-blocking)
  Promise.allSettled([
    classifyLeadPersona(newLead.id),
    calculateLeadScore(newLead.id),
    fireWhatsAppTrigger(newLead.id, WATrigger.LEAD_CREATED).catch(() => null)
  ]).catch(err => console.error("Error in downstream automations:", err));

  return logAndReturn(InboundStatus.CREATED, newLead.id);
}
