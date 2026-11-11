/**
 * Everything the project page shows, for one viewer. Used by GET
 * /api/projects/[id] and by the server-rendered project page, so both return
 * the same thing. Null when the project doesn't exist or this viewer may not
 * see it (unpublished listings are for their owner and admins only).
 */
import prisma from "../prisma";
import { gradeFor } from "../listings/score";
import { gradeOf } from "../inventory/rating";
import { canView, withoutPrivateFields } from "./visibility";

export interface Viewer {
  userId: string | null;
  isAdmin: boolean;
}

export const ANONYMOUS: Viewer = { userId: null, isAdmin: false };

export async function loadProjectDetail(id: string, viewer: Viewer) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      unitTypes: { orderBy: { displayOrder: "asc" } },
      media: {
        where: { isPublic: true, isRejected: false },
        orderBy: { displayOrder: "asc" },
        select: { id: true, fileUrl: true, mediaType: true, altText: true, isPrimary: true },
      },
      // Separate from the rating; from OpenStreetMap places (© OpenStreetMap contributors).
      accessibility: { select: { score: true, confidence: true, components: true, nearest: true, within: true, watchOuts: true, computedAt: true } },
    },
  });
  if (!project || !canView(project, viewer)) return null;

  // Constraint 7: strip the raw seller score; expose a grade instead.
  // Researched admin inventory exposes Property Tiger's own rating breakdown.
  // Internal review notes, owner id and survey numbers never leave for non-admins.
  const { listingScore, scoreBreakdown } = project;
  const pub = viewer.isAdmin ? project : withoutPrivateFields(project);
  const isInventory = project.listingSource === "ADMIN" && project.sourceType === "CSV_IMPORT" && listingScore != null;
  return {
    ...pub,
    isVerifiedInventory: project.listingSource === "ADMIN",
    listingGrade: project.listingSource === "SELLER" && listingScore != null ? gradeFor(listingScore) : null,
    inventoryScore: isInventory ? listingScore : null,
    inventoryGrade: isInventory ? gradeOf(listingScore!) : null,
    inventoryRating: isInventory ? scoreBreakdown : null,
  };
}
