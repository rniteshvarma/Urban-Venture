// GET /api/seller/enquiries?status= — buyer enquiries on the seller's listings.
// Serialized with the contact-hiding rule (phone/email hidden until released).
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSeller } from "@/lib/listings/api";
import { serializeEnquiryForSeller } from "@/lib/listings/serializer";

export async function GET(req: Request) {
  const auth = await requireSeller();
  if (!auth.ok) return auth.res;

  const status = new URL(req.url).searchParams.get("status");
  const where: { project: { ownerId: string; listingSource: "SELLER" }; status?: "NEW" | "VIEWED" | "RESPONDED" | "CLOSED" | "SPAM" } = {
    project: { ownerId: auth.userId, listingSource: "SELLER" },
  };
  if (status) where.status = status as typeof where.status;

  const rows = await prisma.listingEnquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { project: { select: { id: true, name: true, corridor: true, city: true } } },
  });

  const enquiries = rows.map((r) => ({
    ...serializeEnquiryForSeller(r),
    projectId: r.projectId,
    projectName: r.project?.name ?? null,
    corridor: r.project?.corridor ?? null,
  }));

  const newCount = rows.filter((r) => r.status === "NEW").length;
  return NextResponse.json({ enquiries, newCount });
}
