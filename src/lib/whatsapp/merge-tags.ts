import prisma from "../prisma";

/** Every merge tag's value for a lead, keyed "{{tag}}". Null when the lead is gone. */
export async function mergeTagValues(leadId: string): Promise<Record<string, string> | null> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      user: {
        include: {
          searches: {
            orderBy: { createdAt: "desc" }
          }
        }
      },
      matches: {
        where: { isDismissed: false },
        include: { project: true },
        orderBy: { matchScore: "desc" }
      }
    }
  });

  if (!lead) return null;

  const matchedProj = lead.matches[0]?.project || null;
  
  let topSearchCorridor = "Hyderabad";
  if (lead.user?.searches?.[0]?.aiResponse) {
    try {
      const responseJson = lead.user.searches[0].aiResponse as any;
      if (responseJson && Array.isArray(responseJson.corridors) && responseJson.corridors[0]) {
        topSearchCorridor = responseJson.corridors[0].name || "Hyderabad";
      }
    } catch (e) {
      // ignore
    }
  }

  const replacements: Record<string, string> = {
    "{{lead_name}}": lead.name,
    "{{budget}}": `₹${lead.budget}L`,
    "{{horizon}}": `${lead.horizon} Years`,
    "{{city}}": lead.city,
    "{{email}}": lead.email,
    "{{portal_url}}": process.env.NEXTAUTH_URL || "http://localhost:3000",
    "{{agent_name}}": lead.assignedTo || "Property Advisor",
    "{{corridor}}": topSearchCorridor,
    "{{project_name}}": matchedProj?.name || "Premium Villa Plots",
    "{{project_price}}": matchedProj ? `₹${matchedProj.minBudgetLakhs}L` : "₹45L",
  };
  return replacements;
}

/** Values for a WABA template's positional params, from merge-tag names ("lead_name" or "{{lead_name}}"). */
export async function resolveTemplateParams(tags: string[], leadId: string): Promise<string[]> {
  const values = (await mergeTagValues(leadId)) ?? {};
  return tags.map((t) => {
    const key = t.startsWith("{{") ? t : `{{${t}}}`;
    return values[key] ?? "";
  });
}

export async function resolveMergeTags(templateText: string, leadId: string): Promise<string> {
  const replacements = await mergeTagValues(leadId);
  if (!replacements) return templateText;

  let resolvedText = templateText;
  for (const [tag, value] of Object.entries(replacements)) {
    const regex = new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    resolvedText = resolvedText.replace(regex, value);
  }

  return resolvedText;
}
