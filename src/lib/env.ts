/**
 * Required-secret resolution.
 *
 * These used to fall back to a hardcoded string committed to the repo, which
 * meant a missing env var in production silently allowed anyone with repo
 * access to forge an admin JWT. Now a missing secret is a hard failure in
 * production and a loud, clearly-marked dev-only value locally.
 */

const DEV_FALLBACK = "dev-only-insecure-secret-do-not-use-in-production";

let warned = false;

/**
 * The NextAuth signing secret. Throws in production when unset; in development
 * returns a fixed dev value so local work needs no setup.
 */
export function authSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret && secret.trim()) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXTAUTH_SECRET is not set. Refusing to start with a known signing key — " +
      "session tokens would be forgeable. Set NEXTAUTH_SECRET in the environment."
    );
  }

  if (!warned) {
    warned = true;
    console.warn(
      "[auth] NEXTAUTH_SECRET is not set — using an insecure development-only secret. " +
      "Set NEXTAUTH_SECRET before deploying."
    );
  }
  return DEV_FALLBACK;
}
