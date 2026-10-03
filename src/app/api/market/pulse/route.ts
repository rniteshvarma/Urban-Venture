import { NextResponse } from "next/server";
import { CITY, CITY_LONG_RUN_CAGR } from "@/lib/market/anchors";

// City-level market figures — published numbers with their sources
// (src/lib/market/anchors.ts), never a stored guess.
export async function GET() {
  return NextResponse.json({
    success: true,
    figures: {
      registrations: CITY.registrationsYtd,
      avgPrice: CITY.avgPriceSqFt,
      sales: CITY.salesUnits,
      officeLeasing: CITY.officeLeasingMSqFt,
      rentalYield: CITY.rentalYield,
    },
    longRunCagr: CITY_LONG_RUN_CAGR,
  });
}
