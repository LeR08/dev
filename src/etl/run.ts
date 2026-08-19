import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { amsterdamAdapter } from '@/etl/adapters/amsterdam';
import type { CityAdapter, NeighbourhoodPolygon } from '@/etl/adapters/types';
import { matchSources } from '@/etl/match';
import { fetchOsmVenues } from '@/etl/sources/overpass';
import type { OsmRecord } from '@/etl/sources/overpass';
import { applyDirectory, buildVenues, carryForwardClosed, diffCounts } from '@/etl/build';
import { checkSite, markSharedHandles } from '@/etl/sources/socials';
import { DIRECTORY_ATTRIBUTION, fetchDirectory } from '@/etl/sources/directory';
import type { DirectoryRecord } from '@/etl/sources/directory';
import type { SocialProfile } from '@/etl/sources/socials';
import {
  appendRun,
  readOverrides,
  readSnapshot,
  readState,
  writePending,
  writeSnapshot,
  writeState,
} from '@/etl/snapshot';
import type { EtlRun } from '@/etl/snapshot';
import type { PendingVenue, Venue, VenueSnapshot } from '@/lib/types';
import { inBBox } from '@/lib/geo';

const ADAPTERS: Record<string, CityAdapter> = {
  amsterdam: amsterdamAdapter,
};

const OSM_ATTRIBUTION = '© OpenStreetMap contributors (ODbL)';

/** §10: a run that cannot validate its input keeps the last good data. */
export class EtlAbort extends Error {}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');
  const allowDrift = args.has('--allow-drift');
  const cityArg = [...args].find((arg) => arg.startsWith('--city='))?.split('=')[1] ?? 'amsterdam';

  const adapter = ADAPTERS[cityArg];
  if (!adapter) throw new EtlAbort(`unknown city "${cityArg}" (known: ${Object.keys(ADAPTERS).join(', ')})`);

  const startedAt = new Date();
  const errors: string[] = [];
  console.log(`ETL ${adapter.city} — started ${startedAt.toISOString()}${dryRun ? ' (dry run)' : ''}`);

  const previousSnapshot = await readSnapshot();
  const previous = previousSnapshot?.venues ?? [];
  const state = await readState();
  const overrides = await readOverrides();

  // 1. Licences — authoritative, and the one source a run cannot proceed without.
  const licences = await adapter.fetchLicences();
  console.log(`  licences: ${licences.length} coffeeshops with a granted, current permit`);

  const outOfBox = licences.filter((record) => !inBBox(record.lng, record.lat, adapter.bbox));
  if (outOfBox.length > 0) {
    throw new EtlAbort(`${outOfBox.length} licence rows fall outside the ${adapter.city} bbox — refusing to publish`);
  }
  if (licences.length === 0) {
    throw new EtlAbort('licence source returned no coffeeshops — keeping the previous snapshot');
  }
  assertRowCountPlausible(licences.length, state.lastVenueCount, allowDrift);

  // 2. OSM enrichment — best effort. Losing it costs websites and real hours,
  //    not the directory itself, so a failure is logged rather than fatal.
  let osmRecords: OsmRecord[] = [];
  let osmAvailable = false;
  try {
    const fetched = await fetchOsmVenues(adapter.displayName, adapter.bbox);
    // A mirror can answer 200 with an empty or truncated result set. Trusting
    // that would silently strip every website, phone number and real opening
    // time off the directory, so it is treated exactly like an outage.
    assertOsmCountPlausible(fetched.length, state.lastOsmCount ?? 0, allowDrift);
    osmRecords = fetched;
    osmAvailable = true;
    console.log(`  osm: ${osmRecords.length} cannabis-tagged venues`);
  } catch (error) {
    errors.push(`overpass: ${String(error)}`);
    console.warn(`  osm: not trusted, carrying the previous enrichment forward (${String(error)})`);
  }

  // 2b. A third-party directory, read only to fill gaps the open sources leave.
  //     Never overrides the city or OSM, and every field it fills is credited.
  let directory: DirectoryRecord[] = [];
  if (!args.has('--no-directory')) {
    try {
      directory = await fetchDirectory(adapter.city, adapter.bbox);
      console.log(`  directory: ${directory.length} pages read`);
    } catch (error) {
      errors.push(`directory: ${String(error)}`);
      console.warn(`  directory: skipped (${String(error)})`);
    }
  }

  let neighbourhoods: NeighbourhoodPolygon[] = [];
  try {
    neighbourhoods = (await adapter.fetchNeighbourhoods?.()) ?? [];
    console.log(`  neighbourhoods: ${neighbourhoods.length} polygons`);
  } catch (error) {
    errors.push(`neighbourhoods: ${String(error)}`);
  }

  // 3. Match and build.
  const { matches, unmatchedOsm } = matchSources(licences, osmRecords);
  console.log(`  matched: ${matches.length}/${licences.length} licences to an OSM record`);

  const built = buildVenues({
    adapter,
    licences,
    matches,
    neighbourhoods,
    previous,
    overrides,
    now: startedAt,
    osmAvailable,
    resetEnrichment: args.has('--reset-enrichment'),
  });

  if (directory.length > 0) {
    const filled = applyDirectory(built, directory);
    console.log(
      `  directory fills: +${filled.phones} phones, +${filled.websites} websites, ` +
        `+${filled.aliases} trading names, +${filled.amenities} venues with extra amenities`,
    );
  }

  // 3b. Read each venue's own website for its social accounts and to see
  //     whether it still answers. Failures keep the previous values.
  const socialErrors = await attachSocials(built);
  if (socialErrors > 0) errors.push(`socials: ${socialErrors} sites unreachable`);

  const { venues, missingRuns, closed } = carryForwardClosed(built, previous, state.missingRuns, startedAt);
  const counts = diffCounts(built, previous);
  console.log(
    `  diff: +${counts.inserted} inserted, ~${counts.updated} updated, =${counts.unchanged} unchanged, ${closed} newly closed`,
  );

  // With Overpass down there is nothing new to review; the existing queue stands.
  const pending: PendingVenue[] = unmatchedOsm.map((record) => ({
    osm_id: record.osmId,
    name: record.name,
    lat: record.lat,
    lng: record.lng,
    address: record.address,
    tags: record.tags,
    first_seen: startedAt.toISOString(),
  }));
  console.log(`  pending review queue: ${pending.length} unmatched OSM records`);

  const snapshot: VenueSnapshot = {
    generated_at: startedAt.toISOString(),
    city: adapter.city,
    attribution: [
      ...adapter.attribution,
      OSM_ATTRIBUTION,
      ...(directory.length > 0 ? [DIRECTORY_ATTRIBUTION] : []),
    ],
    venues: sortVenues(venues),
  };

  if (dryRun) {
    console.log('  dry run — nothing written');
    return;
  }

  await writeSnapshot(snapshot);
  if (osmAvailable) await writePending(pending);
  await writeState({
    missingRuns,
    lastVenueCount: licences.length,
    // Only a trusted response moves the baseline.
    lastOsmCount: osmAvailable ? osmRecords.length : state.lastOsmCount,
  });

  const run: EtlRun = {
    id: randomUUID(),
    source: adapter.city,
    started_at: startedAt.toISOString(),
    finished_at: new Date().toISOString(),
    inserted: counts.inserted,
    updated: counts.updated,
    unchanged: counts.unchanged,
    closed,
    pending: pending.length,
    errors,
  };
  await appendRun(run);
  console.log(`ETL finished — ${snapshot.venues.length} venues in the snapshot`);
}

