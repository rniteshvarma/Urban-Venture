/**
 * Zod fields linking a CRM WhatsApp template to an approved WABA template.
 * Shared by every route that creates or edits CRM WhatsApp templates.
 */
import { z } from "zod";

export const wabaTemplateFields = {
  // Meta template names are lowercase letters, digits and underscores. "" unlinks.
  wabaTemplateName: z
    .string()
    .trim()
    .transform((v) => v || null)
    .pipe(z.string().regex(/^[a-z0-9_]+$/, "Use the template's exact WABA name (lowercase, digits, _)").nullable())
    .nullable()
    .optional(),
  wabaLanguage: z.string().trim().min(2).max(10).optional(),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]).optional(),
  // Merge tags for {{1}}, {{2}}… in order; "{{lead_name}}" or "lead_name".
  wabaParamTags: z.array(z.string().trim().transform((t) => t.replace(/^\{\{|\}\}$/g, "")).pipe(z.string().min(1))).max(20).optional(),
};
