/**
 * File storage abstraction. Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set
 * (prod), else falls back to public/uploads for local dev — so the feature works
 * end-to-end locally before Blob is provisioned.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export function storageMode(): 'blob' | 'local' {
  return hasBlob() ? 'blob' : 'local';
}

/** Persist a file and return a publicly-fetchable URL. */
export async function storeFile(buffer: Buffer, filename: string, contentType: string): Promise<string> {
  // Unguessable names: some uploads are private documents (sellers' ownership papers).
  const ext = (filename.match(/\.[a-zA-Z0-9]{1,5}$/)?.[0] ?? '').toLowerCase();
  const key = `extraction/${randomUUID()}${ext}`;

  if (hasBlob()) {
    const { put } = await import('@vercel/blob');
    const blob = await put(key, buffer, { access: 'public', contentType, addRandomSuffix: false });
    return blob.url;
  }

  // Local dev fallback — write under public/ so Next serves it.
  const rel = key; // e.g. extraction/....
  const dir = join(process.cwd(), 'public', 'uploads', 'extraction');
  await mkdir(dir, { recursive: true });
  const name = rel.split('/').pop()!;
  await writeFile(join(dir, name), buffer);
  return `/uploads/extraction/${name}`;
}
