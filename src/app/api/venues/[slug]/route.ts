import { NextResponse } from 'next/server';
import { getVenue } from '@/lib/venues';
import { openState, resolveHours, weeklyTable } from '@/lib/hours/core';

export const revalidate = 3600;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const venue = getVenue(slug);
  if (!venue) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const resolved = resolveHours(venue);
  return NextResponse.json(
    {
      venue,
      hours: {
        source: resolved.source,
        /** True when the value is a licence bound rather than trading hours. */
        is_licence_bound: resolved.qualified,
        weekly: weeklyTable(venue),
        state: openState(venue),
      },
      // Reviews land in M5; the shape is present so clients can code against it.
      reviews: [],
    },
    { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' } },
  );
}
