/**
 * GET  — the signed-in buyer's saved searches.
 * POST { filters, name? } — save the current /projects search with daily email alerts.
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { describeFilters, type ProjectFilters } from "@/lib/projects/query";

const MAX_SEARCHES = 10;

function cleanFilters(raw: unknown): ProjectFilters {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (k: string) => (typeof r[k] === "string" && (r[k] as string).trim() && r[k] !== "ALL" ? (r[k] as string).trim().slice(0, 100) : null);
  const num = (k: string) => (typeof r[k] === "number" && Number.isFinite(r[k]) && (r[k] as number) >= 0 ? (r[k] as number) : null);
  return { corridor: str("corridor"), locality: str("locality"), type: str("type"), risk: str("risk"), q: str("q"), minBudget: num("minBudget"), maxBudget: num("maxBudget") };
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to see saved searches" }, { status: 401 });
  const rows = await prisma.savedSearch.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ searches: rows.map((r) => ({ ...r, unsubscribeKey: undefined })) });
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to save searches" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const filters = cleanFilters(body.filters);
  const count = await prisma.savedSearch.count({ where: { userId } });
  if (count >= MAX_SEARCHES) return NextResponse.json({ error: `You can save up to ${MAX_SEARCHES} searches — remove one first.` }, { status: 400 });
  const same = await prisma.savedSearch.findFirst({ where: { userId, filters: { equals: filters as object } } });
  if (same) return NextResponse.json({ search: same, existing: true });
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : describeFilters(filters);
  const search = await prisma.savedSearch.create({ data: { userId, name, filters: filters as object } });
  return NextResponse.json({ search: { ...search, unsubscribeKey: undefined } }, { status: 201 });
}
