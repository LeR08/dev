import { randomUUID } from 'node:crypto';
import { slugify } from '@/lib/text';
import type { CityAdapter, LicenceRecord, NeighbourhoodPolygon } from '@/etl/adapters/types';
import type { Match } from '@/etl/match';
import { amenitiesFromTags } from '@/etl/sources/overpass';
import type { OsmRecord } from '@/etl/sources/overpass';
import { neighbourhoodOf } from '@/etl/geometry';
import type { Overrides } from '@/etl/snapshot';
import type { Venue, WeeklyHours } from '@/lib/types';
import { expandOsmHours, weekStartFor } from '@/etl/hours-osm';

export interface BuildInput {
  adapter: CityAdapter;
  licences: LicenceRecord[];
  matches: Match[];
  neighbourhoods: NeighbourhoodPolygon[];
  previous: Venue[];
  overrides: Overrides;
  now: Date;
  /**
   * False when the Overpass fetch failed outright. A transient outage at a
   * volunteer-run service must not wipe websites, phone numbers and real
   * opening hours off every venue, so in that case the previous run's
   * enrichment is carried forward untouched (§8, "keep last good data").
   */
  osmAvailable: boolean;
}

/**
 * Field precedence from §5.6: the licence register owns status, official name
 * and address; OSM owns contact details, amenities and real opening hours;
 * anything an admin has overridden owns itself.
 */
export function buildVenues(input: BuildInput): Venue[] {
  const { adapter, licences, matches, neighbourhoods, previous, overrides, now, osmAvailable } = input;
  const osmByLicence = new Map<string, OsmRecord>(
    matches.map((match) => [match.licence.sourceId, match.osm]),
  );
  const previousByAmsterdamId = new Map(previous.map((venue) => [venue.amsterdam_id ?? '', venue]));
  const timestamp = now.toISOString();

  // Seed the taken set with the slugs of venues that are about to be carried
  // forward as closed. A new venue must never inherit the URL of one that shut,
  // or the closed venue's page would silently become someone else's.
  const currentIds = new Set(licences.map((licence) => licence.sourceId));
  const slugs = new Set<string>(
    previous.filter((venue) => !currentIds.has(venue.amsterdam_id ?? '')).map((venue) => venue.slug),
  );

  const venues = licences.map((licence) => {
    const osm = osmByLicence.get(licence.sourceId);
    const existing = previousByAmsterdamId.get(licence.sourceId);
    const neighbourhood = neighbourhoodOf(licence.lng, licence.lat, neighbourhoods);

    // Whatever OSM contributes, from this run or carried over from the last one.
    const enrichment = osm
      ? {
          name: displayName(licence.name, osm.name),
          website: osm.website,
          phone: osm.phone,
          osmId: osm.osmId,
          amenities: amenitiesFromTags(osm.tags),
          hoursActual: osm.openingHours,
          // OSM hours are the actual trading hours; the licence bound is the
          // fallback and is always labelled as such in the UI (§11). Expanding
          // here keeps the OSM-syntax evaluator out of the page bundle.
          hoursWeekly: osm.openingHours
            ? expandOsmHours(osm.openingHours, licence.lat, licence.lng, weekStartFor(now))
            : null,
        }
      : !osmAvailable && existing?.osm_id
        ? {
            name: existing.name,
            website: existing.website,
            phone: existing.phone,
            osmId: existing.osm_id,
            amenities: existing.amenities,
            hoursActual: existing.hours_actual,
            hoursWeekly: existing.hours_source === 'osm' ? existing.hours_weekly : null,
          }
        : null;

    const amenities = {
      ...(licence.hasTerrace ? { terrace: true } : {}),
      ...(enrichment?.amenities ?? {}),
    };

    const hoursSource: Venue['hours_source'] = enrichment?.hoursWeekly
      ? 'osm'
      : licence.hoursLicensed
        ? 'licence'
        : null;
    const hoursWeekly: WeeklyHours | null = enrichment?.hoursWeekly ?? licence.hoursLicensed;

    const venue: Venue = {
      id: existing?.id ?? randomUUID(),
      slug: uniqueSlug(existing?.slug ?? slugify(licence.name), slugs, neighbourhood),
      city: adapter.city,
      name: enrichment?.name ?? displayName(licence.name),
      legal_name: licence.legalName,
      address: licence.address,
      postcode: licence.postcode,
      neighbourhood,
      lat: licence.lat,
      lng: licence.lng,
      status: 'open',
      renamed_to: existing?.renamed_to ?? null,
      licence_number: licence.licenceNumber,
      licence_valid_to: licence.licenceValidTo,
      licence_renewal_pending: licence.licenceRenewalPending,
      website: enrichment?.website ?? null,
      phone: enrichment?.phone ?? null,
      amenities,
      hours_licensed: licence.hoursLicensed,
      hours_actual: enrichment?.hoursActual ?? null,
      hours_weekly: hoursWeekly,
      hours_source: hoursSource,
      hours_updated_at: hoursSource ? timestamp : null,
      // Carried from the previous run; the socials pass below refreshes them.
      socials: existing?.socials ?? {},
      socials_shared: existing?.socials_shared ?? [],
      website_live: existing?.website_live ?? null,
      osm_id: enrichment?.osmId ?? null,
      amsterdam_id: licence.sourceId,
      rating_avg: existing?.rating_avg ?? null,
      rating_count: existing?.rating_count ?? 0,
      sources: {
        name: enrichment && enrichment.name !== displayName(licence.name) ? 'osm' : 'amsterdam',
        address: 'amsterdam',
        status: 'amsterdam',
        ...(enrichment ? { website: 'osm', phone: 'osm', amenities: 'osm' } : {}),
        ...(hoursSource ? { hours: hoursSource === 'osm' ? 'osm' : 'amsterdam' } : {}),
      },
      fetched_at: timestamp,
    };

    return applyOverrides(venue, overrides);
  });

  return venues;
}

