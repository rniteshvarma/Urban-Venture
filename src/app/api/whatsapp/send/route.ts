import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { fireWhatsAppTrigger } from "@/lib/whatsapp/trigger-handler";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leadId, templateId, message } = await req.json();

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    if (templateId) {
      const template = await prisma.whatsAppTemplate.findUnique({
        where: { id: templateId }
      });
      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }
      
      const result = await fireWhatsAppTrigger(leadId, template.trigger);
      if (result.success) {
        return NextResponse.json({ success: true, logId: result.logId });
      } else {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
    } else if (message) {
      const result = await fireWhatsAppTrigger(leadId, "CUSTOM", message);
      if (result.success) {
        return NextResponse.json({ success: true, logId: result.logId });
      } else {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: "Either templateId or message must be provided" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error in POST /api/whatsapp/send:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
