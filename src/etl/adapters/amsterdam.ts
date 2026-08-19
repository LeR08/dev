import { AMSTERDAM_BBOX, inBBox } from '@/lib/geo';
import { expandLicenceHours } from '@/lib/hours/parse';
import { parseEwkt, toWgs84 } from '@/lib/rd';
import { fetchWithRetry } from '@/etl/http';
import type { CityAdapter, LicenceRecord, NeighbourhoodPolygon } from '@/etl/adapters/types';

const WFS_BASE = 'https://api.data.amsterdam.nl/v1/wfs';

function wfsUrl(dataset: string, typeName: string, count = 5000): string {
  const params = new URLSearchParams({
    SERVICE: 'WFS',
    VERSION: '2.0.0',
    REQUEST: 'GetFeature',
    TYPENAMES: typeName,
    OUTPUTFORMAT: 'geojson',
    SRSNAME: 'urn:ogc:def:crs:EPSG::4326',
    COUNT: String(count),
  });
  return `${WFS_BASE}/${dataset}/?${params.toString()}`;
}

/**
 * How long after its end date a granted licence is still treated as live.
 *
 * The register is a renewal calendar, not a closure log: 152 of 158 coffeeshop
 * licences end on the first of a month, no licence in the dataset has been
 * expired for more than four months, and every recently-expired row still reads
 * `status_vergunning = "Verleend"`. Renewals are simply published late. Cutting
 * on the end date alone therefore deletes operating venues — The Bulldog on
 * Leidseplein among them — so a granted licence stays live through this window
 * and is flagged in the UI rather than dropped.
 */
export const RENEWAL_GRACE_DAYS = 180;

const DAY_MS = 86_400_000;

/**
 * Filed under either column: some coffeeshops carry
 * `zaak_categorie = "Onbekend"` with `zaak_specificatie = "Coffeeshop"`
 * (420CAFE, Oudebrugsteeg 27-H is the canonical example), so filtering on the
 * category alone silently drops real venues (§5.1).
 */
export function isCoffeeshop(properties: Record<string, unknown>, today = new Date()): boolean {
  const category = String(properties.zaak_categorie ?? '').toLowerCase();
  const specification = String(properties.zaak_specificatie ?? '').toLowerCase();
  if (category !== 'coffeeshop' && specification !== 'coffeeshop') return false;

  if (String(properties.status_vergunning ?? '').toLowerCase() !== 'verleend') return false;

  return daysExpired(properties.einddatum, today) <= RENEWAL_GRACE_DAYS;
}

