import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "EMAIL") {
      const template = await prisma.emailTemplate.update({
        where: { id },
        data: body,
      });
      return NextResponse.json({ success: true, template });
    } else if (type === "WHATSAPP") {
      const template = await prisma.whatsAppTemplate.update({
        where: { id },
        data: body,
      });
      return NextResponse.json({ success: true, template });
    }

    // Auto-detect type
    const isEmail = await prisma.emailTemplate.findUnique({ where: { id } });
    if (isEmail) {
      const template = await prisma.emailTemplate.update({
        where: { id },
        data: body,
      });
      return NextResponse.json({ success: true, template });
    }

    const isWA = await prisma.whatsAppTemplate.findUnique({ where: { id } });
    if (isWA) {
      const template = await prisma.whatsAppTemplate.update({
        where: { id },
        data: body,
      });
      return NextResponse.json({ success: true, template });
    }

    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  } catch (error: any) {
    console.error("Error in PUT /api/admin/broadcasts/templates/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "EMAIL") {
      await prisma.emailTemplate.delete({ where: { id } });
      return NextResponse.json({ success: true });
    } else if (type === "WHATSAPP") {
      await prisma.whatsAppTemplate.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    // Auto-detect type
    const isEmail = await prisma.emailTemplate.findUnique({ where: { id } });
    if (isEmail) {
      await prisma.emailTemplate.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    const isWA = await prisma.whatsAppTemplate.findUnique({ where: { id } });
    if (isWA) {
      await prisma.whatsAppTemplate.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  } catch (error: any) {
    console.error("Error in DELETE /api/admin/broadcasts/templates/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
