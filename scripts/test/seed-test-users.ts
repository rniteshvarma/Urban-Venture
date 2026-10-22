/**
 * Local-only test accounts for security / regression testing.
 *
 *   npx tsx --env-file=.env.local scripts/test/seed-test-users.ts
 *
 * Creates (or resets) an admin, two buyers and a seller with a freshly
 * generated password, written to .env.test.local (git-ignored). Refuses to run
 * unless DATABASE_URL points at localhost, so it can never touch production.
 */
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";

const url = process.env.DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) {
  console.error("Refusing: DATABASE_URL is not a local database.");
  process.exit(1);
}

const USERS = [
  { key: "ADMIN", email: "sec-admin@test.local", role: "ADMIN" as const, name: "Security Test Admin" },
  { key: "BUYER_A", email: "sec-buyer-a@test.local", role: "CLIENT" as const, name: "Buyer A" },
  { key: "BUYER_B", email: "sec-buyer-b@test.local", role: "CLIENT" as const, name: "Buyer B" },
  { key: "SELLER", email: "sec-seller@test.local", role: "CLIENT" as const, name: "Seller S" },
];

async function main() {
  const password = randomBytes(12).toString("base64url");
  const hash = await bcrypt.hash(password, 10);
  const lines = [`TEST_PASSWORD=${password}`];
  for (const [i, u] of USERS.entries()) {
    const phone = `+9190000000${String(i + 1).padStart(2, "0")}`;
    const row = await prisma.user.upsert({
      where: { email: u.email },
      update: { password: hash, role: u.role, name: u.name },
      create: { email: u.email, password: hash, role: u.role, name: u.name, phone, authProvider: "EMAIL", emailVerified: new Date() },
    });
    lines.push(`TEST_${u.key}_EMAIL=${u.email}`, `TEST_${u.key}_ID=${row.id}`);
  }
  fs.writeFileSync(".env.test.local", lines.join("\n") + "\n");
  console.log(`Created ${USERS.length} local test accounts; credentials in .env.test.local`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
