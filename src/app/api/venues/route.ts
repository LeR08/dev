import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getVenueIndex } from '@/lib/venues';
import { openState } from '@/lib/hours/core';
import { inBBox } from '@/lib/geo';
import { normalizeName } from '@/lib/text';

export const revalidate = 3600;

const Query = z.object({
  /** `minLng,minLat,maxLng,maxLat` */
  bbox: z.string().optional(),
  open_now: z.enum(['1', 'true']).optional(),
  q: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = Query.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid query', issues: parsed.error.issues }, { status: 400 });
  }
  const { bbox, open_now: openNow, q, limit } = parsed.data;

  let venues = getVenueIndex();

  if (bbox) {
    const parts = bbox.split(',').map(Number);
    if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
      return NextResponse.json({ error: 'bbox must be minLng,minLat,maxLng,maxLat' }, { status: 400 });
    }
    const [minLng, minLat, maxLng, maxLat] = parts;
    venues = venues.filter((venue) => inBBox(venue.lng, venue.lat, { minLng, minLat, maxLng, maxLat }));
  }

  if (q) {
    const needle = normalizeName(q);
    venues = venues.filter(
      (venue) =>
        normalizeName(venue.name).includes(needle) ||
        normalizeName(venue.address).includes(needle) ||
        (venue.neighbourhood ? normalizeName(venue.neighbourhood).includes(needle) : false),
    );
  }

  if (openNow) {
    const now = new Date();
    venues = venues.filter((venue) => openState(venue, now).kind === 'open');
  }

  return NextResponse.json(
    { count: venues.length, venues: venues.slice(0, limit) },
    { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' } },
  );
}
