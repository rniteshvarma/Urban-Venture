import prisma from "./prisma";

export interface ScorableUser {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneVerified?: boolean | null;
  budget?: number | null;
  horizon?: number | null;
  preferredCity?: string | null;
  riskAppetite?: string | null;
}

/** Profile completeness 0-100 (spec §1.7 weights). */
export function computeProfileScore(u: ScorableUser): number {
  let s = 0;
  if (u.name) s += 10;
  if (u.email) s += 10;
  if (u.phone) s += 15;
  if (u.phoneVerified) s += 10;
  if (u.budget != null) s += 15;
  if (u.horizon != null) s += 15;
  if (u.preferredCity) s += 10;
  if (u.riskAppetite) s += 15;
  return Math.min(100, s);
}

/** Recompute and persist a user's profileScore. Returns the new value. */
export async function refreshProfileScore(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, phone: true, phoneVerified: true, budget: true, horizon: true, preferredCity: true, riskAppetite: true },
  });
  if (!user) return 0;
  const score = computeProfileScore(user);
  await prisma.user.update({ where: { id: userId }, data: { profileScore: score } });
  return score;
}
