import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import prisma from "./prisma";

const ANON_COOKIE = "anon_sid";
const NINETY_DAYS = 60 * 60 * 24 * 90;

/** Read the anonymous-session token from the cookie, if any. */
export async function getAnonToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ANON_COOKIE)?.value ?? null;
}

/**
 * Ensure an AnonymousSession exists and its cookie is set. Call from a Route
 * Handler or Server Action (cookies are writable there). Returns the token.
 */
export async function ensureAnonSession(): Promise<string> {
  const store = await cookies();
  const existing = store.get(ANON_COOKIE)?.value;
  if (existing) {
    const found = await prisma.anonymousSession.findUnique({ where: { token: existing } });
    if (found && !found.mergedIntoUserId) {
      await prisma.anonymousSession.update({ where: { token: existing }, data: { lastActiveAt: new Date() } }).catch(() => {});
      return existing;
    }
  }
  const token = randomBytes(24).toString("hex");
  await prisma.anonymousSession.create({ data: { token } });
  store.set(ANON_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: NINETY_DAYS,
  });
  return token;
}

type AnonArrayField = "searchIds" | "savedProjectIds" | "watchedCorridors";

/** Append an id to the current anonymous session's array (deduped). */
export async function pushAnonActivity(field: AnonArrayField, id: string): Promise<void> {
  const token = await ensureAnonSession();
  const anon = await prisma.anonymousSession.findUnique({ where: { token } });
  if (!anon) return;
  const current = anon[field] as string[];
  if (current.includes(id)) return;
  await prisma.anonymousSession.update({
    where: { token },
    data: { [field]: { set: [...current, id] }, lastActiveAt: new Date() },
  });
}

async function clearAnonCookie() {
  const store = await cookies();
  store.set(ANON_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export interface MergeSummary {
  reports: number;
  projects: number;
  corridors: number;
}

/**
 * Merge the anonymous session (from the cookie) into a signed-in user.
 * Reassigns Searches, creates SavedReport/SavedProject/CorridorWatch (deduped,
 * snapshotting corridor price+score), marks the session merged, clears cookie.
 */
export async function mergeAnonymousSession(userId: string): Promise<MergeSummary> {
  const summary: MergeSummary = { reports: 0, projects: 0, corridors: 0 };
  const token = await getAnonToken();
  if (!token) return summary;

  const anon = await prisma.anonymousSession.findUnique({ where: { token } });
  if (!anon || anon.mergedIntoUserId) {
    await clearAnonCookie();
    return summary;
  }

  // 1) Searches → reassign + auto-create a SavedReport per search.
  for (const searchId of anon.searchIds) {
    const search = await prisma.search.findUnique({ where: { id: searchId } });
    if (!search) continue;
    if (!search.userId) await prisma.search.update({ where: { id: searchId }, data: { userId } });
    const existingReport = await prisma.savedReport.findUnique({ where: { searchId } });
    if (!existingReport) {
      const dateStr = search.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const title = `₹${search.budget}L · ${search.horizon}yr · ${search.city} — ${dateStr}`;
      await prisma.savedReport.create({ data: { userId, searchId, title } });
      summary.reports++;
    }
  }

  // 2) Saved projects (dedupe).
  for (const projectId of anon.savedProjectIds) {
    const exists = await prisma.savedProject.findUnique({ where: { userId_projectId: { userId, projectId } } });
    if (exists) continue;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) continue;
    await prisma.savedProject.create({ data: { userId, projectId } });
    summary.projects++;
  }

  // 3) Corridor watches (dedupe + snapshot price/score at merge time).
  for (const slug of anon.watchedCorridors) {
    const exists = await prisma.corridorWatch.findUnique({ where: { userId_corridorSlug: { userId, corridorSlug: slug } } });
    if (exists) continue;
    const cp = await prisma.corridorProfile.findUnique({ where: { slug } });
    await prisma.corridorWatch.create({
      data: {
        userId,
        corridorSlug: slug,
        priceAtWatchSqYd: cp?.plotPriceMidSqYd ?? cp?.plotPriceMinSqYd ?? null,
        scoreAtWatch: cp?.overallScore ?? null,
      },
    });
    summary.corridors++;
  }

  await prisma.anonymousSession.update({ where: { token }, data: { mergedIntoUserId: userId, mergedAt: new Date() } });
  await clearAnonCookie();
  return summary;
}
