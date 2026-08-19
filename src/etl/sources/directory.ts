import { fetchWithRetry } from '@/etl/http';
import { inBBox } from '@/lib/geo';
import type { BBox } from '@/lib/geo';

/**
 * A third-party coffeeshop directory, read as a gap-filling source for facts we
 * cannot get from the city or from OpenStreetMap — chiefly phone numbers and
 * the trading name a venue actually uses, which the licence register does not
 * always carry.
 *
 * Scope is deliberately narrow. We take individual facts, never their written
 * descriptions and never their images: the prose is promotional copy about
 * products, which the brief rules out, and the images carry a provenance we do
 * not want to inherit. Every field taken is stamped with this source and
 * credited in the UI.
 *
 * Legal note for the owner: attribution alone does not settle the Dutch
 * database right (Databankenwet), which protects substantial extraction from a
 * database regardless of credit. Individual facts are not protected, and this
 * takes a small subset of one city, but a lawyer should confirm the call before
 * launch.
 */
export const DIRECTORY_HOST = 'https://coffeeshopfinder.nl';
export const DIRECTORY_ATTRIBUTION = 'Some phone numbers and trading names via coffeeshopfinder.nl';

export interface DirectoryRecord {
  slug: string;
  name: string;
  address: string | null;
  postcode: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  amenities: string[];
  url: string;
}

const USER_AGENT =
  process.env.ETL_USER_AGENT ?? 'the-smoke-trail/0.1 (+https://github.com/LeR08/dev)';

/** Their robots.txt allows /coffeeshops/; only /api/ and /admin/ are disallowed. */
async function assertCrawlable(path: string): Promise<void> {
  const response = await fetchWithRetry(`${DIRECTORY_HOST}/robots.txt`, {
    label: 'directory/robots.txt',
    timeoutMs: 20_000,
  });
  const robots = await response.text();
  const disallowed = [...robots.matchAll(/^\s*Disallow:\s*(\S+)/gim)].map((m) => m[1]);
  const blocked = disallowed.find((rule) => rule !== '/' && path.startsWith(rule));
  if (blocked) throw new Error(`directory: robots.txt disallows ${blocked}`);
  if (disallowed.includes('/')) throw new Error('directory: robots.txt disallows everything');
}

/** Returns the venue-page URLs for one city, from the site's own sitemap. */
export async function listCityPages(city: string): Promise<string[]> {
  await assertCrawlable(`/coffeeshops/${city}/`);

  const response = await fetchWithRetry(`${DIRECTORY_HOST}/sitemap.xml`, {
    label: 'directory/sitemap',
    timeoutMs: 60_000,
  });
  const xml = await response.text();

  const seen = new Set<string>();
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    // Locale-prefixed duplicates all describe the same venue; keep one.
    const slug = new RegExp(
      `^${DIRECTORY_HOST}/(?:[a-z]{2}/)?coffeeshops/${city}/(.+)$`,
    ).exec(match[1])?.[1];
    if (slug) seen.add(slug);
  }
  return [...seen].map((slug) => `${DIRECTORY_HOST}/coffeeshops/${city}/${slug}`);
}

/** Finds the JSON object enclosing `index` by balancing braces outwards. */
function enclosingObject(text: string, index: number): Record<string, unknown> | null {
  let start = index;
  let depth = 0;
  while (start > 0) {
    start -= 1;
    if (text[start] === '}') depth += 1;
    else if (text[start] === '{') {
      if (depth === 0) break;
      depth -= 1;
    }
  }
  let end = start;
  depth = 0;
  while (end < text.length) {
    if (text[end] === '{') depth += 1;
    else if (text[end] === '}') {
      depth -= 1;
      if (depth === 0) break;
    }
    end += 1;
  }
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function fetchDirectoryPage(url: string, bbox: BBox): Promise<DirectoryRecord | null> {
  const slug = url.split('/').pop()!;
  let html: string;
  try {
    const response = await fetchWithRetry(url, {
      label: `directory/${slug}`,
      timeoutMs: 25_000,
      attempts: 2,
      headers: { 'User-Agent': USER_AGENT },
    });
    html = await response.text();
  } catch {
    return null;
  }

  // The page ships its neighbours too, so target the object by its own slug.
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)].map(
    (m) => m[1],
  );
  let payload: string;
  try {
    payload = JSON.parse(`"${chunks.join('')}"`) as string;
  } catch {
    return null;
  }

  const marker = payload.indexOf(`"slug":"${slug}"`);
  if (marker < 0) return null;
  const venue = enclosingObject(payload, marker);
  if (!venue || typeof venue.name !== 'string') return null;

  const lat = typeof venue.lat === 'number' ? venue.lat : null;
  const lng = typeof venue.lng === 'number' ? venue.lng : null;
  if (lat != null && lng != null && !inBBox(lng, lat, bbox)) return null;

  const contact = (venue.contact ?? {}) as Record<string, string>;
  const clean = (value: unknown) => {
    const text = typeof value === 'string' ? value.trim() : '';
    return text === '' ? null : text;
  };

  return {
    slug,
    name: venue.name,
    address: clean(venue.address),
    postcode: clean(venue.postalCode),
    lat,
    lng,
    phone: clean(venue.phone) ?? clean(contact.phone),
    website: clean(venue.website) ?? clean(contact.website),
    amenities: Array.isArray(venue.amenities) ? (venue.amenities as string[]) : [],
    url,
  };
}

/** One request at a time, spaced out: this is somebody else's server. */
export async function fetchDirectory(city: string, bbox: BBox): Promise<DirectoryRecord[]> {
  const urls = await listCityPages(city);
  if (urls.length === 0) throw new Error(`directory: no pages listed for ${city}`);

  const records: DirectoryRecord[] = [];
  for (const url of urls) {
    const record = await fetchDirectoryPage(url, bbox);
    if (record) records.push(record);
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  return records;
}

/** Their amenity keys mapped onto ours; anything unmapped is dropped. */
export const DIRECTORY_AMENITIES: Record<string, string> = {
  wifi: 'wifi',
  terrace: 'terrace',
  wheelchair: 'wheelchair',
  pin_payment: 'card_payment',
  toilet: 'toilet',
  air_conditioning: 'air_conditioning',
  lounge: 'lounge',
  parking: 'parking',
  drinks_snacks: 'drinks_snacks',
};
