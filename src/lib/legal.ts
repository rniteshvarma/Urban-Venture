/**
 * Who runs Property Tiger, for the Privacy Policy and Terms of Use.
 * Set these in Vercel (Production) — the pages fall back to a neutral line
 * while a value is missing, but a Grievance Officer and a contact address are
 * required under India's IT Rules and DPDP Act, so fill them in before launch.
 *
 *   LEGAL_ENTITY_NAME        registered business name (e.g. "Property Tiger Technologies Pvt Ltd")
 *   LEGAL_ADDRESS            registered office address
 *   LEGAL_CONTACT_EMAIL      privacy & support contact (falls back to RESEND_REPLY_TO)
 *   GRIEVANCE_OFFICER_NAME   named Grievance Officer
 *   GRIEVANCE_OFFICER_EMAIL  their email (falls back to LEGAL_CONTACT_EMAIL)
 */

/** Bump when the text of either page changes materially. */
export const LEGAL_LAST_UPDATED = "12 October 2026";

export function legalDetails() {
  const contactEmail = process.env.LEGAL_CONTACT_EMAIL?.trim() || process.env.RESEND_REPLY_TO?.trim() || null;
  return {
    brand: "Property Tiger",
    entity: process.env.LEGAL_ENTITY_NAME?.trim() || null,
    address: process.env.LEGAL_ADDRESS?.trim() || null,
    contactEmail,
    grievanceName: process.env.GRIEVANCE_OFFICER_NAME?.trim() || null,
    grievanceEmail: process.env.GRIEVANCE_OFFICER_EMAIL?.trim() || contactEmail,
  };
}
