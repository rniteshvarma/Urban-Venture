/**
 * Full developer track-record sync (run locally), then export the snapshot
 * the Vercel build loads (prisma/data/rera-records.json).
 *
 *   npm run developers:sync                 # due certificates, all order lists, every unread order PDF
 *   npm run developers:sync -- --force      # re-read every certificate
 *   npm run developers:sync -- --no-pdf     # skip reading order PDFs
 *   npm run developers:sync -- --certs=30   # read up to 30 certificates this run (default 15)
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import prisma from "../../src/lib/prisma";
import { rebuildDevelopers, syncCertificates, syncOrders } from "../../src/lib/developers/sync";

async function main() {
  const log = console.log;
  const maxArg = process.argv.find((a) => a.startsWith("--certs="));
  const certs = await syncCertificates({ force: process.argv.includes("--force"), max: maxArg ? Number(maxArg.slice(8)) : undefined, log });
  console.log("[developers] certificates:", JSON.stringify({ ...certs, errors: certs.errors.length }));
  const orders = await syncOrders({ pdfLimit: process.argv.includes("--no-pdf") ? 0 : undefined, log });
  console.log("[developers] orders:", JSON.stringify({ ...orders, errors: orders.errors.length }));
  for (const e of [...certs.errors, ...orders.errors].slice(0, 20)) console.log("  !", e);
  await rebuildDevelopers({ log });

  const snapshot = {
    note: "Public TG-RERA data (certificate pages of projects in our listings; order lists and the respondent named in each order). Complainants are never stored. Regenerate with `npm run developers:sync`.",
    exportedAt: new Date().toISOString(),
    certificates: await prisma.reraCertificate.findMany({ orderBy: { reraNumber: "asc" } }),
    orders: await prisma.regulatoryOrder.findMany({ orderBy: { id: "asc" }, select: { id: true, kind: true, title: true, orderDate: true, caseNumber: true, respondent: true, respondentKey: true, projectName: true, documentUrl: true, extractedFrom: true, fetchedAt: true } }),
  };
  const file = path.join(__dirname, "../../prisma/data/rera-records.json");
  writeFileSync(file, JSON.stringify(snapshot, null, 1) + "\n");
  console.log(`[developers] wrote ${snapshot.certificates.length} certificates and ${snapshot.orders.length} orders to prisma/data/rera-records.json`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
