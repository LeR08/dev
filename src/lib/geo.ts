/** Amsterdam bounding box used to sanity-check every incoming coordinate (§5.1). */
export const AMSTERDAM_BBOX = { minLng: 4.72, minLat: 52.28, maxLng: 5.07, maxLat: 52.43 };

export type BBox = typeof AMSTERDAM_BBOX;

export function inBBox(lng: number, lat: number, bbox: BBox = AMSTERDAM_BBOX): boolean {
  return lng >= bbox.minLng && lng <= bbox.maxLng && lat >= bbox.minLat && lat <= bbox.maxLat;
}

const EARTH_RADIUS_M = 6_371_008.8;

/** Great-circle distance in metres. Runs in the browser so coordinates stay on-device (L6). */
export function haversine(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres / 10) * 10} m`;
  return `${(metres / 1000).toFixed(metres < 10_000 ? 1 : 0)} km`;
}
