import snapshotJson from '../../data/venues.json';
import { VenueSnapshot } from '@/lib/types';
import type { Venue } from '@/lib/types';
import { slugify } from '@/lib/text';
import { haversine } from '@/lib/geo';

/**
 * The snapshot is imported, not fetched: venue pages and their hours keep
 * rendering when Supabase is unreachable, which §8 requires. Supabase backs the
 * write path (reviews, reports) only.
 */
const snapshot = VenueSnapshot.parse(snapshotJson);

// A duplicate slug would make two venues share a page. The ETL prevents it; this
// asserts it at build time rather than letting the wrong venue render.
const duplicateSlug = snapshot.venues
  .map((venue) => venue.slug)
  .find((slug, index, all) => all.indexOf(slug) !== index);
if (duplicateSlug) {
  throw new Error(`data/venues.json contains a duplicate slug: ${duplicateSlug}`);
}

export const ATTRIBUTION = snapshot.attribution;
export const GENERATED_AT = snapshot.generated_at;

export function getAllVenues(): Venue[] {
  return snapshot.venues;
}

export function getOpenVenues(): Venue[] {
  return snapshot.venues.filter((venue) => venue.status === 'open');
}

export function getVenue(slug: string): Venue | undefined {
  return snapshot.venues.find((venue) => venue.slug === slug);
}

export interface NeighbourhoodSummary {
  slug: string;
  name: string;
  count: number;
}

export function getNeighbourhoods(): NeighbourhoodSummary[] {
  const counts = new Map<string, number>();
  for (const venue of snapshot.venues) {
    if (venue.status !== 'open' || !venue.neighbourhood) continue;
    counts.set(venue.neighbourhood, (counts.get(venue.neighbourhood) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ slug: slugify(name), name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'nl'));
}

export function getNeighbourhood(slug: string): NeighbourhoodSummary | undefined {
  return getNeighbourhoods().find((entry) => entry.slug === slug);
}

export function getVenuesInNeighbourhood(slug: string): Venue[] {
  return snapshot.venues.filter(
    (venue) => venue.neighbourhood && slugify(venue.neighbourhood) === slug,
  );
}

/** The five closest venues, for the detail page. */
export function getNearbyVenues(venue: Venue, limit = 5): { venue: Venue; distance: number }[] {
  return getOpenVenues()
    .filter((candidate) => candidate.id !== venue.id)
    .map((candidate) => ({ venue: candidate, distance: haversine(venue, candidate) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/** Trimmed payload for the client bundle: the fields the map, list and search need. */
export interface VenueIndexEntry {
  slug: string;
  name: string;
  legal_name: string | null;
  aliases: string[];
  address: string;
  neighbourhood: string | null;
  lat: number;
  lng: number;
  status: Venue['status'];
  /** Only the expanded intervals travel to the browser, never the raw rules. */
  hours_weekly: Venue['hours_weekly'];
  hours_source: Venue['hours_source'];
  hours_updated_at: string | null;
  amenities: Venue['amenities'];
  website: string | null;
  website_live: boolean | null;
  rating_avg: number | null;
  rating_count: number;
}

export function toIndexEntry(venue: Venue): VenueIndexEntry {
  return {
    slug: venue.slug,
    name: venue.name,
    legal_name: venue.legal_name,
    aliases: venue.aliases,
    address: venue.address,
    neighbourhood: venue.neighbourhood,
    lat: venue.lat,
    lng: venue.lng,
    status: venue.status,
    hours_weekly: venue.hours_weekly,
    hours_source: venue.hours_source,
    hours_updated_at: venue.hours_updated_at,
    amenities: venue.amenities,
    website: venue.website,
    website_live: venue.website_live,
    rating_avg: venue.rating_avg,
    rating_count: venue.rating_count,
  };
}

export function getVenueIndex(): VenueIndexEntry[] {
  return snapshot.venues.map(toIndexEntry);
}
