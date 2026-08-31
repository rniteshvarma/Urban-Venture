// Shared guard for admin API routes.
//
// Middleware only matches page paths (/admin/:path*) — it never sees
// /api/admin/*. Every admin API route must therefore check the role itself;
// this helper keeps that check in one place.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type AdminAuth =
  | { ok: true; userId: string }
  | { ok: false; res: NextResponse };

/** Require a signed-in user with the ADMIN role. */
export async function requireAdmin(): Promise<AdminAuth> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN") {
    return { ok: false, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, userId: session.user.id };
}
