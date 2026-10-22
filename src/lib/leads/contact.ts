/**
 * The account a public form submission (calculator, research, enquiry)
 * belongs to. Anyone can type any email into those forms, so:
 *
 *   - signed in            → the visitor's own account
 *   - email already known  → that account, but it is NEVER changed (name,
 *                            phone) and `owned` is false, so callers don't
 *                            attach private things (e.g. a report) to it
 *   - new email            → a new contact record (no password); claiming it
 *                            later needs the email's owner (see signup)
 */
import prisma from "../prisma";

export interface FormContact {
  userId: string;
  /** True when the submitter is the account's owner (signed in, or the account was just created for them). */
  owned: boolean;
}

export async function formContact(i: { email: string; name?: string | null; phone?: string | null; sessionUserId: string | null }): Promise<FormContact> {
  if (i.sessionUserId) return { userId: i.sessionUserId, owned: true };
  const email = i.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { userId: existing.id, owned: false };
  const created = await prisma.user.create({
    data: { email, name: i.name?.trim() || "Client", phone: i.phone?.trim() || "", role: "CLIENT" },
    select: { id: true },
  });
  return { userId: created.id, owned: true };
}
