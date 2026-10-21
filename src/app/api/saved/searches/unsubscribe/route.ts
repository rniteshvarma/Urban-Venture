/** GET ?key= — one-click stop for one saved search's email alerts (link in the email). */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { siteUrl } from "@/lib/site";

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key") ?? "";
  const n = key ? (await prisma.savedSearch.updateMany({ where: { unsubscribeKey: key }, data: { alertEmail: false } })).count : 0;
  return NextResponse.redirect(`${siteUrl()}/alerts/unsubscribed${n ? "" : "?missing=1"}`, 303);
}
