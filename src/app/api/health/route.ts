/**
 * GET /api/health — for uptime monitors. 200 when the app and database
 * respond; 503 otherwise. Says nothing about data or users.
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up", ms: Date.now() - started, at: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, db: "down", at: new Date().toISOString() }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