/** Days since the licence's end date; 0 while it is still current. */
export function daysExpired(endDate: unknown, today = new Date()): number {
  if (typeof endDate !== 'string' || endDate.trim() === '') return 0;
  const parsed = new Date(endDate);
  if (Number.isNaN(parsed.getTime())) return 0;
  const elapsed = startOfDay(today).getTime() - parsed.getTime();
  return elapsed <= 0 ? 0 : Math.floor(elapsed / DAY_MS);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Pulls coordinates out of whichever shape the service returned them in. */
export function coordinatesOf(feature: {
  geometry?: { type?: string; coordinates?: unknown } | null;
  properties?: Record<string, unknown>;
}): { lat: number; lng: number } | null {
  const geometry = feature.geometry;
  if (geometry?.type === 'Point' && Array.isArray(geometry.coordinates)) {
    const [x, y] = geometry.coordinates as [number, number];
    const converted = toWgs84(x, y);
    if (converted) return { lat: converted.lat, lng: converted.lng };
  }
  const locatie = feature.properties?.locatie;
  if (typeof locatie === 'string') {
    const parsed = parseEwkt(locatie);
    if (parsed && inBBox(parsed.lng, parsed.lat)) return { lat: parsed.lat, lng: parsed.lng };
  }
  return null;
}

export function toLicenceRecord(feature: {
  geometry?: { type?: string; coordinates?: unknown } | null;
  properties?: Record<string, unknown>;
}): LicenceRecord | null {
  const properties = feature.properties ?? {};
  const coordinates = coordinatesOf(feature);
  const name = String(properties.zaaknaam ?? '').trim();
  const address = String(properties.adres ?? '').trim();
  if (!coordinates || name === '' || address === '') return null;

  const terraceStart = properties.o_tijden_terras_zo_do_van ?? properties.o_tijden_terras_vr_za_van;

  return {
    sourceId: String(properties.id ?? properties.zaaknummer ?? `${name}|${address}`),
    name,
    legalName: name,
    address,
    postcode: normalizePostcode(properties.postcode),
    lat: coordinates.lat,
    lng: coordinates.lng,
    licenceNumber: properties.zaaknummer != null ? String(properties.zaaknummer) : null,
    licenceValidTo: typeof properties.einddatum === 'string' ? properties.einddatum : null,
    // Past its end date but still granted: the city has not published the
    // renewal yet. Shown with a caveat, never silently dropped.
    licenceRenewalPending: daysExpired(properties.einddatum) > 0,
    hoursLicensed: expandLicenceHours({
      sunThuFrom: properties.openingstijden_zo_do_van,
      sunThuTo: properties.openingstijden_zo_do_tot,
      friSatFrom: properties.openingstijden_vr_za_van,
      friSatTo: properties.openingstijden_vr_za_tot,
    }),
    hasTerrace:
      properties.terrasgeometrie != null ||
      (typeof terraceStart === 'string' && terraceStart.trim() !== ''),
  };
}

function normalizePostcode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const compact = value.replace(/\s+/g, '').toUpperCase();
  return /^\d{4}[A-Z]{2}$/.test(compact) ? `${compact.slice(0, 4)} ${compact.slice(4)}` : null;
}

export const amsterdamAdapter: CityAdapter = {
  city: 'amsterdam',
  displayName: 'Amsterdam',
  bbox: AMSTERDAM_BBOX,
  attribution: ['Contains data from Gemeente Amsterdam (CC BY 4.0)'],

  async fetchLicences(): Promise<LicenceRecord[]> {
    const response = await fetchWithRetry(wfsUrl('horeca', 'exploitatievergunning'), {
      label: 'amsterdam/exploitatievergunning',
      timeoutMs: 90_000,
    });
    const payload = (await response.json()) as { features?: unknown[] };
    const features = Array.isArray(payload.features) ? payload.features : [];
    if (features.length === 0) throw new Error('amsterdam/exploitatievergunning: empty feature collection');

    const records: LicenceRecord[] = [];
    const seen = new Set<string>();
    for (const feature of features as Parameters<typeof toLicenceRecord>[0][]) {
      if (!isCoffeeshop(feature.properties ?? {})) continue;
      const record = toLicenceRecord(feature);
      if (!record || seen.has(record.sourceId)) continue;
      seen.add(record.sourceId);
      records.push(record);
    }
    return records;
  },

  async fetchNeighbourhoods(): Promise<NeighbourhoodPolygon[]> {
    const response = await fetchWithRetry(wfsUrl('gebieden', 'wijken'), {
      label: 'amsterdam/wijken',
      timeoutMs: 90_000,
    });
    const payload = (await response.json()) as {
      features?: { properties?: Record<string, unknown>; geometry?: { type: string; coordinates: unknown } }[];
    };
    const polygons: NeighbourhoodPolygon[] = [];
    for (const feature of payload.features ?? []) {
      const name = String(feature.properties?.naam ?? '').trim();
      const geometry = feature.geometry;
      if (name === '' || !geometry) continue;
      // Only currently valid areas; superseded ones carry an end date.
      if (typeof feature.properties?.eind_geldigheid === 'string' && feature.properties.eind_geldigheid.trim() !== '') {
        continue;
      }
      const rings = outerRings(geometry);
      if (rings.length > 0) polygons.push({ name, rings });
    }
    return polygons;
  },
};

function outerRings(geometry: { type: string; coordinates: unknown }): [number, number][][] {
  if (geometry.type === 'Polygon') {
    const [outer] = geometry.coordinates as [number, number][][];
    return outer ? [outer] : [];
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as [number, number][][][])
      .map((polygon) => polygon[0])
      .filter(Boolean);
  }
  return [];
}
