import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Street-level photography from Mapillary. Chosen over Google Street View and
 * Google Places for three reasons that all matter here: the API is free and
 * needs no billing account, the imagery is CC BY-SA 4.0 so it may be stored and
 * re-served with attribution, and serving it ourselves means no third-party
 * request from the visitor's browser — which the privacy stance requires.
 *
 * A token is needed and none is assumed: with `MAPILLARY_TOKEN` unset the whole
 * pass is skipped and every venue simply has no photo.
 */
const GRAPH_API = 'https://graph.mapillary.com/images';

export interface MapillaryPhoto {
  source: 'mapillary';
  /** Mapillary image id, so a photo can be traced back to its original. */
  id: string;
  /** Path under /public, served from our own origin. */
  path: string;
  /** Contributor username — CC BY-SA requires naming them. */
  credit: string;
  captured_at: string | null;
  license: string;
}

interface GraphImage {
  id: string;
  captured_at?: number;
  compass_angle?: number;
  computed_compass_angle?: number;
  geometry?: { coordinates: [number, number] };
  computed_geometry?: { coordinates: [number, number] };
  creator?: { username?: string };
  thumb_1024_url?: string;
  /** 'perspective', 'fisheye', 'spherical' or 'equirectangular'. */
  camera_type?: string;
  is_pano?: boolean;
}

/** Ten years. Old enough to still be the same street, young enough to still be the same shop. */
export const MAX_PHOTO_AGE_MS = 10 * 365.25 * 24 * 60 * 60 * 1000;

/** Metres per degree of latitude; longitude is scaled by the parallel. */
const LAT_DEGREE_M = 111_320;

function bboxAround(lat: number, lng: number, metres: number): string {
  const dLat = metres / LAT_DEGREE_M;
  const dLng = metres / (LAT_DEGREE_M * Math.cos((lat * Math.PI) / 180));
  return [lng - dLng, lat - dLat, lng + dLng, lat + dLat].join(',');
}

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Compass bearing from one point to another, 0 = north. */
export function bearing(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(to.lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Smallest angle between two compass bearings, 0-180. */
export function angleBetween(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

const distance = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const dLat = (b.lat - a.lat) * LAT_DEGREE_M;
  const dLng = (b.lng - a.lng) * LAT_DEGREE_M * Math.cos(toRad(a.lat));
  return Math.hypot(dLat, dLng);
};

/**
 * Of the images near a venue, the useful one is not the closest — it is the one
 * whose camera was pointing at the building. A camera 25 m away facing the
 * facade shows the shopfront; one standing on the doorstep facing down the
 * street shows the road.
 */
/**
 * A 360-degree capture is useless here. Its thumbnail is the whole sphere
 * flattened — a warped strip of everything at once, usually with the
 * photographer's handlebars across the bottom — and its compass angle says
 * nothing, since the image already contains every direction. Two thirds of the
 * imagery around these addresses turned out to be panoramic, so filtering them
 * costs coverage and is still the only honest choice: a caption reading
 * "street-level view of X" has to actually show X.
 *
 * Fisheye captures are kept. They are wide and a little bent at the edges, but
 * they point somewhere.
 */
export function isUsableCamera(image: GraphImage): boolean {
  if (image.is_pano === true) return false;
  const type = (image.camera_type ?? '').toLowerCase();
  return type !== 'spherical' && type !== 'equirectangular';
}

export function pickFacingImage(
  images: GraphImage[],
  venue: { lat: number; lng: number },
  maxAngle = 55,
): GraphImage | null {
  const scored = images
    .filter(isUsableCamera)
    .map((image) => {
      const point = image.computed_geometry?.coordinates ?? image.geometry?.coordinates;
      const heading = image.computed_compass_angle ?? image.compass_angle;
      if (!point || heading == null || !image.thumb_1024_url) return null;
      const from = { lat: point[1], lng: point[0] };
      const offBy = angleBetween(heading, bearing(from, venue));
      return { image, offBy, metres: distance(from, venue) };
    })
    .filter((entry): entry is { image: GraphImage; offBy: number; metres: number } => entry != null)
    .filter((entry) => entry.offBy <= maxAngle && entry.metres >= 3)
    // Beyond this, the shopfront in the frame is more likely a former tenant
    // than the venue named beside it.
    .filter(
      (entry) =>
        entry.image.captured_at == null ||
        entry.image.captured_at >= Date.now() - MAX_PHOTO_AGE_MS,
    );

  if (scored.length === 0) return null;

  // Aim and age are both costs, priced in the same currency, so the trade-off
  // between them is stated rather than left to whichever sort key came first.
  // Every 15 degrees off aim costs a band; so does every four years of age.
  // This directory already holds seven addresses whose coffeeshop became a
  // café, so an old photograph of a shopfront is a claim about a business that
  // may well be gone — worth more than a few degrees of framing.
  const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
  const cost = (entry: { offBy: number; image: GraphImage }) => {
    const ageYears = entry.image.captured_at
      ? (Date.now() - entry.image.captured_at) / YEAR_MS
      : 0;
    return Math.floor(entry.offBy / 15) + Math.floor(ageYears / 4);
  };

  scored.sort(
    (a, b) =>
      cost(a) - cost(b) ||
      a.offBy - b.offBy ||
      (b.image.captured_at ?? 0) - (a.image.captured_at ?? 0) ||
      a.metres - b.metres,
  );
  return scored[0].image;
}

export async function fetchVenuePhoto(
  venue: { slug: string; lat: number; lng: number },
  token: string,
  publicDir: string,
  radiusMetres = 35,
): Promise<MapillaryPhoto | null> {
  const params = new URLSearchParams({
    fields:
      'id,captured_at,compass_angle,computed_compass_angle,geometry,computed_geometry,creator,thumb_1024_url,camera_type,is_pano',
    bbox: bboxAround(venue.lat, venue.lng, radiusMetres),
    limit: '50',
  });

  let images: GraphImage[];
  try {
    const response = await fetch(`${GRAPH_API}?${params}`, {
      headers: { Authorization: `OAuth ${token}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: GraphImage[] };
    images = payload.data ?? [];
  } catch {
    return null;
  }

  const chosen = pickFacingImage(images, venue);
  if (!chosen?.thumb_1024_url) return null;

  // Stored on our own origin: CC BY-SA allows it, and it spares the visitor a
  // request to a third party.
  const relative = `/photos/${chosen.id}.jpg`;
  try {
    const image = await fetch(chosen.thumb_1024_url, { signal: AbortSignal.timeout(30_000) });
    if (!image.ok) return null;
    const bytes = Buffer.from(await image.arrayBuffer());
    await mkdir(path.join(publicDir, 'photos'), { recursive: true });
    await writeFile(path.join(publicDir, relative), bytes);
  } catch {
    return null;
  }

  return {
    source: 'mapillary',
    id: chosen.id,
    path: relative,
    credit: chosen.creator?.username ?? 'a Mapillary contributor',
    captured_at: chosen.captured_at ? new Date(chosen.captured_at).toISOString() : null,
    license: 'CC BY-SA 4.0',
  };
}

export const MAPILLARY_ATTRIBUTION = 'Street-level photos © Mapillary contributors (CC BY-SA 4.0)';
