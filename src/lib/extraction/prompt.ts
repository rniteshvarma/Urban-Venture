/**
 * Stage 5 extraction prompt builders (Brochure Ingestion + image addendum).
 * The PDF path sends the document natively; the image path prepends the
 * photograph-specific rules and the operator's per-image role hints.
 */

export const EXTRACTION_SYSTEM =
  'You are extracting structured data from an Indian real estate project brochure for entry into a CRM. Accuracy matters more than completeness. Respond with valid JSON only, no markdown.';

const IMAGE_NOTE = `INPUT FORMAT NOTE
These are PHOTOGRAPHS or SCREENSHOTS of real estate marketing material, not a clean digital document. Expect perspective distortion, glare, shadows, uneven lighting, partially cut-off text, low-contrast text over images, pages out of order or duplicated, and some purely visual images (renders, layout plans) with no data.

CRITICAL RULES FOR IMAGE INPUT
- If a number is not clearly legible, return null and set confidence below 0.5. NEVER guess a digit. A wrong price is far worse than a missing one.
- If you can read a figure but are unsure of a specific digit, return null and note it in "concerns".
- Where the same fact appears in more than one image, prefer the clearest and raise confidence.
- If images appear to be from DIFFERENT projects, say so in documentQuality.concerns and set multipleProjectsDetected true; extract only the dominant project.
- For each image, report what it contains in "pageRoles".
- Never exceed confidence 0.85 for any value read from a photograph.
`;

const BODY = `RULES
- Extract ONLY what the document states. Never infer, estimate, or fill gaps. If a value is absent, return null.
- For every field, report the page number and the verbatim text you took it from.
- Give a confidence 0-1 per field. Below 0.6 means "a human must check this".
- Preserve Indian conventions exactly as printed — capture the number, the unit, AND words like "onwards" in priceNote.
- Areas: capture both the number and the printed unit (sq.ft, sq.yd, sq.m, acres, guntha, cents, ankanam). Do NOT convert.
- Prices: capture as printed. Note whether it is a total or a rate per unit area, and whether GST/registration is stated as included.
- If the brochure covers multiple unit types, return one entry per type. Unit/price tables are the most important thing in this document.

Return ONLY this JSON (every scalar field is an object {value, page, snippet, confidence}):
{
  "project": { "name": {}, "developer": {}, "propertyType": {}, "addressLine": {}, "locality": {}, "city": {}, "landmark": {}, "reraNumber": {}, "totalLandAcres": {}, "totalUnits": {}, "towerCount": {}, "floorsPerTower": {}, "openSpacePct": {}, "possessionText": {}, "description": {} },
  "unitTypes": [ { "label": {}, "unitCategory": {}, "bedrooms": {}, "bathrooms": {}, "areaValue": {}, "areaUnit": {}, "carpetArea": {}, "priceValue": {}, "priceUnit": {}, "priceNote": {}, "facing": {}, "availableUnits": {} } ],
  "amenities": {"value": [], "page": null, "confidence": 0},
  "specifications": {"value": {}, "page": null, "confidence": 0},
  "paymentPlan": {"value": [{"milestone": "", "percentage": null, "amount": null}], "confidence": 0},
  "approvals": {"value": [], "confidence": 0},
  "coordinates": {"value": null, "confidence": 0},
  "pageRoles": [{"page": 1, "role": "COVER|OVERVIEW|MASTER_PLAN|FLOOR_PLANS|PRICE_TABLE|AMENITIES|SPECIFICATIONS|LOCATION|PAYMENT_PLAN|LEGAL|CONTACT|OTHER"}],
  "documentQuality": {"isBrochure": true, "legibility": "GOOD|FAIR|POOR", "concerns": [], "illegibleRegions": [{"page": 1, "description": "", "reason": ""}], "multipleProjectsDetected": false}
}
Enums — unitCategory: APARTMENT|PLOT|VILLA|ROWHOUSE|COMMERCIAL|OFFICE|OTHER. areaUnit: SQFT|SQYD|SQM|ACRE|GUNTHA|CENT|ANKANAM. priceUnit: TOTAL_RUPEES|TOTAL_LAKH|TOTAL_CRORE|PER_SQFT|PER_SQYD. propertyType: APARTMENT|PLOT|VILLA|ROWHOUSE|COMMERCIAL|MIXED.
If this document is not a real estate project brochure or listing, set documentQuality.isBrochure to false and return nulls for everything else.`;

export interface PromptOptions {
  sourceFormat: 'PDF' | 'IMAGE_SET' | 'MIXED';
  hints?: { developer?: string; corridor?: string; city?: string };
  declaredRoles?: (string | null)[];
}

export function buildExtractionPrompt(opts: PromptOptions): string {
  const parts: string[] = [];
  if (opts.sourceFormat === 'IMAGE_SET' || opts.sourceFormat === 'MIXED') {
    parts.push(IMAGE_NOTE);
    const roles = opts.declaredRoles?.length
      ? opts.declaredRoles.map((r, i) => `image ${i + 1}: ${r ?? 'unlabelled'}`).join('; ')
      : 'unlabelled';
    parts.push(`The operator has labelled these images as: ${roles}. Treat those labels as strong hints about where to look.`);
  }
  parts.push(BODY);
  const hints = opts.hints;
  if (hints && (hints.developer || hints.corridor || hints.city)) {
    parts.push(
      `Operator hints (low priority, may be wrong): developer=${hints.developer ?? ''}, corridor=${hints.corridor ?? ''}, city=${hints.city ?? ''}.`,
    );
  }
  return parts.join('\n\n');
}
