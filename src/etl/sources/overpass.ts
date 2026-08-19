import { fetchWithRetry } from '@/etl/http';
import { inBBox } from '@/lib/geo';
import type { BBox } from '@/lib/geo';

/**
 * The main instance answers 503 whenever it is busy, which is often. The
 * mirrors run the same API and the same data; we try them in order rather than
 * hammering the first one (§5.2 — one call per nightly run, be a good citizen).
 */
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

export interface OsmRecord {
  osmId: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  postcode: string | null;
  website: string | null;
  phone: string | null;
  openingHours: string | null;
  tags: Record<string, string>;
}

/**
 * Overpass is a shared volunteer-run service: this runs once per nightly ETL,
 * never from the browser, and identifies itself (§5.2).
 */
export async function fetchOsmVenues(areaName: string, bbox: BBox): Promise<OsmRecord[]> {
  const query = `[out:json][timeout:90];
area["name"="${areaName}"]["admin_level"="8"]->.a;
(
  nwr(area.a)["shop"="cannabis"];
  nwr(area.a)["amenity"="cafe"]["cannabis"];
);
out center tags;`;

  let response: Response | null = null;
  let lastError: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      response = await fetchWithRetry(endpoint, {
        method: 'POST',
        body: new URLSearchParams({ data: query }).toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        label: `overpass ${new URL(endpoint).host}`,
        timeoutMs: 120_000,
        attempts: 2,
      });
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!response) throw new Error(`overpass: every mirror failed: ${String(lastError)}`);

  const payload = (await response.json()) as { elements?: OverpassElement[] };
  const elements = payload.elements ?? [];
  const records: OsmRecord[] = [];

  for (const element of elements) {
    const tags = element.tags ?? {};
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    const name = (tags.name ?? '').trim();
    if (lat == null || lng == null || name === '') continue;
    if (!inBBox(lng, lat, bbox)) continue;

    records.push({
      osmId: `${element.type}/${element.id}`,
      name,
      lat,
      lng,
      address: buildAddress(tags),
      postcode: tags['addr:postcode'] ?? null,
      website: tags.website ?? tags['contact:website'] ?? null,
      phone: tags.phone ?? tags['contact:phone'] ?? null,
      openingHours: tags.opening_hours ?? null,
      tags,
    });
  }
  return records;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function buildAddress(tags: Record<string, string>): string | null {
  const street = tags['addr:street'];
  const number = tags['addr:housenumber'];
  if (!street) return null;
  return number ? `${street} ${number}` : street;
}

/** Amenity flags worth showing as chips; anything absent stays absent, not false. */
export function amenitiesFromTags(tags: Record<string, string>) {
  const amenities: Record<string, boolean | string> = {};
  if (tags.outdoor_seating) amenities.terrace = tags.outdoor_seating === 'yes';
  if (tags.wheelchair) amenities.wheelchair = tags.wheelchair === 'yes';
  if (tags.internet_access) amenities.wifi = tags.internet_access !== 'no';
  if (tags.smoking) amenities.smoking = tags.smoking;
  return amenities;
}
