export interface ParsedInboundData {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  propertyId?: string;
  propertyName?: string;
  budget?: string;
  location?: string;
  sourceMessageId?: string;
}

export const defaultPortalFieldMappings: Record<string, Record<string, string>> = {
  "99acres": {
    name: "name",
    mobile: "phone",
    email: "email",
    message: "message",
    property_id: "propertyId",
    property_name: "propertyName",
    budget: "budget"
  },
  "MagicBricks": {
    sender_name: "name",
    sender_phone: "phone",
    sender_email: "email",
    remark: "message",
    pid: "propertyId",
    project_name: "propertyName"
  },
  "Housing.com": {
    lead_name: "name",
    lead_phone: "phone",
    lead_email: "email",
    query_message: "message",
    property_id: "propertyId"
  },
  "NoBroker": {
    name: "name",
    phone: "phone",
    email: "email",
    message: "message",
    listing_id: "propertyId"
  }
};

/**
 * Normalizes raw payload JSON into standard lead fields according to the source field mapping object.
 */
export function applyFieldMapping(
  rawPayload: Record<string, any>,
  fieldMapping?: Record<string, string> | null
): ParsedInboundData {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return {};
  }

  // If no mapping provided, check if raw payload already uses standard key names
  if (!fieldMapping || Object.keys(fieldMapping).length === 0) {
    return {
      name: rawPayload.name || rawPayload.lead_name || rawPayload.sender_name,
      phone: rawPayload.phone || rawPayload.mobile || rawPayload.lead_phone || rawPayload.sender_phone,
      email: rawPayload.email || rawPayload.lead_email || rawPayload.sender_email,
      message: rawPayload.message || rawPayload.query_message || rawPayload.remark || rawPayload.notes,
      propertyId: rawPayload.propertyId || rawPayload.property_id || rawPayload.pid || rawPayload.listing_id,
      propertyName: rawPayload.propertyName || rawPayload.project_name || rawPayload.property_name,
      budget: rawPayload.budget ? String(rawPayload.budget) : undefined,
      location: rawPayload.location || rawPayload.city,
      sourceMessageId: rawPayload.sourceMessageId || rawPayload.id || rawPayload.message_id
    };
  }

  const result: ParsedInboundData = {};

  for (const [rawKey, targetField] of Object.entries(fieldMapping)) {
    const rawVal = rawPayload[rawKey];
    if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
      switch (targetField) {
        case 'name':
          result.name = String(rawVal);
          break;
        case 'phone':
          result.phone = String(rawVal).trim();
          break;
        case 'email':
          result.email = String(rawVal).trim();
          break;
        case 'message':
          result.message = String(rawVal);
          break;
        case 'propertyId':
          result.propertyId = String(rawVal);
          break;
        case 'propertyName':
          result.propertyName = String(rawVal);
          break;
        case 'budget':
          result.budget = String(rawVal);
          break;
        case 'location':
          result.location = String(rawVal);
          break;
      }
    }
  }

  // Fallback for fields missing in explicit mapping
  if (!result.phone) result.phone = rawPayload.phone || rawPayload.mobile || rawPayload.sender_phone;
  if (!result.email) result.email = rawPayload.email || rawPayload.sender_email;
  if (!result.name) result.name = rawPayload.name || rawPayload.sender_name || 'Portal Enquiry';
  if (!result.message) result.message = rawPayload.message || rawPayload.remark || rawPayload.query_message || '';

  return result;
}
