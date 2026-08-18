import prisma from "./prisma";

/** Last 10 digits of a phone, ignoring country code / formatting. */
const digits10 = (p?: string | null) => (p || "").replace(/\D/g, "").slice(-10);

export interface ResolvableUser {
  id: string;
  email: string | null;
  name?: string | null;
  phone?: string | null;
  budget?: number | null;
  horizon?: number | null;
  preferredCity?: string | null;
}

/**
 * Link a portal User to their pre-existing CRM Lead(s), or create a fresh
 * portal lead (which fires the existing CRM automations via roadmap init).
 *
 * Idempotent: no-ops if the user already has linked leads. Safe to call on
 * every login. Never overwrites User values the user has already set.
 */
export async function resolveLeadIdentity(user: ResolvableUser) {
  const alreadyLinked = await prisma.lead.count({ where: { userId: user.id } });
  if (alreadyLinked > 0) return { linked: alreadyLinked, created: false as const };

  const email = (user.email || "").toLowerCase().trim();
  const phone10 = digits10(user.phone);

  // 1) exact email (case-insensitive), unlinked only
  let matches = email
    ? await prisma.lead.findMany({
        where: { email: { equals: email, mode: "insensitive" }, userId: null },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // 2) fall back to phone last-10
  if (matches.length === 0 && phone10) {
    const unlinked = await prisma.lead.findMany({ where: { userId: null }, orderBy: { createdAt: "desc" } });
    matches = unlinked.filter((l) => digits10(l.phone) === phone10);
  }

  if (matches.length > 0) {
    // Link ALL matches (most recent first). Duplicate-identity guard: if phone
    // matched but email differs, flag for admin review — never silent-merge.
    for (const lead of matches) {
      const emailDiffers = !!email && !!lead.email && lead.email.toLowerCase().trim() !== email;
      const note =
        (lead.notes ? lead.notes + "\n" : "") +
        "Client created a portal account." +
        (emailDiffers ? " needsMergeReview: true (phone matched, email differs)." : "");
      await prisma.lead.update({ where: { id: lead.id }, data: { userId: user.id, notes: note } });
    }

    // Backfill missing User fields from the most recent lead (never overwrite).
    const src = matches[0];
    const patch: Record<string, unknown> = {};
    if (user.budget == null && src.budget != null) patch.budget = src.budget;
    if (user.horizon == null && src.horizon != null) patch.horizon = src.horizon;
    if ((user.preferredCity == null || user.preferredCity === "Hyderabad") && src.city) patch.preferredCity = src.city;
    if (Object.keys(patch).length) await prisma.user.update({ where: { id: user.id }, data: patch });

    return { linked: matches.length, created: false as const };
  }

  // 3) no match → create a portal lead, firing existing CRM automations.
  const lead = await prisma.lead.create({
    data: {
      userId: user.id,
      name: user.name || "Client",
      email,
      phone: user.phone || "",
      budget: user.budget ?? 0,
      horizon: user.horizon ?? 0,
      city: user.preferredCity || "Hyderabad",
      notes: "Client created a portal account.",
      status: "NEW",
      source: "portal_signup",
      sourceChannel: "WEBSITE_FORM",
    },
  });

  try {
    const { initLeadRoadmap } = await import("./roadmap");
    await initLeadRoadmap(lead.id);
  } catch (e) {
    console.error("resolveLeadIdentity: initLeadRoadmap failed:", e);
  }

  return { linked: 0, created: true as const, leadId: lead.id };
}
