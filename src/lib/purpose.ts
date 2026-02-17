/**
 * Parse purpose_text from DB into an array of strings.
 * Handles both legacy plain-text and new JSON array format.
 */
export function parsePurposeEntries(purposeText: string | null): string[] {
  if (!purposeText) return [];
  try {
    const parsed = JSON.parse(purposeText);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Legacy plain text — treat as a single entry
    return [purposeText];
  }
  return [purposeText];
}