/** Matches a Dutch corporate form, which marks a licence holder rather than a venue. */
const CORPORATE_FORM = /(^|\s|\()(b\.?\s?v\.?|v\.?o\.?f\.?|n\.?v\.?|holding|beheer)(\)|\s|$)/i;

/**
 * The register stores the name of the *case*, which is usually the venue but is
 * sometimes the company that holds the licence ("Cafe City Hall BV / Prix
 * D'Ami", "Penultimate V B.V. Greenhouse Centrum"). The legal name is kept
 * intact on the record; this is only what a visitor sees on the sign.
 */
export function displayName(legalName: string, osmName?: string | null): string {
  const stripPrefix = (value: string) => value.replace(/^coffee\s?shop\s+/i, '').trim();
  let name = stripPrefix(legalName);

  // "Company BV / Trading Name" — keep the half that is not a company.
  if (name.includes('/')) {
    const halves = name.split('/').map((half) => half.trim()).filter(Boolean);
    const trading = halves.filter((half) => !CORPORATE_FORM.test(half));
    if (trading.length > 0) name = trading[trading.length - 1];
  }

  // OpenStreetMap carries the name on the door, which beats a holding company.
  if (CORPORATE_FORM.test(name) && osmName) return stripPrefix(osmName) || osmName;

  const trimmed = name.replace(/[\s(]+(b\.?\s?v\.?|v\.?o\.?f\.?|n\.?v\.?)\)?[\s.]*$/i, '').trim();
  return trimmed || name || legalName;
}

function uniqueSlug(candidate: string, taken: Set<string>, neighbourhood: string | null): string {
  let slug = candidate;
  if (taken.has(slug) && neighbourhood) slug = `${candidate}-${slugify(neighbourhood)}`;
  let suffix = 2;
  while (taken.has(slug)) {
    slug = `${candidate}-${suffix}`;
    suffix += 1;
  }
  taken.add(slug);
  return slug;
}

function applyOverrides(venue: Venue, overrides: Overrides): Venue {
  const override = overrides[venue.amsterdam_id ?? ''] ?? overrides[venue.slug];
  if (!override) return venue;
  const fields = override.override_fields ?? Object.keys(override).filter((key) => key !== 'override_fields');
  const result = { ...venue };
  for (const field of fields) {
    if (field in override) {
      (result as Record<string, unknown>)[field] = (override as Record<string, unknown>)[field];
      result.sources = { ...result.sources, [field]: 'manual' };
    }
  }
  return result;
}

/**
 * §10 step 4: a venue absent from a valid licence list for two consecutive runs
 * becomes `closed`. Nothing is ever deleted — "is X still open?" is exactly the
 * question the reference site cannot answer.
 */
export function carryForwardClosed(
  current: Venue[],
  previous: Venue[],
  missingRuns: Record<string, number>,
  now: Date,
): { venues: Venue[]; missingRuns: Record<string, number>; closed: number } {
  const currentIds = new Set(current.map((venue) => venue.amsterdam_id));
  const nextMissing: Record<string, number> = {};
  const carried: Venue[] = [];
  let closed = 0;

  for (const venue of previous) {
    const key = venue.amsterdam_id ?? venue.id;
    if (currentIds.has(venue.amsterdam_id)) continue;

    const misses = (missingRuns[key] ?? 0) + 1;
    nextMissing[key] = misses;
    const status = misses >= 2 ? 'closed' : venue.status;
    if (status === 'closed' && venue.status !== 'closed') closed += 1;
    carried.push({
      ...venue,
      status,
      fetched_at: now.toISOString(),
      sources: { ...venue.sources, status: 'amsterdam' },
    });
  }

  return { venues: [...current, ...carried], missingRuns: nextMissing, closed };
}

export function diffCounts(current: Venue[], previous: Venue[]) {
  const previousById = new Map(previous.map((venue) => [venue.amsterdam_id ?? venue.id, venue]));
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  for (const venue of current) {
    const before = previousById.get(venue.amsterdam_id ?? venue.id);
    if (!before) {
      inserted += 1;
      continue;
    }
    if (comparable(before) === comparable(venue)) unchanged += 1;
    else updated += 1;
  }
  return { inserted, updated, unchanged };
}

/** Everything except the per-run timestamps, so a no-op re-run reports no churn. */
function comparable(venue: Venue): string {
  const { fetched_at: _fetchedAt, hours_updated_at: _hoursUpdatedAt, ...rest } = venue;
  return JSON.stringify(rest);
}
