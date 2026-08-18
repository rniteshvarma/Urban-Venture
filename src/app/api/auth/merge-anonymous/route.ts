import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mergeAnonymousSession } from "@/lib/anon-session";

/** Merge the anonymous session (cookie) into the signed-in user. Idempotent. */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const summary = await mergeAnonymousSession(session.user.id);
    return NextResponse.json({ success: true, ...summary });
  } catch (e: any) {
    console.error("POST /api/auth/merge-anonymous:", e);
    return NextResponse.json({ error: "Merge failed" }, { status: 500 });
  }
}
