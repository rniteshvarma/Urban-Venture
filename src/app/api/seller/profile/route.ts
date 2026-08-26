// GET  /api/seller/profile — current user's seller profile (null if none)
// POST /api/seller/profile — create/update the seller profile (onboarding)
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { reraAgentRequired } from "@/lib/listings/seller";

const SELLER_TYPES = new Set(["OWNER", "AGENT", "BUILDER"]);

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [profile, user] = await Promise.all([
    prisma.sellerProfile.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);
  return NextResponse.json({ profile, name: user?.name ?? "" });
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const sellerType = String(body.sellerType ?? "").toUpperCase();
  const displayName = String(body.displayName ?? "").trim();
  const firmName = body.firmName ? String(body.firmName).trim() : null;
  const reraAgentNumber = body.reraAgentNumber ? String(body.reraAgentNumber).trim() : null;

  if (!SELLER_TYPES.has(sellerType)) return NextResponse.json({ error: "Choose Owner, Agent, or Builder." }, { status: 400 });
  if (!displayName) return NextResponse.json({ error: "Display name is required." }, { status: 400 });
  if (reraAgentRequired(sellerType) && !reraAgentNumber) {
    return NextResponse.json({ error: "RERA agent number is required for agents and builders." }, { status: 400 });
  }

  const data = { sellerType: sellerType as "OWNER" | "AGENT" | "BUILDER", displayName, firmName, reraAgentNumber };
  const profile = await prisma.sellerProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  return NextResponse.json({ profile });
}
