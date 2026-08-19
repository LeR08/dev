import { randomUUID } from 'node:crypto';
import { jaroWinkler, normalizeName, parseAddress, slugify } from '@/lib/text';
import { haversine } from '@/lib/geo';
import { DIRECTORY_AMENITIES } from '@/etl/sources/directory';
import type { DirectoryRecord } from '@/etl/sources/directory';
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
  /**
   * Drops carried enrichment instead of reusing it, so every field is rebuilt
   * from a live source. Needed once after a provenance bug, since a wrong
   * source label is otherwise self-perpetuating: each carry trusts the label
   * the previous carry wrote.
   */
  resetEnrichment?: boolean;
}

/**
 * Field precedence from §5.6: the licence register owns status, official name
 * and address; OSM owns contact details, amenities and real opening hours;
 * anything an admin has overridden owns itself.
 */
export function buildVenues(input: BuildInput): Venue[] {
  const {
    adapter, licences, matches, neighbourhoods, previous, overrides, now, osmAvailable,
    resetEnrichment = false,
  } = input;
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
          // Only claim a source for a field that actually carries a value:
          // "phone from OpenStreetMap" on a venue with no phone is a claim
          // about nothing, and it inflates every count taken from this map.
          sources: {
            ...(osm.website ? { website: 'osm' } : {}),
            ...(osm.phone ? { phone: 'osm' } : {}),
            ...(Object.keys(amenitiesFromTags(osm.tags)).length ? { amenities: 'osm' } : {}),
          } as Record<string, string>,
        }
      : !osmAvailable && !resetEnrichment && existing?.osm_id
        ? {
            name: existing.name,
            website: existing.website,
            phone: existing.phone,
            osmId: existing.osm_id,
            amenities: existing.amenities,
            hoursActual: existing.hours_actual,
            hoursWeekly: existing.hours_source === 'osm' ? existing.hours_weekly : null,
            // Carry the labels with the values. Re-asserting 'osm' over a
            // carried field is how a directory phone number ends up credited to
            // OpenStreetMap, and how that lie then survives every later run:
            // the next carry trusts the label it wrote itself.
            sources: {
              ...(existing.website && existing.sources.website
                ? { website: existing.sources.website }
                : {}),
              ...(existing.phone && existing.sources.phone ? { phone: existing.sources.phone } : {}),
              ...(Object.keys(existing.amenities).length && existing.sources.amenities
                ? { amenities: existing.sources.amenities }
                : {}),
            } as Record<string, string>,
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
      // Derived from the directory pass, so recomputed every run rather than
      // carried: a name matched in error must not outlive the rule that let it in.
      aliases: [],
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
        ...(enrichment?.sources ?? {}),
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

/**
 * Fills gaps from the third-party directory: a field is only written when we
 * have nothing there, so the city's own record of name, address and status
 * always wins. Each field written records where it came from, and the name they
 * use becomes a search alias rather than replacing ours.
 */
export function applyDirectory(venues: Venue[], records: DirectoryRecord[]): {
  phones: number;
  websites: number;
  aliases: number;
  amenities: number;
} {
  const counts = { phones: 0, websites: 0, aliases: 0, amenities: 0 };
  const claimed = new Set<string>();

  /**
   * Their addresses often drop the house letter the register carries, so
   * "Kloveniersburgwal 4A" and "Kloveniersburgwal 4" are usually one shop. What
   * makes that unsafe is not the letter but ambiguity: Nieuwe Nieuwstraat 32
   * holds both El Guapo and Terps Army. So a building-number match is accepted
   * only where exactly one venue and exactly one record share that building.
   */
  const crowded = crowdedBuildings(venues, records);

  for (const venue of venues) {
    const match = bestDirectoryMatch(venue, records, claimed, crowded);
    if (!match) continue;
    claimed.add(match.slug);

    if (!venue.phone && match.phone) {
      venue.phone = match.phone;
      venue.sources = { ...venue.sources, phone: 'directory' };
      counts.phones += 1;
    }
    if (!venue.website && match.website) {
      venue.website = match.website;
      venue.sources = { ...venue.sources, website: 'directory' };
      counts.websites += 1;
    }

    const theirName = match.name.trim();
    const known = [venue.name, venue.legal_name, ...venue.aliases]
      .filter((value): value is string => typeof value === 'string')
      .map(normalizeName);
    if (theirName && !known.includes(normalizeName(theirName))) {
      venue.aliases = [...venue.aliases, theirName];
      venue.sources = { ...venue.sources, aliases: 'directory' };
      counts.aliases += 1;
    }

    const added: Record<string, boolean> = {};
    for (const key of match.amenities) {
      const mapped = DIRECTORY_AMENITIES[key];
      if (mapped && !(mapped in venue.amenities)) added[mapped] = true;
    }
    if (Object.keys(added).length > 0) {
      venue.amenities = { ...venue.amenities, ...added };
      venue.sources = { ...venue.sources, amenities_extra: 'directory' };
      counts.amenities += 1;
    }
  }

  return counts;
}

/** Same three rules as §5.6, applied against the directory's own coordinates. */
/** Street+number keys where either side lists more than one venue. */
function crowdedBuildings(venues: Venue[], records: DirectoryRecord[]): Set<string> {
  const key = (street: string, base: string | null) => `${street}|${base}`;
  const count = (entries: { street: string; base: string | null }[]) => {
    const seen = new Map<string, number>();
    for (const entry of entries) {
      if (!entry.base) continue;
      const k = key(entry.street, entry.base);
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    return seen;
  };

  const ours = count(venues.map((venue) => parseAddress(venue.address)));
  const theirs = count(
    records.filter((r) => r.address).map((r) => parseAddress(r.address as string)),
  );

  const crowded = new Set<string>();
  for (const [k, n] of ours) if (n > 1) crowded.add(k);
  for (const [k, n] of theirs) if (n > 1) crowded.add(k);
  return crowded;
}

function bestDirectoryMatch(
  venue: Venue,
  records: DirectoryRecord[],
  claimed: Set<string>,
  crowded: Set<string>,
): DirectoryRecord | null {
  const mine = parseAddress(venue.address);
  let best: { record: DirectoryRecord; score: number; distance: number } | null = null;

  for (const record of records) {
    if (claimed.has(record.slug)) continue;
    const theirs = record.address ? parseAddress(record.address) : null;
    const sameStreet = theirs != null && theirs.street === mine.street;
    const isCrowded = mine.base != null && crowded.has(`${mine.street}|${mine.base}`);
    const sameAddress =
      sameStreet &&
      theirs.base != null &&
      mine.base != null &&
      theirs.base === mine.base &&
      // In a building that holds more than one venue, the unit has to agree too.
      (!isCrowded || theirs.unit === mine.unit);

    const distance =
      record.lat != null && record.lng != null
        ? haversine(venue, { lat: record.lat, lng: record.lng })
        : Number.POSITIVE_INFINITY;
    const similarity = jaroWinkler(normalizeName(venue.name), normalizeName(record.name));

    // Deliberately stricter than the OSM matcher: a wrong phone number is worse
    // than a missing one, so proximity alone is not enough here — the address
    // must agree, or the name must be near-identical and close by.
    const score = sameAddress ? 3 : similarity >= 0.9 && distance <= 150 ? 2 : 0;
    if (score === 0) continue;
    if (!best || score > best.score || (score === best.score && distance < best.distance)) {
      best = { record, score, distance };
    }
  }
  return best?.record ?? null;
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
