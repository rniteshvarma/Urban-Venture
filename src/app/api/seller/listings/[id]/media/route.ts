// POST   /api/seller/listings/[id]/media — upload photos / plans / documents
// DELETE /api/seller/listings/[id]/media?mediaId= — remove one
//
// Photos & plans are public (isPublic=true); documents are private, for
// verification only (isPublic=false). Reuses the existing storage helper.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSeller, ownedListing } from "@/lib/listings/api";
import { detectFileType } from "@/lib/extraction/filetype";
import { storeFile } from "@/lib/extraction/storage";

const MIME: Record<string, string> = { pdf: "application/pdf", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic" };
// role → MediaType + visibility
const ROLE_MAP: Record<string, { mediaType: string; isPublic: boolean }> = {
  PHOTO: { mediaType: "SITE_PHOTO", isPublic: true },
  LAYOUT: { mediaType: "MASTER_PLAN", isPublic: true },
  FLOOR_PLAN: { mediaType: "FLOOR_PLAN", isPublic: true },
  DOCUMENT: { mediaType: "SPECIFICATION_TABLE", isPublic: false }, // private verification doc
};
const MAX_FILES = 20;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSeller();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;

  const listing = await ownedListing(auth.userId, id);
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData();
  const role = String(form.get("role") ?? "PHOTO").toUpperCase();
  const map = ROLE_MAP[role] ?? ROLE_MAP.PHOTO;
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  if (files.length > MAX_FILES) return NextResponse.json({ error: `Max ${MAX_FILES} files` }, { status: 400 });

  const existingCount = await prisma.projectMedia.count({ where: { projectId: id } });
  const created = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const buf = Buffer.from(await f.arrayBuffer());
    const type = detectFileType(buf);
    if (!type) return NextResponse.json({ error: `Unsupported file: ${f.name}` }, { status: 400 });
    const mime = MIME[type];
    const url = await storeFile(buf, f.name, mime);
    const media = await prisma.projectMedia.create({
      data: {
        projectId: id,
        fileUrl: url,
        mimeType: mime,
        fileSizeKb: Math.round(buf.length / 1024),
        mediaType: map.mediaType as never,
        extractMethod: "DIRECT_UPLOAD" as never,
        isPublic: map.isPublic,
        displayOrder: existingCount + i,
      },
    });
    created.push(media);
    // Mirror public photos onto Project.imageUrls so the existing card/detail render them
    if (map.isPublic) {
      await prisma.project.update({ where: { id }, data: { imageUrls: { push: url } } });
    }
  }
  return NextResponse.json({ ok: true, media: created });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSeller();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;

  const listing = await ownedListing(auth.userId, id);
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const mediaId = new URL(req.url).searchParams.get("mediaId");
  if (!mediaId) return NextResponse.json({ error: "mediaId required" }, { status: 400 });

  const media = await prisma.projectMedia.findFirst({ where: { id: mediaId, projectId: id } });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.projectMedia.delete({ where: { id: mediaId } });
  // Keep Project.imageUrls in sync
  await prisma.project.update({ where: { id }, data: { imageUrls: listing.imageUrls.filter((u) => u !== media.fileUrl) } });
  return NextResponse.json({ ok: true });
}
