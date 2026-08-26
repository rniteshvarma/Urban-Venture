// Colour modes for the property dots, plus the legend each one renders.
// Bands themselves are computed server-side from the viewport's price
// distribution (see lib/explore/query.ts) so colour stays meaningful whether
// you are looking at Vikarabad or Kokapet.

export type ColorMode = "price" | "grade" | "type";

export interface LegendItem {
  label: string;
  color: string;
}

// Mode A — price band (default, 1 = cheapest … 5 = dearest)
export const PRICE_BAND_COLORS = ["#A3E635", "#FDE047", "#FBBF24", "#F97316", "#DC2626"];

// Mode B — listing score grade
export const GRADE_COLORS: Record<string, string> = {
  A: "#0F9D58",
  B: "#FFB400",
  C: "#E8A33D",
  D: "#9CA3AF",
};

// Mode C — property type
export const TYPE_COLORS: Record<string, string> = {
  RESIDENTIAL_PLOT: "#FFB400",
  AGRICULTURAL_LAND: "#84CC16",
  VILLA: "#8B5CF6",
  COMMERCIAL: "#06B6D4",
  APARTMENT: "#EC4899",
  OTHER: "#9CA3AF",
};

/** MapLibre `circle-color` expression for the given mode. */
export function colorExpression(mode: ColorMode): unknown {
  if (mode === "grade") {
    return [
      "match",
      ["coalesce", ["get", "scoreGrade"], "D"],
      "A", GRADE_COLORS.A,
      "B", GRADE_COLORS.B,
      "C", GRADE_COLORS.C,
      GRADE_COLORS.D,
    ];
  }
  if (mode === "type") {
    return [
      "match",
      ["coalesce", ["get", "propertyType"], "OTHER"],
      "RESIDENTIAL_PLOT", TYPE_COLORS.RESIDENTIAL_PLOT,
      "AGRICULTURAL_LAND", TYPE_COLORS.AGRICULTURAL_LAND,
      "VILLA", TYPE_COLORS.VILLA,
      "COMMERCIAL", TYPE_COLORS.COMMERCIAL,
      "APARTMENT", TYPE_COLORS.APARTMENT,
      TYPE_COLORS.OTHER,
    ];
  }
  // price band 1..5
  return [
    "step",
    ["coalesce", ["get", "priceBand"], 3],
    PRICE_BAND_COLORS[0],
    2, PRICE_BAND_COLORS[1],
    3, PRICE_BAND_COLORS[2],
    4, PRICE_BAND_COLORS[3],
    5, PRICE_BAND_COLORS[4],
  ];
}

const lakh = (n: number) => (n >= 100 ? `₹${(n / 100).toFixed(1)}Cr` : `₹${Math.round(n)}L`);

/**
 * Legend rows for the active mode. For price we label with the real quintile
 * cut points when the viewport had enough listings to compute them; otherwise
 * we say so rather than inventing ranges.
 */
export function legendFor(mode: ColorMode, priceBreaks: number[]): { items: LegendItem[]; note?: string } {
  if (mode === "grade") {
    return {
      items: [
        { label: "A · 80+", color: GRADE_COLORS.A },
        { label: "B · 65–79", color: GRADE_COLORS.B },
        { label: "C · 50–64", color: GRADE_COLORS.C },
        { label: "D · under 50", color: GRADE_COLORS.D },
      ],
      note: "Verified inventory is unscored and shows as D-grey.",
    };
  }
  if (mode === "type") {
    return {
      items: [
        { label: "Plots", color: TYPE_COLORS.RESIDENTIAL_PLOT },
        { label: "Agricultural", color: TYPE_COLORS.AGRICULTURAL_LAND },
        { label: "Villas", color: TYPE_COLORS.VILLA },
        { label: "Commercial", color: TYPE_COLORS.COMMERCIAL },
        { label: "Apartments", color: TYPE_COLORS.APARTMENT },
      ],
    };
  }

  if (priceBreaks.length !== 4) {
    return {
      items: PRICE_BAND_COLORS.map((color, i) => ({ label: i === 0 ? "Lower" : i === 4 ? "Higher" : "", color })),
      note: "Not enough listings in view to band prices yet.",
    };
  }

  const [b1, b2, b3, b4] = priceBreaks;
  return {
    items: [
      { label: `under ${lakh(b1)}`, color: PRICE_BAND_COLORS[0] },
      { label: `${lakh(b1)}–${lakh(b2)}`, color: PRICE_BAND_COLORS[1] },
      { label: `${lakh(b2)}–${lakh(b3)}`, color: PRICE_BAND_COLORS[2] },
      { label: `${lakh(b3)}–${lakh(b4)}`, color: PRICE_BAND_COLORS[3] },
      { label: `over ${lakh(b4)}`, color: PRICE_BAND_COLORS[4] },
    ],
  };
}

export const COLOR_MODE_LABELS: Record<ColorMode, string> = {
  price: "Price",
  grade: "Listing grade",
  type: "Property type",
};
