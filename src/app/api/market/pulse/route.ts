import { NextResponse } from "next/server";
import { CITY_LONG_RUN_CAGR } from "@/lib/market/anchors";
import { resolveCityFigures } from "@/lib/market/observations";

export const dynamic = "force-dynamic";

// City-level market figures — published numbers with their sources:
// the checked constants in anchors.ts, or newer figures an admin approved.
export async function GET() {
  const city = await resolveCityFigures();
  return NextResponse.json({
    success: true,
    figures: {
      registrations: city.registrationsYtd,
      registrationsValue: city.registrationsValueCr,
      avgPrice: city.avgPriceSqFt,
      priceGrowth: city.priceGrowthYoY,
      sales: city.salesUnits,
      officeLeasing: city.officeLeasingMSqFt,
      gccShare: city.gccShareOfLeasing,
      rentalYield: city.rentalYield,
    },
    longRunCagr: CITY_LONG_RUN_CAGR,
  });
}
