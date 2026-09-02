// GET /api/admin/enquiries — every buyer enquiry across the platform.
//
// The CRM is the single place both sides are managed, so admins see the full
// picture: which listing was enquired on, who posted that listing (seller or
// house inventory), and whether the buyer's contact has been released.
// Admins see buyer contact unredacted — the redaction rule exists to keep it
// from *sellers* until an admin qualifies the buyer.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const released = searchParams.get("released"); // "true" | "false"
  const source = searchParams.get("source"); // ADMIN | SELLER

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;
  if (released === "true") where.contactReleased = true;
  if (released === "false") where.contactReleased = false;
  if (source) where.project = { listingSource: source };

  const rows = await prisma.listingEnquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      project: {
        select: {
          id: true,
          name: true,
          corridor: true,
          city: true,
          listingSource: true,
          owner: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
    },
  });

  const enquiries = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    status: r.status,
    contactReleased: r.contactReleased,
    message: r.message,
    budgetLakh: r.budgetLakh,
    leadId: r.leadId,
    buyer: { name: r.buyerName, phone: r.buyerPhone, email: r.buyerEmail },
    listing: r.project
      ? {
          id: r.project.id,
          name: r.project.name,
          corridor: r.project.corridor,
          city: r.project.city,
          source: r.project.listingSource,
          // House inventory has no owner — the CRM team is the contact.
          postedBy: r.project.owner
            ? { name: r.project.owner.name, email: r.project.owner.email, phone: r.project.owner.phone }
            : null,
        }
      : null,
  }));

  const counts = {
    total: enquiries.length,
    awaitingRelease: enquiries.filter((e) => !e.contactReleased && e.listing?.source === "SELLER").length,
    newStatus: enquiries.filter((e) => e.status === "NEW").length,
  };

  return NextResponse.json({ enquiries, counts });
}
