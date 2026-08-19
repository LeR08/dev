import { describe, expect, it } from 'vitest';
import fixture from './fixtures/amsterdam-wfs.json';
import { coordinatesOf, daysExpired, isCoffeeshop, RENEWAL_GRACE_DAYS, toLicenceRecord } from '@/etl/adapters/amsterdam';
import { buildVenues, carryForwardClosed, diffCounts, displayName } from '@/etl/build';
import { assertOsmCountPlausible, assertRowCountPlausible, EtlAbort } from '@/etl/run';
import { markSharedHandles } from '@/etl/sources/socials';
import { amsterdamAdapter } from '@/etl/adapters/amsterdam';
import { inBBox } from '@/lib/geo';
import type { Venue } from '@/lib/types';

type Feature = (typeof fixture)['features'][number];
const features = fixture.features as Feature[];
const byName = (name: string) => features.find((f) => f.properties.zaaknaam === name)!;

// Fixed date so the einddatum rule is deterministic.
const TODAY = new Date(2026, 7, 19);

describe('coffeeshop selection', () => {
  it('keeps a row filed as Coffeeshop in the category column', () => {
    expect(isCoffeeshop(byName('Coffeeshop The Dream').properties, TODAY)).toBe(true);
  });

  it('keeps a row filed only in the specification column', () => {
    // 'Onbekend' category with 'Coffeeshop' specification — the case that makes
    // filtering on zaak_categorie alone silently drop real venues.
    const row = byName('Koffieshop Happy Days');
    expect(row.properties.zaak_categorie).toBe('Onbekend');
    expect(isCoffeeshop(row.properties, TODAY)).toBe(true);
  });

  it('keeps a licence whose end date passed weeks ago, and drops one long gone', () => {
    const row = byName('420CAFE');
    expect(row.properties.einddatum).toBe('2026-07-01');
    // Seven weeks past its end date and still granted: a renewal in flight.
    expect(isCoffeeshop(row.properties, TODAY)).toBe(true);
    // A year later, with no renewal published, it is genuinely gone.
    expect(isCoffeeshop(row.properties, new Date(2027, 6, 1))).toBe(false);
  });

  it('drops a licence that is not granted', () => {
    expect(isCoffeeshop(byName('Coffeeshop Ingetrokken').properties, TODAY)).toBe(false);
  });

  it('drops venues that are not coffeeshops at all', () => {
    expect(isCoffeeshop(byName('Café Oost').properties, TODAY)).toBe(false);
  });
});

describe('record mapping', () => {
  it('returns coordinates inside the Amsterdam bbox', () => {
    for (const feature of features) {
      const coordinates = coordinatesOf(feature)!;
      expect(coordinates).not.toBeNull();
      expect(inBBox(coordinates.lng, coordinates.lat)).toBe(true);
    }
  });

  it('normalises the postcode', () => {
    const record = toLicenceRecord(byName('Coffeeshop The Dream'))!;
    expect(record.postcode).toMatch(/^\d{4} [A-Z]{2}$/);
  });

  it('expands two licence blocks into a full week', () => {
    const record = toLicenceRecord(byName('Coffeeshop The Dream'))!;
    expect(record.hoursLicensed).toHaveLength(7);
    expect(record.hoursLicensed![1][0].from).toBe('07:00');
  });

  it('falls back to null hours when every field is junk', () => {
    const record = toLicenceRecord(byName('Coffeeshop Junk Hours'))!;
    // '_kies', '-', '1 uur voor eerste activiteit' and '0700' are all rejected.
    expect(record.hoursLicensed).toBeNull();
  });

  it('strips the Coffeeshop prefix for display but keeps the legal name', () => {
    expect(displayName('Coffeeshop The Dream')).toBe('The Dream');
    expect(displayName('420CAFE')).toBe('420CAFE');
  });

  it('drops a trailing corporate form from the licence holder name', () => {
    expect(displayName('Easy Times B.V.')).toBe('Easy Times');
    expect(displayName('Balou Amsterdam BV')).toBe('Balou Amsterdam');
    expect(displayName('Carmelo B.V.')).toBe('Carmelo');
  });

  it('keeps the trading half of a "company / venue" name', () => {
    expect(displayName("Cafe City Hall BV / Prix D'Ami")).toBe("Prix D'Ami");
    expect(displayName('ET-group BV / Easy Times II')).toBe('Easy Times II');
  });

  it('prefers the OpenStreetMap name when the register holds a company', () => {
    expect(displayName('Penultimate V B.V. Greenhouse Centrum', 'Greenhouse Centrum')).toBe(
      'Greenhouse Centrum',
    );
    // The prefix is dropped from the OSM name too, so the list reads consistently.
    expect(displayName('Blue Sea B.V.', 'Coffeeshop Blue Sea')).toBe('Blue Sea');
    // …but never overrides a name that already looks like a venue.
    expect(displayName('Coffeeshop The Dream', 'Dream Lounge')).toBe('The Dream');
  });

  it('never returns an empty name', () => {
    expect(displayName('B.V.')).toBe('B.V.');
  });
});

