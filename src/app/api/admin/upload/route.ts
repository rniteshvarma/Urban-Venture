/**
 * POST /api/admin/upload — an image or PDF for a project (admin only).
 * The file's real type is read from its bytes (not its name), so an HTML or
 * SVG file renamed .jpg can't be served from our domain; stored via the
 * shared storage helper (Vercel Blob in production).
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { ACCEPTED_UPLOAD_TYPES, detectFileType } from "@/lib/extraction/filetype";
import { storeFile } from "@/lib/extraction/storage";
import { MAX_UPLOAD_BYTES } from "@/lib/security/uploads";

const MIME: Record<string, string> = { pdf: "application/pdf", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic" };

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: `File is larger than ${MAX_UPLOAD_BYTES / 1_000_000} MB` }, { status: 413 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const type = detectFileType(buffer);
    if (!type || !ACCEPTED_UPLOAD_TYPES.includes(type)) return NextResponse.json({ error: "Only JPEG, PNG, WebP, HEIC images and PDFs can be uploaded" }, { status: 415 });
    const url = await storeFile(buffer, file.name, MIME[type]);
    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Error in file upload handler:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
