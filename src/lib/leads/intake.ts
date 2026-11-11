/**
 * One way in for every lead that comes from a public form (enquiry, site
 * visit, calculator, research).
 *
 *   - One person, one open lead. A second enquiry from the same phone adds a
 *     dated line to the existing lead instead of creating another.
 *   - Nothing is invented. A budget or holding period the buyer didn't give
 *     stays empty; a buyer with no email gets the internal placeholder that
 *     every email path already skips (src/lib/placeholder-email.ts).
 *
 * The decision is a pure function (planIntake) so it can be unit-tested; the
 * database work is in intakeLead.
 */
import prisma from "../prisma";
import { isPlaceholderEmail } from "../placeholder-email";

import { phone10, planIntake, type ExistingLead, type LeadIntake } from "./plan";

export { phone10, isValidMobile, planIntake, type LeadIntake, type ExistingLead } from "./plan";

const EXISTING_SELECT = { id: true, name: true, email: true, phone: true, budget: true, horizon: true, notes: true, userId: true, projectId: true } as const;

/** The same person's most recent lead that is still open (not converted or lost). */
async function findOpenLead(i: LeadIntake): Promise<ExistingLead | null> {
  const p10 = phone10(i.phone);
  if (p10) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Lead"
      WHERE right(regexp_replace(phone, '\\D', '', 'g'), 10) = ${p10}
        AND status NOT IN ('CONVERTED', 'LOST')
      ORDER BY "createdAt" DESC
      LIMIT 1`;
    if (rows[0]) return prisma.lead.findUnique({ where: { id: rows[0].id }, select: EXISTING_SELECT });
    return null;
  }
  // No phone (an email-only research request): fall back to the address.
  const email = (i.email ?? "").trim().toLowerCase();
  if (!email || isPlaceholderEmail(email)) return null;
  return prisma.lead.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, status: { notIn: ["CONVERTED", "LOST"] } },
    orderBy: { createdAt: "desc" },
    select: EXISTING_SELECT,
  });
}

export interface IntakeResult {
  leadId: string;
  /** False when this added to a lead the person already had. */
  created: boolean;
}

export async function intakeLead(i: LeadIntake, now: Date = new Date()): Promise<IntakeResult> {
  const plan = planIntake(await findOpenLead(i), i, now);
  if (plan.action === "update") {
    await prisma.lead.update({ where: { id: plan.id }, data: plan.data });
    return { leadId: plan.id, created: false };
  }
  const { userId, projectId, ...rest } = plan.data;
  const lead = await prisma.lead.create({
    data: { ...rest, status: "NEW", sourceChannel: "WEBSITE_FORM", userId: userId ?? undefined, projectId: projectId ?? undefined },
    select: { id: true },
  });
  return { leadId: lead.id, created: true };
}
