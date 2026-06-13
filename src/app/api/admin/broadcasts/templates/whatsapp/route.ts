import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { WATrigger } from "@prisma/client";

const schema = z.object({
  name: z.string().min(1),
  trigger: z.nativeEnum(WATrigger).default(WATrigger.CUSTOM),
  message: z.string().min(1),
  isActive: z.boolean().default(true),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.whatsAppTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    console.error("Error in GET /api/admin/broadcasts/templates/whatsapp:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parse = schema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Invalid input data", details: parse.error.format() }, { status: 400 });
    }

    const template = await prisma.whatsAppTemplate.create({
      data: parse.data,
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error("Error in POST /api/admin/broadcasts/templates/whatsapp:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
