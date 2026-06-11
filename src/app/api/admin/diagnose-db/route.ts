import { NextResponse } from "next/server";

export async function GET() {
  const connectionString = 
    process.env.DATABASE_URL || 
    process.env.POSTGRES_PRISMA_URL || 
    process.env.POSTGRES_URL || 
    process.env.POSTGRES_URL_NON_POOLING;

  if (!connectionString) {
    return NextResponse.json({
      success: false,
      error: "No database connection string found in Vercel environment variables!"
    });
  }

  try {
    const maskedUrl = connectionString.replace(/:[^:@]+@/, ':****@');
    const parsedUrl = new URL(connectionString);
    
    return NextResponse.json({
      success: true,
      maskedUrl,
      host: parsedUrl.hostname,
      port: parsedUrl.port,
      database: parsedUrl.pathname.substring(1),
      searchParams: Object.fromEntries(parsedUrl.searchParams.entries())
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: "Failed to parse database connection string",
      details: e.message
    });
  }
}
