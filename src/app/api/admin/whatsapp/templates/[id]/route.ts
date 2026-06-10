import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { WATrigger } from "@prisma/client";

const templateUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  trigger: z.nativeEnum(WATrigger).optional(),
  message: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parse = templateUpdateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Invalid input data", details: parse.error.format() }, { status: 400 });
    }

    const template = await prisma.whatsAppTemplate.update({
      where: { id },
      data: parse.data,
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error(`Error in PUT /api/admin/whatsapp/templates/${id}:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.whatsAppTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Template deleted successfully" });
  } catch (error: any) {
    console.error(`Error in DELETE /api/admin/whatsapp/templates/${id}:`, error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