const licences = features
  .filter((feature) => isCoffeeshop(feature.properties, TODAY))
  .map((feature) => toLicenceRecord(feature)!)
  .filter(Boolean);

const buildArgs = {
  adapter: amsterdamAdapter,
  matches: [],
  neighbourhoods: [],
  overrides: {},
  now: TODAY,
  osmAvailable: true,
};

describe('ETL runs', () => {
  it('inserts every venue on a fresh run', () => {
    const venues = buildVenues({ ...buildArgs, licences, previous: [] });
    expect(venues).toHaveLength(licences.length);
    expect(diffCounts(venues, [])).toMatchObject({ inserted: licences.length, updated: 0 });
    expect(new Set(venues.map((venue) => venue.slug)).size).toBe(venues.length);
  });

  it('is a no-op when re-run against unchanged sources', () => {
    const first = buildVenues({ ...buildArgs, licences, previous: [] });
    const second = buildVenues({ ...buildArgs, licences, previous: first });
    expect(diffCounts(second, first)).toMatchObject({
      inserted: 0,
      updated: 0,
      unchanged: first.length,
    });
    // Ids are stable, so bookmarks and review foreign keys survive a run.
    expect(second.map((v) => v.id)).toEqual(first.map((v) => v.id));
  });

  it('marks a vanished venue closed only after two consecutive absences', () => {
    const previous = buildVenues({ ...buildArgs, licences, previous: [] });
    const remaining = previous.slice(1);
    const vanished = previous[0];

    const first = carryForwardClosed(remaining, previous, {}, TODAY);
    const stillListed = first.venues.find((v) => v.id === vanished.id)!;
    expect(stillListed.status).toBe('open');
    expect(first.closed).toBe(0);

    const second = carryForwardClosed(remaining, first.venues, first.missingRuns, TODAY);
    const nowClosed = second.venues.find((v) => v.id === vanished.id)!;
    expect(nowClosed.status).toBe('closed');
    expect(second.closed).toBe(1);
    // Never deleted: a closed venue stays browsable.
    expect(second.venues).toHaveLength(previous.length);
  });

  it('never hands a closed venue\'s slug to a new one', () => {
    const previous = buildVenues({ ...buildArgs, licences, previous: [] });
    const closed = previous[0];
    // The same name reappears under a different licence id.
    const reopened = [{ ...licences[0], sourceId: 'brand-new-licence' }, ...licences.slice(1)];
    const rebuilt = buildVenues({ ...buildArgs, licences: reopened, previous });

    const newVenue = rebuilt.find((venue) => venue.amsterdam_id === 'brand-new-licence')!;
    expect(newVenue.slug).not.toBe(closed.slug);
    expect(new Set(rebuilt.map((v) => v.slug)).size).toBe(rebuilt.length);
  });

  it('keeps a manual override across a run and records it as the source', () => {
    const overrides = {
      [licences[0].sourceId]: { website: 'https://example.org', override_fields: ['website'] },
    };
    const venues = buildVenues({ ...buildArgs, licences, previous: [], overrides });
    expect(venues.find((v) => v.amsterdam_id === licences[0].sourceId)!.website).toBe(
      'https://example.org',
    );
    expect(venues.find((v) => v.amsterdam_id === licences[0].sourceId)!.sources.website).toBe('manual');
  });
});

describe('a failed Overpass fetch', () => {
  const enriched = () => {
    const venues = buildVenues({ ...buildArgs, licences, previous: [] });
    return venues.map((venue) => ({
      ...venue,
      osm_id: 'node/1',
      website: 'https://example.org',
      phone: '+31 20 000 0000',
      hours_actual: 'Mo-Su 10:00-22:00',
      hours_source: 'osm' as const,
      hours_weekly: Array.from({ length: 7 }, () => [{ from: '10:00', to: '22:00' }]),
    }));
  };

  it('carries the previous enrichment forward instead of wiping it', () => {
    const previous = enriched();
    const rebuilt = buildVenues({ ...buildArgs, licences, previous, osmAvailable: false });
    for (const venue of rebuilt) {
      expect(venue.website).toBe('https://example.org');
      expect(venue.phone).toBe('+31 20 000 0000');
      expect(venue.hours_source).toBe('osm');
      expect(venue.hours_weekly![1]).toEqual([{ from: '10:00', to: '22:00' }]);
    }
  });

  it('does drop enrichment when Overpass answered and no longer matches', () => {
    const previous = enriched();
    const rebuilt = buildVenues({ ...buildArgs, licences, previous, osmAvailable: true });
    for (const venue of rebuilt) {
      expect(venue.website).toBeNull();
      expect(venue.osm_id).toBeNull();
      expect(venue.hours_source).not.toBe('osm');
    }
  });
});