/**
 * Visits each venue's website once, at a polite concurrency, and records the
 * handles it publishes plus whether it answered at all. A site that fails keeps
 * whatever the last successful run found — one flaky host must not erase a
 * venue's contact details.
 */
async function attachSocials(venues: Venue[]): Promise<number> {
  const withSite = venues.filter((venue) => venue.website);
  if (withSite.length === 0) return 0;

  let failures = 0;
  const CONCURRENCY = 4;
  for (let i = 0; i < withSite.length; i += CONCURRENCY) {
    await Promise.all(
      withSite.slice(i, i + CONCURRENCY).map(async (venue) => {
        const check = await checkSite(venue.website!);
        venue.website_live = check.live;
        // Only an unreachable host counts as a failure worth reporting; a host
        // that answered 404 gave us a real, if unwelcome, answer.
        if (check.status === 0) failures += 1;
        if (check.status === 0 || check.status >= 400) return;
        if (Object.keys(check.socials).length > 0) {
          venue.socials = check.socials as Record<string, string>;
          venue.sources = { ...venue.sources, socials: 'venue-website' };
        }
      }),
    );
  }

  const shared = markSharedHandles(
    Object.fromEntries(withSite.map((venue) => [venue.slug, venue.socials as SocialProfile])),
  );
  for (const venue of withSite) venue.socials_shared = shared[venue.slug] ?? [];

  const found = withSite.filter((venue) => Object.keys(venue.socials).length > 0).length;
  const live = withSite.filter((venue) => venue.website_live).length;
  console.log(`  socials: ${found}/${withSite.length} venues publish a handle; ${live} sites answered`);
  return failures;
}

/**
 * §10 step 1: a swing of more than 25% against the previous run is far more
 * likely to be a broken upstream response than 40 shops closing overnight.
 */
export function assertRowCountPlausible(current: number, previous: number, allowDrift: boolean): void {
  if (previous === 0 || allowDrift) return;
  const ratio = current / previous;
  if (ratio < 0.75 || ratio > 1.25) {
    throw new EtlAbort(
      `row count moved from ${previous} to ${current} (${Math.round((ratio - 1) * 100)}%) — ` +
        'aborting to keep the last good data. Re-run with --allow-drift if the change is real.',
    );
  }
}

/** Same 25% rule as the licence list, plus "never trust an empty result". */
export function assertOsmCountPlausible(current: number, previous: number, allowDrift: boolean): void {
  if (current === 0) throw new EtlAbort('overpass returned no venues');
  if (previous === 0 || allowDrift) return;
  const ratio = current / previous;
  if (ratio < 0.75) {
    throw new EtlAbort(`overpass returned ${current} venues, down from ${previous}`);
  }
}

function sortVenues(venues: Venue[]): Venue[] {
  return [...venues].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
}

// Only run when invoked as a script; the validation helpers above are imported
// by the test suite, which must not kick off a live fetch.
const invokedDirectly =
  process.argv[1] != null && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (invokedDirectly) {
  main().catch((error) => {
    console.error(`ETL failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
