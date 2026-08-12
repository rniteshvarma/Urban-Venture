import prisma from './prisma';

export interface AppreciationResult {
  purchasePrice: number;
  currentEstimatedValue: number;
  absoluteGain: number;
  appreciationPct: number;
  cagr: number;
  yearsHeld: number;
  priceHistory: { year: number; quarter?: number; price: number; yoyChange: number }[];
  corridorName: string;
  corridorSlug: string;
  calculatedAt: Date;
}

/**
 * Calculates live price appreciation for a property purchase using
 * the corridor's AppreciationHistory data.
 */
export async function calculateAppreciation(purchase: {
  purchasePrice: number;
  purchaseDate: Date;
  pricePerSqYd?: number | null;
  pricePerSqFt?: number | null;
  areaSqYd?: number | null;
  areaSqFt?: number | null;
  project: {
    corridor: string;
    name: string;
  };
}): Promise<AppreciationResult> {
  const corridorSlug = purchase.project.corridor.toLowerCase().replace(/\s+/g, '-');
  
  // Resolve corridor profile
  const corridorProfile = await prisma.corridorProfile.findFirst({
    where: {
      OR: [
        { slug: corridorSlug },
        { shortName: { equals: purchase.project.corridor, mode: 'insensitive' } },
        { name: { contains: purchase.project.corridor, mode: 'insensitive' } },
      ],
    },
  });

  const resolvedSlug = corridorProfile?.slug || corridorSlug;

  // Fetch appreciation history sorted by year
  const history = await prisma.appreciationHistory.findMany({
    where: {
      OR: [
        { corridor: resolvedSlug },
        { corridorProfileSlug: resolvedSlug },
        { corridor: { equals: purchase.project.corridor, mode: 'insensitive' } },
      ],
    },
    orderBy: [{ year: 'asc' }, { quarter: 'asc' }],
  });

  const purchaseYear = purchase.purchaseDate.getFullYear();
  const currentYear = new Date().getFullYear();
  const yearsHeld = Math.max(0.5, (Date.now() - purchase.purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  // Determine whether to use sqYd or sqFt prices
  const useSqYd = !!(purchase.pricePerSqYd || purchase.areaSqYd);

  // Build price history array
  const priceHistory = history.map(h => ({
    year: h.year,
    quarter: h.quarter ?? undefined,
    price: useSqYd ? (h.pricePerSqYd ?? h.pricePerSqFt) : h.pricePerSqFt,
    yoyChange: h.yoyChange,
  }));

  // Find baseline price (closest to purchase year)
  let baselinePrice: number | null = null;
  let currentPrice: number | null = null;

  if (history.length > 0) {
    // Find entry closest to purchase year
    const baselineEntry = history.reduce((closest, entry) => {
      const diff = Math.abs(entry.year - purchaseYear);
      const closestDiff = Math.abs(closest.year - purchaseYear);
      return diff < closestDiff ? entry : closest;
    }, history[0]);

    baselinePrice = useSqYd
      ? (baselineEntry.pricePerSqYd ?? baselineEntry.pricePerSqFt)
      : baselineEntry.pricePerSqFt;

    // Most recent entry is the current price
    const latestEntry = history[history.length - 1];
    currentPrice = useSqYd
      ? (latestEntry.pricePerSqYd ?? latestEntry.pricePerSqFt)
      : latestEntry.pricePerSqFt;
  }

  // Fallback: use CorridorProfile static price fields
  if (!baselinePrice || !currentPrice) {
    if (corridorProfile) {
      const staticPrices: Record<number, number | null> = {
        2020: corridorProfile.price2020SqYd,
        2022: corridorProfile.price2022SqYd,
        2024: corridorProfile.price2024SqYd,
        2026: corridorProfile.price2026SqYd,
      };

      // Find closest year to purchase
      const years = Object.keys(staticPrices).map(Number).filter(y => staticPrices[y] != null);
      if (years.length > 0) {
        const closestYear = years.reduce((a, b) =>
          Math.abs(b - purchaseYear) < Math.abs(a - purchaseYear) ? b : a
        );
        baselinePrice = baselinePrice || staticPrices[closestYear]!;
        
        // Latest year as current
        const latestYear = Math.max(...years);
        currentPrice = currentPrice || staticPrices[latestYear]!;
      }
    }
  }

  // Calculate appreciation
  let appreciationPct = 0;
  let currentEstimatedValue = purchase.purchasePrice;
  let absoluteGain = 0;
  let cagr = 0;

  if (baselinePrice && currentPrice && baselinePrice > 0) {
    appreciationPct = ((currentPrice - baselinePrice) / baselinePrice) * 100;
    currentEstimatedValue = purchase.purchasePrice * (1 + appreciationPct / 100);
    absoluteGain = currentEstimatedValue - purchase.purchasePrice;

    // CAGR calculation
    if (yearsHeld > 0) {
      cagr = (Math.pow(currentPrice / baselinePrice, 1 / yearsHeld) - 1) * 100;
    }
  }

  return {
    purchasePrice: purchase.purchasePrice,
    currentEstimatedValue: Math.round(currentEstimatedValue),
    absoluteGain: Math.round(absoluteGain),
    appreciationPct: Math.round(appreciationPct * 100) / 100,
    cagr: Math.round(cagr * 100) / 100,
    yearsHeld: Math.round(yearsHeld * 10) / 10,
    priceHistory,
    corridorName: corridorProfile?.name || purchase.project.corridor,
    corridorSlug: resolvedSlug,
    calculatedAt: new Date(),
  };
}

/**
 * Batch-calculate appreciation for multiple purchases.
 */
export async function calculateBatchAppreciation(purchases: Parameters<typeof calculateAppreciation>[0][]): Promise<AppreciationResult[]> {
  return Promise.all(purchases.map(p => calculateAppreciation(p)));
}
