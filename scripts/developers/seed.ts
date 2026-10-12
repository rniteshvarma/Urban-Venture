/**
 * Build step: load the TG-RERA snapshot (prisma/data/rera-records.json) —
 * never overwriting a row the cron has refreshed since — then rebuild the
 * developer track records from the current listings.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import prisma from "../../src/lib/prisma";
import { rebuildDevelopers } from "../../src/lib/developers/sync";

interface Snapshot {
  certificates: (Omit<Prisma.ReraCertificateUncheckedCreateInput, "fetchedAt"> & { fetchedAt: string })[];
  orders: (Omit<Prisma.RegulatoryOrderUncheckedCreateInput, "fetchedAt"> & { fetchedAt: string })[];
}

async function main() {
  const file = path.join(__dirname, "../../prisma/data/rera-records.json");
  if (existsSync(file)) {
    const snap = JSON.parse(readFileSync(file, "utf8")) as Snapshot;
    const haveCerts = new Map((await prisma.reraCertificate.findMany({ select: { reraNumber: true, fetchedAt: true } })).map((c) => [c.reraNumber, c.fetchedAt]));
    let certs = 0;
    for (const c of snap.certificates) {
      const seen = haveCerts.get(c.reraNumber);
      if (seen && seen >= new Date(c.fetchedAt)) continue;
      const data = { ...c, buildings: (c.buildings ?? undefined) as Prisma.InputJsonValue | undefined, fetchedAt: new Date(c.fetchedAt) };
      await prisma.reraCertificate.upsert({ where: { reraNumber: c.reraNumber }, create: data, update: data });
      certs++;
    }
    const haveOrders = new Set((await prisma.regulatoryOrder.findMany({ select: { id: true } })).map((o) => o.id));
    const newOrders = snap.orders.filter((o) => !haveOrders.has(o.id)).map((o) => ({ ...o, fetchedAt: new Date(o.fetchedAt) }));
    for (let i = 0; i < newOrders.length; i += 500) await prisma.regulatoryOrder.createMany({ data: newOrders.slice(i, i + 500), skipDuplicates: true });
    console.log(`[developers] snapshot: ${certs} certificates, ${newOrders.length} orders loaded`);
  }
  await rebuildDevelopers({ log: console.log });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    // A failed track-record rebuild must not block the deploy.
    console.error("[developers] seed failed:", e instanceof Error ? e.message : e);
    await prisma.$disconnect();
  });
