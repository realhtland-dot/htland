export interface PhoneExtractionResult {
  primaryPhone: string | null;
  phones: string[];
  rawMatches: string[];
}

// Valid Vietnamese mobile & landline prefixes after normalizing to leading 0
const VALID_VN_MOBILE_PREFIXES = [
  '032', '033', '034', '035', '036', '037', '038', '039', // Viettel
  '052', '056', '058', '059', // Vietnamobile / Gmobile
  '070', '076', '077', '078', '079', // MobiFone
  '081', '082', '083', '084', '085', '086', '088', '089', // Vinaphone / Viettel / MobiFone
  '090', '091', '092', '093', '094', '096', '097', '098', '099', // Legacy 09x
];

/**
 * Normalizes a candidate Vietnamese phone string to standard 0xxxxxxxxx format.
 * Returns null if the candidate is ambiguous or invalid.
 */
export function normalizeVietnamesePhone(raw: string): string | null {
  if (!raw) return null;
  // Strip spaces, dots, hyphens, parentheses
  let cleaned = raw.replace(/[\s.\-()]/g, '');

  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('84') && cleaned.length >= 11 && cleaned.length <= 12) {
    cleaned = '0' + cleaned.slice(2);
  }

  // Must be digits only after normalization
  if (!/^\d+$/.test(cleaned)) return null;

  // Vietnamese mobile numbers: 10 digits starting with 03/05/07/08/09
  if (cleaned.length === 10) {
    const prefix3 = cleaned.slice(0, 3);
    if (VALID_VN_MOBILE_PREFIXES.includes(prefix3)) {
      return cleaned;
    }
  }

  // Vietnamese landline numbers: 11 digits starting with 02 (e.g. 02838221234, 02439123456)
  if (cleaned.length === 11 && cleaned.startsWith('02')) {
    return cleaned;
  }

  return null;
}

/**
 * Extracts and normalizes Vietnamese phone numbers from unstructured chat text
 * without hallucinating or guessing ambiguous numeric sequences (e.g., prices, areas).
 */
export function extractVietnamesePhones(text: string): PhoneExtractionResult {
  if (!text || typeof text !== 'string') {
    return { primaryPhone: null, phones: [], rawMatches: [] };
  }

  // Match candidate sequences separated by optional spaces, dots, hyphens
  // Bounded by non-digit boundaries so 1000000000 (1 tỷ) or 150m2 won't match partially
  const candidateRegex = /(?<!\d)(?:\+?84|0)(?:[\s.\-]?\d){8,10}(?!\d)/g;
  const matches = text.match(candidateRegex) || [];

  const seen = new Set<string>();
  const phones: string[] = [];
  const rawMatches: string[] = [];

  for (const match of matches) {
    const normalized = normalizeVietnamesePhone(match);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      phones.push(normalized);
      rawMatches.push(match.trim());
    }
  }

  return {
    primaryPhone: phones.length > 0 ? phones[0] : null,
    phones,
    rawMatches,
  };
}