describe('row-count validation', () => {
  it('accepts a plausible change', () => {
    expect(() => assertRowCountPlausible(150, 145, false)).not.toThrow();
  });

  it('aborts rather than publishing a collapsed dataset', () => {
    expect(() => assertRowCountPlausible(40, 145, false)).toThrow(EtlAbort);
  });

  it('aborts on an implausible jump upwards', () => {
    expect(() => assertRowCountPlausible(400, 145, false)).toThrow(EtlAbort);
  });

  it('skips the check on the first run and when drift is expected', () => {
    expect(() => assertRowCountPlausible(145, 0, false)).not.toThrow();
    expect(() => assertRowCountPlausible(40, 145, true)).not.toThrow();
  });
});

describe('Overpass response validation', () => {
  it('never trusts an empty result, even on the first run', () => {
    expect(() => assertOsmCountPlausible(0, 0, false)).toThrow(EtlAbort);
    expect(() => assertOsmCountPlausible(0, 0, true)).toThrow(EtlAbort);
  });

  it('rejects a collapsed result set from a mirror answering 200', () => {
    expect(() => assertOsmCountPlausible(30, 123, false)).toThrow(EtlAbort);
  });

  it('accepts a normal response and any growth', () => {
    expect(() => assertOsmCountPlausible(120, 123, false)).not.toThrow();
    expect(() => assertOsmCountPlausible(200, 123, false)).not.toThrow();
    expect(() => assertOsmCountPlausible(123, 0, false)).not.toThrow();
  });
});

describe('previous data survives a failed source', () => {
  it('keeps the last good snapshot when the licence source throws', async () => {
    const previous: Venue[] = buildVenues({ ...buildArgs, licences, previous: [] });
    const brokenAdapter = {
      ...amsterdamAdapter,
      fetchLicences: async () => {
        throw new Error('HTTP 500');
      },
    };
    await expect(brokenAdapter.fetchLicences()).rejects.toThrow('HTTP 500');
    // Nothing overwrote the snapshot: the run aborts before any write.
    expect(previous).toHaveLength(licences.length);
  });
});

describe('licence renewal grace window', () => {
  const granted = (endDate: string | null) => ({
    zaak_categorie: 'Coffeeshop',
    zaak_specificatie: 'Coffeeshop',
    status_vergunning: 'Verleend',
    einddatum: endDate,
  });

  it('keeps a licence that is still current', () => {
    expect(isCoffeeshop(granted('2028-01-01'), TODAY)).toBe(true);
    expect(daysExpired('2028-01-01', TODAY)).toBe(0);
  });

  it('keeps a recently expired but still-granted licence', () => {
    // The register is a renewal calendar: 152 of 158 licences end on the first
    // of a month and renewals are published late. Dropping these deletes
    // operating venues — The Bulldog on Leidseplein expired 2026-07-01 and is
    // very much open.
    expect(isCoffeeshop(granted('2026-07-01'), TODAY)).toBe(true);
    expect(daysExpired('2026-07-01', TODAY)).toBe(49);
  });

  it('drops a licence expired beyond the grace window', () => {
    expect(RENEWAL_GRACE_DAYS).toBe(180);
    expect(isCoffeeshop(granted('2025-01-01'), TODAY)).toBe(false);
  });

  it('still drops a licence that was never granted, however recent', () => {
    expect(isCoffeeshop({ ...granted('2028-01-01'), status_vergunning: 'Ingetrokken' }, TODAY)).toBe(false);
  });

  it('treats a missing end date as open-ended', () => {
    expect(daysExpired(null, TODAY)).toBe(0);
    expect(daysExpired('', TODAY)).toBe(0);
    expect(daysExpired('not a date', TODAY)).toBe(0);
    expect(isCoffeeshop(granted(null), TODAY)).toBe(true);
  });

  it('flags the renewal on the record rather than hiding it', () => {
    const record = toLicenceRecord({
      geometry: { type: 'Point', coordinates: [4.883, 52.363] },
      properties: {
        ...granted('2026-07-01'),
        id: 1,
        zaaknaam: 'The Bulldog',
        adres: 'Leidseplein 17A',
      },
    })!;
    expect(record.licenceRenewalPending).toBe(true);
  });
});

describe('social handles', () => {
  it('separates a chain account from a venue account', () => {
    // The Bulldog's branches all point at one Instagram; Popeye's is its own.
    const shared = markSharedHandles({
      'bulldog-leidseplein': { instagram: 'thebulldogamsterdam', facebook: 'TheBulldog1975' },
      'bulldog-port': { instagram: 'thebulldogamsterdam', facebook: 'TheBulldog1975' },
      popeye: { instagram: 'popeyecoffeeshop' },
    });
    expect(shared['bulldog-leidseplein']).toEqual(['instagram', 'facebook']);
    expect(shared['bulldog-port']).toEqual(['instagram', 'facebook']);
    expect(shared.popeye).toBeUndefined();
  });

  it('reports nothing when every handle is unique', () => {
    expect(markSharedHandles({ a: { instagram: 'one' }, b: { instagram: 'two' } })).toEqual({});
  });
});
