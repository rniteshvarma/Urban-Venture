import Anthropic from "@anthropic-ai/sdk";

export interface AILeadIntelligence {
  budget: number | null; // in Lakhs
  horizon: number | null; // in years
  city: string;
  corridorInterest: string | null;
  propertyType: string | null;
  propertyName: string | null;
  intentLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number; // 0 - 100
  language?: string;
}

function fallbackHeuristicExtractor(message: string): AILeadIntelligence {
  const text = message.toLowerCase();
  
  // Extract budget in Lakhs or Crores
  let budget: number | null = null;
  const croreMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)/i);
  const lakhMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|l|lac|lacs)/i);
  const rawNumMatch = text.match(/(?:budget|price|under|around|below|rs|inr|\u20B9)\s*:?\s*(\d{2,4})/i);

  if (croreMatch) {
    budget = parseFloat(croreMatch[1]) * 100;
  } else if (lakhMatch) {
    budget = parseFloat(lakhMatch[1]);
  } else if (rawNumMatch) {
    const val = parseFloat(rawNumMatch[1]);
    if (val >= 10 && val <= 500) {
      budget = val;
    }
  }

  // Extract horizon in years
  let horizon: number | null = null;
  const yearMatch = text.match(/(\d+)\s*(?:yr|yrs|year|years)/i);
  if (yearMatch) {
    horizon = parseInt(yearMatch[1], 10);
  } else if (text.includes("immediate") || text.includes("ready") || text.includes("urgent") || text.includes("now")) {
    horizon = 1;
  } else if (text.includes("long term") || text.includes("future")) {
    horizon = 5;
  }

  // Extract property type
  let propertyType: string | null = null;
  if (text.includes("flat") || text.includes("apartment") || text.includes("bhk")) {
    propertyType = "Flat";
  } else if (text.includes("plot") || text.includes("land")) {
    propertyType = "Plot";
  } else if (text.includes("villa") || text.includes("duplex")) {
    propertyType = "Villa";
  } else if (text.includes("commercial") || text.includes("shop") || text.includes("office")) {
    propertyType = "Commercial";
  }

  // Extract Corridor / Location
  let corridorInterest: string | null = null;
  const corridors = ["Shadnagar", "Pharma City", "Sangareddy", "Kokapet", "Shamshabad", "Yadadri", "Kompally", "Adibatla", "Gachibowli", "Hitec City"];
  for (const corr of corridors) {
    if (text.includes(corr.toLowerCase())) {
      corridorInterest = corr;
      break;
    }
  }

  // Intent level
  let intentLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  let confidence = 50;

  if (text.includes("ready to buy") || text.includes("site visit") || text.includes("call me") || text.includes("contact number") || text.includes("urgent")) {
    intentLevel = 'HIGH';
    confidence = 85;
  } else if (text.includes("details") || text.includes("brochure") || text.includes("price list") || text.includes("looking for")) {
    intentLevel = 'MEDIUM';
    confidence = 65;
  } else if (text.length < 15) {
    intentLevel = 'LOW';
    confidence = 25;
  }

  if (budget || corridorInterest || propertyType) {
    confidence = Math.min(95, confidence + 20);
  }

  return {
    budget,
    horizon,
    city: "Hyderabad",
    corridorInterest,
    propertyType,
    propertyName: corridorInterest ? `${corridorInterest} Project` : null,
    intentLevel,
    confidence
  };
}

export async function extractLeadIntelligence(message?: string | null): Promise<AILeadIntelligence> {
  if (!message || !message.trim()) {
    return {
      budget: null,
      horizon: null,
      city: "Hyderabad",
      corridorInterest: null,
      propertyType: null,
      propertyName: null,
      intentLevel: 'LOW',
      confidence: 10
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("mock") || apiKey.trim() === "") {
    return fallbackHeuristicExtractor(message);
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const extractionPrompt = `
You are a real estate lead data extractor for Hyderabad/Telangana market. Extract structured information from this property enquiry message.

Message: "${message}"

Return ONLY valid JSON matching this structure:
{
  "budget": <number in Lakhs or null>, // e.g. "50 lakhs" -> 50, "1 crore" -> 100
  "horizon": <number of years or null>, // e.g. "3-5 years" -> 4, "immediate" -> 1
  "city": "<city name or Hyderabad>",
  "corridorInterest": "<corridor/area mentioned or null>",
  "propertyType": "<Flat/Plot/Villa/Commercial or null>",
  "propertyName": "<specific project name mentioned or null>",
  "intentLevel": "<HIGH/MEDIUM/LOW>", // HIGH = ready to buy/visit, MEDIUM = comparing/asking details, LOW = just enquiring
  "confidence": <0-100>,
  "language": "<English/Hindi/Telugu/Other>"
}
`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 450,
      messages: [{ role: "user", content: extractionPrompt }]
    });

    const textResponse = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        budget: typeof parsed.budget === 'number' ? parsed.budget : null,
        horizon: typeof parsed.horizon === 'number' ? parsed.horizon : null,
        city: parsed.city || "Hyderabad",
        corridorInterest: parsed.corridorInterest || null,
        propertyType: parsed.propertyType || null,
        propertyName: parsed.propertyName || null,
        intentLevel: ['HIGH', 'MEDIUM', 'LOW'].includes(parsed.intentLevel) ? parsed.intentLevel : 'MEDIUM',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 70,
        language: parsed.language || 'English'
      };
    }
  } catch (err) {
    console.warn("AI intelligence extraction call failed, falling back to heuristics:", err);
  }

  return fallbackHeuristicExtractor(message);
}
