/** PATCH { alertEmail?, name? } / DELETE — a buyer's own saved search. */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

async function own(id: string) {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.savedSearch.findFirst({ where: { id, userId } });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!(await own(id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const data: { alertEmail?: boolean; name?: string } = {};
  if (typeof body.alertEmail === "boolean") data.alertEmail = body.alertEmail;
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 80);
  const s = await prisma.savedSearch.update({ where: { id }, data });
  return NextResponse.json({ search: { ...s, unsubscribeKey: undefined } });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!(await own(id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.savedSearch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
