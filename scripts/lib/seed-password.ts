/**
 * Resolves the admin password used by the seed scripts.
 *
 * Local databases keep the well-known dev password so onboarding stays easy.
 * Anything else must supply SEED_ADMIN_PASSWORD explicitly — seeding a remote
 * database with a guessable admin password is how a staging box becomes an
 * open door.
 */
const LOCAL_DEV_PASSWORD = "12345678";

export function seedAdminPassword(): string {
  const explicit = process.env.SEED_ADMIN_PASSWORD;
  if (explicit && explicit.trim()) return explicit.trim();

  const url = process.env.DATABASE_URL ?? "";
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  if (!isLocal) {
    throw new Error(
      "SEED_ADMIN_PASSWORD is required when seeding a non-local database. " +
      "Refusing to create an admin account with the default dev password."
    );
  }
  return LOCAL_DEV_PASSWORD;
}
