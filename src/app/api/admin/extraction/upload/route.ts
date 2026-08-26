/**
 * POST /api/admin/extraction/upload — multipart (files[] + optional roles/hints).
 * Validates by magic bytes, stores files, creates an ExtractionJob, and kicks off
 * extraction via next/server after() (Architecture C — no worker/queue).
 */
import { after } from 'next/server';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { detectFileType, type DetectedType } from '@/lib/extraction/filetype';
import { storeFile } from '@/lib/extraction/storage';
import { runExtraction } from '@/lib/extraction/run';

export const maxDuration = 300;

const MIME: Record<DetectedType, string> = {
  pdf: 'application/pdf', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic',
};
const MAX_FILES = 15;
const MAX_TOTAL_MB = 40;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const form = await req.formData();
    const files = form.getAll('files').filter((f): f is File => f instanceof File);
    if (files.length === 0) return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    if (files.length > MAX_FILES) return NextResponse.json({ error: `Max ${MAX_FILES} files` }, { status: 400 });

    const roles: (string | null)[] = form.get('roles') ? JSON.parse(String(form.get('roles'))) : [];
    const hints = {
      developer: (form.get('developer') as string) || undefined,
      corridor: (form.get('corridor') as string) || undefined,
      city: (form.get('city') as string) || undefined,
    };

    let totalBytes = 0;
    const stored: Array<{ url: string; mime: string; sizeKb: number; name: string; type: DetectedType; buffer: Buffer; role: string | null }> = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const buf = Buffer.from(await f.arrayBuffer());
      totalBytes += buf.length;
      if (totalBytes > MAX_TOTAL_MB * 1024 * 1024) return NextResponse.json({ error: `Total exceeds ${MAX_TOTAL_MB}MB` }, { status: 400 });
      const type = detectFileType(buf);
      if (!type) return NextResponse.json({ error: `Unsupported file: ${f.name} (not a PDF/JPG/PNG/WEBP/HEIC)` }, { status: 400 });
      if (type === 'pdf' && buf.length > 32 * 1024 * 1024) {
        return NextResponse.json({ error: `${f.name} is ${(buf.length / 1024 / 1024).toFixed(0)}MB — over the 32MB limit for AI reading. Please upload a smaller PDF or split it.` }, { status: 400 });
      }
      const mime = MIME[type];
      const url = await storeFile(buf, f.name, mime);
      stored.push({ url, mime, sizeKb: Math.round(buf.length / 1024), name: f.name, type, buffer: buf, role: roles[i] ?? null });
    }

    const anyPdf = stored.some((s) => s.type === 'pdf');
    const anyImg = stored.some((s) => s.type !== 'pdf');
    const sourceFormat = anyPdf && anyImg ? 'MIXED' : anyPdf ? 'PDF' : 'IMAGE_SET';

    const job = await prisma.extractionJob.create({
      data: {
        sourceFormat,
        inputFileCount: stored.length,
        createdBy: session.user.id,
        status: 'QUEUED',
        stage: 'Uploaded',
        progressPct: 25,
        usedOCR: sourceFormat !== 'PDF',
        inputs: {
          create: stored.map((s, i) => ({
            originalFileName: s.name, mimeType: s.mime, fileSizeKb: s.sizeKb, originalUrl: s.url, displayOrder: i, declaredRole: (s.role as never) ?? null,
          })),
        },
      },
    });

    // Files Claude can read directly (HEIC needs conversion — deferred; excluded here).
    const extractFiles = stored.filter((s) => s.type !== 'heic').map((s) => ({ buffer: s.buffer, mediaType: s.mime }));
    const mediaInputs = stored
      .filter((s) => s.type !== 'pdf')
      .map((s) => ({ fileUrl: s.url, mimeType: s.mime, fileSizeKb: s.sizeKb, declaredRole: s.role, isScreenshot: s.role === 'LISTING_SCREENSHOT' }));
    const declaredRoles = stored.map((s) => s.role);

    after(() => runExtraction(job.id, extractFiles, { sourceFormat, hints, declaredRoles, mediaInputs }));

    return NextResponse.json({ jobId: job.id, sourceFormat, fileCount: stored.length });
  } catch (error) {
    console.error('POST /api/admin/extraction/upload', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status: 500 });
  }
}
