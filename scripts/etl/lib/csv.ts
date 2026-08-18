/**
 * Minimal RFC 4180 CSV parser + header mapping helpers for the LGD ETL.
 * No dependency — LGD exports are small (tens of thousands of rows) and we
 * read them whole. Handles quoted fields, escaped quotes ("") and quoted
 * newlines/commas.
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  // Strip a BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      field = '';
      row = [];
    } else if (c === '\r') {
      // swallow — handled by the \n branch (CRLF) or ignored (lone CR)
    } else {
      field += c;
    }
  }
  // Flush the trailing field/row if the file didn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export interface CsvTable {
  header: string[];
  rows: Record<string, string>[];
}

/** Parse CSV into header + array of objects keyed by (trimmed) header name. */
export function parseCsvTable(text: string): CsvTable {
  const raw = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ''));
  if (raw.length === 0) return { header: [], rows: [] };
  const header = raw[0].map((h) => h.trim());
  const rows = raw.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h] = (cells[i] ?? '').trim();
    });
    return obj;
  });
  return { header, rows };
}

const normHeader = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Find the first header whose normalised form contains ALL `tokens` and NONE of
 * `exclude` (case/space/punctuation-insensitive). `exclude` disambiguates
 * columns that share a prefix — e.g. tokens ['district','code'] exclude ['sub']
 * picks "District Code" over "Sub-District Code". Returns null when nothing matches.
 */
export function findColumnOptional(
  header: string[],
  tokens: string[],
  exclude: string[] = [],
): string | null {
  const wanted = tokens.map(normHeader);
  const banned = exclude.map(normHeader);
  return (
    header.find((h) => {
      const hn = normHeader(h);
      return wanted.every((t) => hn.includes(t)) && banned.every((b) => !hn.includes(b));
    }) ?? null
  );
}

/**
 * Like findColumnOptional but throws with the available headers if nothing
 * matches — LGD column names drift between exports, so failing loud beats
 * silently loading nulls.
 */
export function findColumn(
  header: string[],
  tokens: string[],
  label: string,
  exclude: string[] = [],
): string {
  const hit = findColumnOptional(header, tokens, exclude);
  if (!hit) {
    throw new Error(
      `LGD CSV: could not find a "${label}" column matching [${tokens.join(', ')}]` +
        (exclude.length ? ` excluding [${exclude.join(', ')}]` : '') +
        `. Available headers: ${header.join(' | ')}`,
    );
  }
  return hit;
}
