/**
 * Make sure the CRM admin account exists — the only user the build creates.
 * Runs in the Vercel build, so a fresh or reset production database always
 * has a way in. Safe to run every deploy:
 *
 *   - the account comes from env vars set in Vercel (never from the repo):
 *       ADMIN_EMAIL           e.g. uv@gmail.com
 *       ADMIN_PASSWORD        at least 10 characters
 *       ADMIN_PASSWORD_RESET  "true" to overwrite an existing account's password
 *   - an existing account's password is left alone unless ADMIN_PASSWORD_RESET
 *     is "true"; an existing non-admin account with that email is promoted
 *   - nothing else is touched (unlike prisma/seed.ts, which must never run on prod)
 *   - with the vars unset it does nothing
 *
 * Logs the email and what it did, never the password.
 */
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("[admin] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin account check");
    return;
  }
  if (password.length < 10) {
    console.warn("[admin] ADMIN_PASSWORD is shorter than 10 characters — not creating or changing the admin account");
    return;
  }
  const reset = process.env.ADMIN_PASSWORD_RESET === "true";

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, password: true } });
  if (!existing) {
    await prisma.user.create({
      data: { email, name: "Property Tiger Admin", password: await bcrypt.hash(password, 10), role: "ADMIN", emailVerified: new Date() },
    });
    console.log(`[admin] created admin account ${email}`);
    return;
  }

  const data: { role?: "ADMIN"; password?: string } = {};
  if (existing.role !== "ADMIN") data.role = "ADMIN";
  if (!existing.password || reset) data.password = await bcrypt.hash(password, 10);
  if (Object.keys(data).length) {
    await prisma.user.update({ where: { id: existing.id }, data });
    console.log(`[admin] updated ${email}: ${[data.role && "promoted to ADMIN", data.password && "password set"].filter(Boolean).join(", ")}`);
  } else {
    console.log(`[admin] ${email} already exists as ADMIN — left unchanged`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    // Never fail the deploy over this; the log says what went wrong.
    console.error("[admin] could not ensure the admin account:", e instanceof Error ? e.message : e);
    await prisma.$disconnect();
  });
