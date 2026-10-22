import { timingSafeEqual } from "node:crypto";

/** Constant-time string comparison (no early exit that leaks how much matched). */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
