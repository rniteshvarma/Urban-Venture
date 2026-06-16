import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Helper function to parse CSV lines safely
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// POST /api/admin/appreciation/import - Bulk import CSV
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { csvText } = await req.json();
    if (!csvText || typeof csvText !== "string") {
      return NextResponse.json({ error: "Invalid CSV text provided" }, { status: 400 });
    }

    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) {
      return NextResponse.json({ error: "CSV is empty or contains only headers" }, { status: 400 });
    }

    // Check header
    const headers = parseCSVLine(lines[0]);
    const isHeaderRow = headers[0].toLowerCase().includes("corridor") || headers[1].toLowerCase().includes("year");
    const startIndex = isHeaderRow ? 1 : 0;

    let importedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const cols = parseCSVLine(line);

      // We expect: corridor, year, quarter, pricePerSqFt, pricePerSqYd, source, notes
      if (cols.length < 4) {
        failedCount++;
        errors.push(`Line ${i + 1}: Insufficient columns (found ${cols.length}, expected at least 4)`);
        continue;
      }

      const corridor = cols[0];
      const year = parseInt(cols[1], 10);
      const quarter = cols[2] ? parseInt(cols[2], 10) : null;
      const pricePerSqFt = parseFloat(cols[3]);
      const pricePerSqYd = cols[4] ? parseFloat(cols[4]) : null;
      const source = cols[5] || "Bulk Import";
      const notes = cols[6] || "";

      if (!corridor || isNaN(year) || isNaN(pricePerSqFt)) {
        failedCount++;
        errors.push(`Line ${i + 1}: Parsing failure (corridor: ${corridor}, year: ${cols[1]}, price: ${cols[3]})`);
        continue;
      }

      try {
        const profile = await prisma.corridorProfile.findFirst({
          where: {
            OR: [
              { slug: { equals: corridor, mode: "insensitive" } },
              { name: { equals: corridor, mode: "insensitive" } },
              { shortName: { equals: corridor, mode: "insensitive" } }
            ]
          }
        });

        const targetCorridor = profile ? profile.slug : corridor.toLowerCase().replace(/\s+/g, "-");

        // Calculate YoY Change
        let yoyChange = 0;
        const prevYearRecord = await prisma.appreciationHistory.findFirst({
          where: {
            corridor: { equals: targetCorridor, mode: "insensitive" },
            year: year - 1,
            quarter: quarter || null
          }
        });

        if (prevYearRecord) {
          yoyChange = parseFloat((((pricePerSqFt - prevYearRecord.pricePerSqFt) / prevYearRecord.pricePerSqFt) * 100).toFixed(2));
        }

        // Calculate QoQ Change
        let qoqChange: number | null = null;
        if (quarter) {
          let prevQ = quarter - 1;
          let prevY = year;
          if (prevQ === 0) {
            prevQ = 4;
            prevY = year - 1;
          }

          const prevQRecord = await prisma.appreciationHistory.findFirst({
            where: {
              corridor: { equals: targetCorridor, mode: "insensitive" },
              year: prevY,
              quarter: prevQ
            }
          });

          if (prevQRecord) {
            qoqChange = parseFloat((((pricePerSqFt - prevQRecord.pricePerSqFt) / prevQRecord.pricePerSqFt) * 100).toFixed(2));
          }
        }

        // Upsert record
        const existing = await prisma.appreciationHistory.findFirst({
          where: {
            corridor: { equals: targetCorridor, mode: "insensitive" },
            year,
            quarter: quarter || null
          }
        });

        if (existing) {
          await prisma.appreciationHistory.update({
            where: { id: existing.id },
            data: {
              corridor: targetCorridor,
              corridorProfileSlug: profile ? profile.slug : null,
              pricePerSqFt,
              pricePerSqYd,
              yoyChange,
              qoqChange,
              source,
              notes
            }
          });
        } else {
          await prisma.appreciationHistory.create({
            data: {
              corridor: targetCorridor,
              corridorProfileSlug: profile ? profile.slug : null,
              year,
              quarter,
              pricePerSqFt,
              pricePerSqYd,
              yoyChange,
              qoqChange,
              source,
              notes
            }
          });
        }

        importedCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`Line ${i + 1}: Database error (${err.message})`);
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      failedCount,
      errors
    });
  } catch (error: any) {
    console.error("Error in POST /api/admin/appreciation/import:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
