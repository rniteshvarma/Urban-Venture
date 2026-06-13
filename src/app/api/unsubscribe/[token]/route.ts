import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return new NextResponse("Invalid request token", { status: 400 });
    }

    let leadId: string;
    try {
      leadId = Buffer.from(token, "base64").toString("utf-8");
    } catch (err) {
      return new NextResponse("Invalid token format", { status: 400 });
    }

    // Check and update Lead model
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return new NextResponse("Recipient not found in our directory", { status: 404 });
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: { emailOptOut: true },
    });

    const portalUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribed Successfully | Urban Ventures</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'DM Sans', sans-serif;
            background-color: #F8FAFC;
            color: #0F172A;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
          }
          .card {
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.03);
            border-radius: 8px;
            padding: 40px;
            max-width: 450px;
            width: 100%;
            text-align: center;
          }
          .icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
          h1 {
            font-size: 22px;
            font-weight: 700;
            margin: 0 0 10px 0;
            color: #2563EB;
          }
          p {
            font-size: 14px;
            color: #475569;
            line-height: 1.6;
            margin: 0 0 24px 0;
          }
          .btn {
            display: inline-block;
            background: #2563EB;
            color: #FFFFFF;
            text-decoration: none;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 12px 24px;
            border-radius: 4px;
            transition: background 0.2s;
          }
          .btn:hover {
            background: #1D4ED8;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">🔕</div>
          <h1>Unsubscribed Successfully</h1>
          <p>You have been successfully removed from our marketing email lists. You will no longer receive investment broadcasts from Urban Ventures.</p>
          <a href="${portalUrl}" class="btn">Go to Portal</a>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err: any) {
    console.error("Unsubscribe error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
