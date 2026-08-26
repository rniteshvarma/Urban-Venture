/**
 * Magic-byte file-type detection for uploads (Brochure Ingestion base
 * constraint #7 + Image Addendum Part 2.1). Never trust the extension.
 * Pure — works on a Buffer/Uint8Array of (at least) the first ~16 bytes.
 */

export type DetectedType = 'pdf' | 'jpeg' | 'png' | 'webp' | 'heic';

export const ACCEPTED_IMAGE_TYPES: DetectedType[] = ['jpeg', 'png', 'webp', 'heic'];
export const ACCEPTED_UPLOAD_TYPES: DetectedType[] = ['pdf', ...ACCEPTED_IMAGE_TYPES];

/** HEIF/HEIC brand codes that appear right after the "ftyp" box marker. */
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']);

function ascii(b: Uint8Array, start: number, len: number): string {
  let s = '';
  for (let i = start; i < start + len && i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
}

/** Detect a supported upload type from its leading bytes, or null. */
export function detectFileType(input: Uint8Array | ArrayBuffer): DetectedType | null {
  const b = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  if (b.length < 12) return null;

  // PDF: "%PDF-"
  if (ascii(b, 0, 5) === '%PDF-') return 'pdf';

  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';

  // WEBP: "RIFF"...."WEBP"
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp';

  // HEIC/HEIF: ISO-BMFF box "ftyp" at offset 4, brand at offset 8
  if (ascii(b, 4, 4) === 'ftyp' && HEIC_BRANDS.has(ascii(b, 8, 4).toLowerCase())) return 'heic';

  return null;
}

export interface FileTypeCheck {
  ok: boolean;
  type: DetectedType | null;
  isImage: boolean;
  reason?: string;
}

/** Validate an upload's real type and whether it is an accepted format. */
export function checkUploadType(input: Uint8Array | ArrayBuffer): FileTypeCheck {
  const type = detectFileType(input);
  if (!type) return { ok: false, type: null, isImage: false, reason: 'Unrecognised or unsupported file type.' };
  return { ok: true, type, isImage: type !== 'pdf' };
}
