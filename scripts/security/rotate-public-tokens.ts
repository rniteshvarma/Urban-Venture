/**
 * Replaces inbound webhook tokens that were ever committed to the repository
 * (the "<source>-token-uv-2026" seed values). Anyone reading the repo could
 * post leads to /api/webhooks/inbound/<token> with them.
 *
 *   npx tsx scripts/security/rotate-public-tokens.ts
 *
 * Runs in every Vercel build; does nothing once no public token remains.
 * A source rotated here needs its new URL copied from /admin/integrations
 * into whatever system sends to it.
 */
import prisma from "../../src/lib/prisma";
import { PUBLIC_TOKEN, webhookToken } from "../../src/lib/security/tokens";

async function main() {
  const sources = await prisma.inboundSource.findMany({ select: { id: true, name: true, webhookToken: true } });
  const exposed = sources.filter((s) => PUBLIC_TOKEN.test(s.webhookToken));
  for (const s of exposed) {
    await prisma.inboundSource.update({ where: { id: s.id }, data: { webhookToken: webhookToken(s.webhookToken.replace(PUBLIC_TOKEN, "")) } });
  }
  console.log(`[security] rotated ${exposed.length} public webhook token(s)${exposed.length ? `: ${exposed.map((s) => s.name).join(", ")}` : ""}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
