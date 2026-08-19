/** Strips diacritics, the "Coffeeshop" prefix and punctuation so two spellings of
 *  the same venue compare equal (§5.6 matching, §F5 search). */
export function normalizeName(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(coffeeshop|coffee\s?shop|cafe|café|the)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'venue';
}

/**
 * Splits "Oudebrugsteeg 27-H" into a comparable street and house number.
 * `base` drops the Dutch house-letter / apartment suffix, which the licence
 * register carries ("27-H") and OSM usually does not ("27") — comparing only
 * the full form would miss those pairs.
 */
export function parseAddress(address: string): {
  street: string;
  number: string | null;
  base: string | null;
} {
  const match = /^(.*?)[\s,]+(\d+[a-zA-Z]?(?:[-\s]?[a-zA-Z0-9]+)?)\s*$/.exec(address.trim());
  if (!match) return { street: normalizeName(address), number: null, base: null };
  const number = match[2].toLowerCase().replace(/[\s-]/g, '');
  return {
    street: normalizeName(match[1]),
    number,
    base: /^\d+/.exec(number)?.[0] ?? null,
  };
}

/** Jaro-Winkler similarity in [0,1]; §5.6 thresholds are expressed against it. */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const matchWindow = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatched = new Array<boolean>(a.length).fill(false);
  const bMatched = new Array<boolean>(b.length).fill(false);
  let matches = 0;

  for (let i = 0; i < a.length; i += 1) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, b.length);
    for (let j = start; j < end; j += 1) {
      if (bMatched[j] || a[i] !== b[j]) continue;
      aMatched[i] = true;
      bMatched[j] = true;
      matches += 1;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (!aMatched[i]) continue;
    while (!bMatched[k]) k += 1;
    if (a[i] !== b[k]) transpositions += 1;
    k += 1;
  }
  transpositions /= 2;

  const jaro =
    (matches / a.length + matches / b.length + (matches - transpositions) / matches) / 3;

  let prefix = 0;
  while (prefix < 4 && prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) {
    prefix += 1;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}
