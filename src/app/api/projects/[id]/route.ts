import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadProjectDetail } from "@/lib/projects/detail";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Unpublished listings (pending, rejected, paused, archived) exist only for
    // their owner and admins; everyone else gets the same 404 as a missing id.
    const session = await getServerSession(authOptions);
    const viewer = { userId: session?.user?.id ?? null, isAdmin: session?.user?.role === "ADMIN" };
    const project = await loadProjectDetail(id, viewer);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch (error) {
    console.error(`Error fetching project ${id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
