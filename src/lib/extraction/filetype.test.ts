import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectFileType, checkUploadType } from './filetype';

const bytes = (...arr: number[]) => new Uint8Array([...arr, ...new Array(16).fill(0)]);
const ascii = (s: string) => new Uint8Array([...[...s].map((c) => c.charCodeAt(0)), ...new Array(16).fill(0)]);

test('detects PDF', () => {
  assert.equal(detectFileType(ascii('%PDF-1.7')), 'pdf');
});

test('detects JPEG', () => {
  assert.equal(detectFileType(bytes(0xff, 0xd8, 0xff, 0xe0)), 'jpeg');
});

test('detects PNG', () => {
  assert.equal(detectFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), 'png');
});

test('detects WEBP (RIFF....WEBP)', () => {
  const b = new Uint8Array(16);
  b.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
  b.set([...'WEBP'].map((c) => c.charCodeAt(0)), 8);
  assert.equal(detectFileType(b), 'webp');
});

test('detects HEIC (ftyp + brand)', () => {
  const make = (brand: string) => {
    const b = new Uint8Array(16);
    b.set([...'ftyp'].map((c) => c.charCodeAt(0)), 4);
    b.set([...brand].map((c) => c.charCodeAt(0)), 8);
    return b;
  };
  assert.equal(detectFileType(make('heic')), 'heic');
  assert.equal(detectFileType(make('mif1')), 'heic');
  assert.equal(detectFileType(make('heix')), 'heic');
});

test('rejects unknown / too-short', () => {
  assert.equal(detectFileType(bytes(0x00, 0x01, 0x02)), null);
  assert.equal(detectFileType(new Uint8Array(4)), null);
  // A renamed .exe with MZ header must not pass as an image.
  assert.equal(detectFileType(ascii('MZ\x90\x00')), null);
});

test('checkUploadType: image vs pdf flags', () => {
  assert.deepEqual(checkUploadType(bytes(0xff, 0xd8, 0xff)), { ok: true, type: 'jpeg', isImage: true });
  assert.deepEqual(checkUploadType(ascii('%PDF-')), { ok: true, type: 'pdf', isImage: false });
  const bad = checkUploadType(bytes(0x00));
  assert.equal(bad.ok, false);
});
