/**
 * Where to send someone after signing in. Only same-site paths are allowed:
 * "/dashboard", "/projects?type=Villa". Anything that could leave the site —
 * "https://…", "//evil.example", "/\evil.example", "javascript:" — falls back.
 */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (typeof next !== "string") return fallback;
  const n = next.trim();
  if (!n.startsWith("/") || n.startsWith("//") || n.startsWith("/\\") || /[\u0000-\u001f]/.test(n)) return fallback;
  try {
    // Resolving against a dummy origin must not change the origin.
    const u = new URL(n, "https://same.invalid");
    if (u.origin !== "https://same.invalid") return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
