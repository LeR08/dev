import { describe, expect, it } from 'vitest';
import fixture from './fixtures/amsterdam-wfs.json';
import { coordinatesOf, daysExpired, isCoffeeshop, RENEWAL_GRACE_DAYS, toLicenceRecord } from '@/etl/adapters/amsterdam';
import { applyDirectory, buildVenues, carryForwardClosed, diffCounts, displayName } from '@/etl/build';
import type { DirectoryRecord } from '@/etl/sources/directory';
import { assertOsmCountPlausible, assertRowCountPlausible, EtlAbort } from '@/etl/run';
import { markSharedHandles } from '@/etl/sources/socials';
import { angleBetween, bearing, pickFacingImage } from '@/etl/sources/mapillary';
import { amsterdamAdapter } from '@/etl/adapters/amsterdam';
import { inBBox } from '@/lib/geo';
import { parseAddress } from '@/lib/text';
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
      // As a real OSM-enriched venue would be stamped — which is what decides
      // whether these fields are carried through an outage.
      sources: { ...venue.sources, website: 'osm', phone: 'osm', amenities: 'osm' },
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

describe('third-party directory, as a gap filler', () => {
  const venue = (over: Partial<Venue>): Venue =>
    ({
      id: 'v1',
      slug: 'superskunk',
      city: 'amsterdam',
      name: 'Superskunk',
      legal_name: 'Coffeeshop Superskunk',
      aliases: [],
      address: 'Prinsengracht 480-H',
      postcode: null,
      neighbourhood: null,
      lat: 52.365,
      lng: 4.883,
      status: 'open',
      renamed_to: null,
      licence_number: null,
      licence_valid_to: null,
      licence_renewal_pending: false,
      website: null,
      phone: null,
      amenities: {},
      hours_licensed: null,
      hours_weekly: null,
      hours_actual: null,
      hours_source: null,
      hours_updated_at: null,
      socials: {},
      socials_shared: [],
      website_live: null,
      osm_id: null,
      amsterdam_id: 'a1',
      rating_avg: null,
      rating_count: 0,
      sources: { name: 'amsterdam' },
      fetched_at: '2026-08-19T00:00:00.000Z',
      ...over,
    }) as Venue;

  const record = (over: Partial<DirectoryRecord>): DirectoryRecord => ({
    slug: 'tops-amsterdam',
    name: 'Tops',
    address: 'Prinsengracht 480',
    postcode: null,
    lat: 52.365,
    lng: 4.883,
    phone: '020 123 4567',
    website: 'https://example.org',
    amenities: ['toilet', 'pin_payment', 'menu_photos'],
    url: 'https://example.org/tops',
    ...over,
  });

  it('fills an empty phone and credits the source', () => {
    const venues = [venue({})];
    const counts = applyDirectory(venues, [record({})]);
    expect(counts.phones).toBe(1);
    expect(venues[0].phone).toBe('020 123 4567');
    expect(venues[0].sources.phone).toBe('directory');
  });

  it('never overwrites a value the city or OpenStreetMap already gave us', () => {
    const venues = [venue({ phone: '020 999 0000', sources: { phone: 'osm' } })];
    applyDirectory(venues, [record({})]);
    expect(venues[0].phone).toBe('020 999 0000');
    expect(venues[0].sources.phone).toBe('osm');
  });

  it('keeps a different trading name as a search alias, not as the name', () => {
    const venues = [venue({})];
    applyDirectory(venues, [record({})]);
    expect(venues[0].name).toBe('Superskunk');
    expect(venues[0].aliases).toEqual(['Tops']);
  });

  it('does not record an alias that merely restates the name we have', () => {
    const venues = [venue({})];
    applyDirectory(venues, [record({ name: 'Coffeeshop Superskunk' })]);
    expect(venues[0].aliases).toEqual([]);
  });

  it('maps only the amenity keys we recognise', () => {
    const venues = [venue({})];
    applyDirectory(venues, [record({})]);
    expect(venues[0].amenities).toEqual({ toilet: true, card_payment: true });
  });

  it('leaves a venue alone when nothing matches it', () => {
    const venues = [venue({})];
    const counts = applyDirectory(venues, [
      record({ address: 'Damrak 1', lat: 52.377, lng: 4.897, name: 'Somewhere Else' }),
    ]);
    expect(counts.phones).toBe(0);
    expect(venues[0].phone).toBeNull();
  });

  it('gives one directory record to at most one venue', () => {
    const venues = [venue({}), venue({ id: 'v2', slug: 'other', amsterdam_id: 'a2' })];
    applyDirectory(venues, [record({})]);
    expect([venues[0].phone, venues[1].phone].filter(Boolean)).toHaveLength(1);
  });
});

describe('premises-level address matching', () => {
  it('treats a ground-floor suffix as the same premises', () => {
    expect(parseAddress('Brouwersgracht 137-H').unit).toBe(parseAddress('Brouwersgracht 137').unit);
    expect(parseAddress('Amsteldijk 139-HS').unit).toBe(parseAddress('Amsteldijk 139').unit);
  });

  it('keeps a lettered unit distinct from the bare number', () => {
    // El Guapo at Nieuwe Nieuwstraat 32 and Terps Army at 32C are neighbours.
    expect(parseAddress('Nieuwe Nieuwstraat 32C').unit).not.toBe(
      parseAddress('Nieuwe Nieuwstraat 32').unit,
    );
    expect(parseAddress('Rozengracht 1A').unit).toBe(parseAddress('Rozengracht 1A').unit);
  });

  it('accepts a house letter the directory dropped, in a building with one venue', () => {
    const shop = {
      id: 'v1', slug: 'green-place', city: 'amsterdam', name: 'Green Place', legal_name: null,
      aliases: [], address: 'Kloveniersburgwal 4A', postcode: null, neighbourhood: null,
      lat: 52.3727, lng: 4.8991, status: 'open', renamed_to: null, licence_number: null,
      licence_valid_to: null, licence_renewal_pending: false, website: null, phone: null,
      amenities: {}, hours_licensed: null, hours_weekly: null, hours_actual: null,
      hours_source: null, hours_updated_at: null, socials: {}, socials_shared: [],
      website_live: null, osm_id: null, amsterdam_id: 'a1', rating_avg: null, rating_count: 0,
      sources: {}, fetched_at: '2026-08-19T00:00:00.000Z',
    } as unknown as Venue;

    applyDirectory([shop], [
      {
        slug: 'green-place', name: 'Green Place', address: 'Kloveniersburgwal 4', postcode: null,
        lat: 52.3727, lng: 4.8991, phone: '020 111 2222', website: null, amenities: [],
        url: 'https://example.org/green-place',
      },
    ]);
    expect(shop.phone).toBe('020 111 2222');
  });

  it('demands the exact unit in a building that holds two venues', () => {
    const make = (slug: string, name: string, address: string) =>
      ({
        id: slug, slug, city: 'amsterdam', name, legal_name: null, aliases: [], address,
        postcode: null, neighbourhood: null, lat: 52.3757, lng: 4.8925, status: 'open',
        renamed_to: null, licence_number: null, licence_valid_to: null,
        licence_renewal_pending: false, website: null, phone: null, amenities: {},
        hours_licensed: null, hours_weekly: null, hours_actual: null, hours_source: null,
        hours_updated_at: null, socials: {}, socials_shared: [], website_live: null,
        osm_id: null, amsterdam_id: slug, rating_avg: null, rating_count: 0, sources: {},
        fetched_at: '2026-08-19T00:00:00.000Z',
      }) as unknown as Venue;

    // Both sit at Nieuwe Nieuwstraat 32; only the unit tells them apart.
    const terps = make('terps', 'Terps Army', 'Nieuwe Nieuwstraat 32C');
    const guapo = make('guapo', 'El Guapo', 'Nieuwe Nieuwstraat 32');

    applyDirectory([terps, guapo], [
      {
        slug: 'el-guapo', name: 'El Guapo', address: 'Nieuwe Nieuwstraat 32', postcode: null,
        lat: 52.3757, lng: 4.8925, phone: '020 333 4444', website: null, amenities: [],
        url: 'https://example.org/el-guapo',
      },
    ]);

    expect(guapo.phone).toBe('020 333 4444');
    expect(terps.phone).toBeNull();
    expect(terps.aliases).toEqual([]);
  });

  it('refuses a directory record at a different house number', () => {
    // Andalucia is at Halvemaansteeg 1; Balou is at number 5, 30 m away.
    const andalucia = {
      id: 'v1', slug: 'andalucia', city: 'amsterdam', name: 'Andalucia', legal_name: null,
      aliases: [], address: 'Halvemaansteeg 1', postcode: null, neighbourhood: null,
      lat: 52.3665, lng: 4.8952, status: 'open', renamed_to: null, licence_number: null,
      licence_valid_to: null, licence_renewal_pending: false, website: null, phone: null,
      amenities: {}, hours_licensed: null, hours_weekly: null, hours_actual: null,
      hours_source: null, hours_updated_at: null, socials: {}, socials_shared: [],
      website_live: null, osm_id: null, amsterdam_id: 'a1', rating_avg: null, rating_count: 0,
      sources: {}, fetched_at: '2026-08-19T00:00:00.000Z',
    } as unknown as Venue;

    applyDirectory([andalucia], [
      {
        slug: 'balou', name: 'Balou', address: 'Halvemaansteeg 5', postcode: null,
        lat: 52.36653, lng: 4.89525, phone: '020 000 0000', website: null,
        amenities: [], url: 'https://example.org/balou',
      },
    ]);

    expect(andalucia.phone).toBeNull();
    expect(andalucia.aliases).toEqual([]);
  });
});

describe('provenance survives an Overpass outage', () => {
  const enriched = (sources: Record<string, string>) =>
    ({
      id: 'v1', slug: 's', city: 'amsterdam', name: 'Shop', legal_name: null, aliases: [],
      address: 'Damrak 1', postcode: null, neighbourhood: null, lat: 52.375, lng: 4.895,
      status: 'open', renamed_to: null, licence_number: null, licence_valid_to: null,
      licence_renewal_pending: false, website: 'https://example.org', phone: '020 000 0000',
      amenities: { wifi: true }, hours_licensed: null, hours_weekly: null, hours_actual: null,
      hours_source: null, hours_updated_at: null, socials: {}, socials_shared: [],
      website_live: null, osm_id: 'node/1', amsterdam_id: 'a1', rating_avg: null,
      rating_count: 0, sources, fetched_at: '2026-08-19T00:00:00.000Z',
    }) as unknown as Venue;

  const licence = {
    sourceId: 'a1', name: 'Shop', legalName: 'Shop', address: 'Damrak 1', postcode: null,
    lat: 52.375, lng: 4.895, licenceNumber: null, licenceValidTo: null,
    licenceRenewalPending: false, hoursLicensed: null, hasTerrace: false,
  };

  const rebuild = (previous: Venue[]) =>
    buildVenues({
      adapter: amsterdamAdapter, licences: [licence], matches: [], neighbourhoods: [],
      overrides: {}, now: TODAY, previous, osmAvailable: false,
    })[0];

  it('carries a phone OpenStreetMap gave us', () => {
    const venue = rebuild([enriched({ phone: 'osm', website: 'osm' })]);
    expect(venue.phone).toBe('020 000 0000');
    expect(venue.sources.phone).toBe('osm');
  });

  it('carries a directory phone under its own name, not under OpenStreetMap', () => {
    const venue = rebuild([enriched({ phone: 'directory', website: 'directory' })]);
    expect(venue.phone).toBe('020 000 0000');
    // The value survives the outage; the credit stays truthful.
    expect(venue.sources.phone).toBe('directory');
    expect(venue.sources.website).toBe('directory');
  });

  it('drops carried enrichment entirely when asked to reset', () => {
    const venue = buildVenues({
      adapter: amsterdamAdapter, licences: [licence], matches: [], neighbourhoods: [],
      overrides: {}, now: TODAY, previous: [enriched({ phone: 'osm' })],
      osmAvailable: false, resetEnrichment: true,
    })[0];
    expect(venue.phone).toBeNull();
    expect(venue.osm_id).toBeNull();
  });
});

describe('the sources map only claims fields that have a value', () => {
  it('does not credit a phone number that does not exist', () => {
    const licence = {
      sourceId: 'a1', name: 'Shop', legalName: 'Shop', address: 'Damrak 1', postcode: null,
      lat: 52.375, lng: 4.895, licenceNumber: null, licenceValidTo: null,
      licenceRenewalPending: false, hoursLicensed: null, hasTerrace: false,
    };
    const venue = buildVenues({
      adapter: amsterdamAdapter,
      licences: [licence],
      // Matched in OSM, but OSM holds a website and no phone.
      matches: [
        {
          licence,
          osm: {
            osmId: 'node/1', name: 'Shop', lat: 52.375, lng: 4.895, address: null,
            postcode: null, website: 'https://example.org', phone: null, openingHours: null,
            tags: {},
          },
          rule: 'address' as const,
          distance: 0,
          similarity: 1,
        },
      ],
      neighbourhoods: [], previous: [], overrides: {}, now: TODAY, osmAvailable: true,
    })[0];

    expect(venue.website).toBe('https://example.org');
    expect(venue.sources.website).toBe('osm');
    expect(venue.phone).toBeNull();
    expect(venue.sources.phone).toBeUndefined();
  });
});

describe('manual overrides are untouchable', () => {
  const licence = {
    sourceId: 'a1', name: 'Shop', legalName: 'Shop', address: 'Damrak 1', postcode: null,
    lat: 52.375, lng: 4.895, licenceNumber: null, licenceValidTo: null,
    licenceRenewalPending: false, hoursLicensed: null, hasTerrace: false,
  };

  const build = (overrides: Record<string, unknown>) =>
    buildVenues({
      adapter: amsterdamAdapter, licences: [licence], matches: [], neighbourhoods: [],
      overrides: overrides as never, now: TODAY, previous: [], osmAvailable: true,
    })[0];

  const directoryRecord = {
    slug: 'shop', name: 'Different Name', address: 'Damrak 1', postcode: null,
    lat: 52.375, lng: 4.895, phone: '020 999 9999', website: 'https://directory.example',
    amenities: ['toilet'], url: 'https://example.org/shop',
  };

  it('records which fields were pinned, and credits them to the correction', () => {
    const venue = build({ a1: { phone: '020 111 1111' } });
    expect(venue.phone).toBe('020 111 1111');
    expect(venue.sources.phone).toBe('manual');
    expect(venue.override_fields).toEqual(['phone']);
  });

  it('keys on the slug as readily as on the licence id', () => {
    const venue = build({ shop: { phone: '020 222 2222' } });
    expect(venue.phone).toBe('020 222 2222');
  });

  it('stops the directory writing over a pinned field', () => {
    const venue = build({ a1: { phone: '020 111 1111', website: 'https://pinned.example' } });
    applyDirectory([venue], [directoryRecord]);
    expect(venue.phone).toBe('020 111 1111');
    expect(venue.website).toBe('https://pinned.example');
    expect(venue.sources.phone).toBe('manual');
  });

  it('stops the directory adding to pinned aliases or amenities', () => {
    const venue = build({ a1: { aliases: ['My Name'], amenities: { wifi: true } } });
    applyDirectory([venue], [directoryRecord]);
    expect(venue.aliases).toEqual(['My Name']);
    expect(venue.amenities).toEqual({ wifi: true });
  });

  it('still lets the directory fill everything that was not pinned', () => {
    const venue = build({ a1: { phone: '020 111 1111' } });
    applyDirectory([venue], [directoryRecord]);
    expect(venue.website).toBe('https://directory.example');
    expect(venue.sources.website).toBe('directory');
  });

  it('ignores a field named in override_fields but absent from the entry', () => {
    const venue = build({ a1: { override_fields: ['phone', 'website'], phone: '020 111 1111' } });
    expect(venue.override_fields).toEqual(['phone']);
    expect(venue.website).toBeNull();
  });
});

describe('choosing a street-level photo', () => {
  // A venue on the north side of a street running east-west.
  const venue = { lat: 52.3700, lng: 4.8900 };
  const south = { lat: 52.3698, lng: 4.8900 }; // ~22 m south of the venue
  const image = (over: Record<string, unknown>) => ({
    id: 'i1',
    thumb_1024_url: 'https://example.org/i1.jpg',
    computed_geometry: { coordinates: [south.lng, south.lat] as [number, number] },
    ...over,
  });

  it('measures the bearing between two points', () => {
    expect(Math.round(bearing(south, venue))).toBe(0); // due north
    expect(Math.round(bearing(venue, south))).toBe(180);
  });

  it('treats compass angles as a circle', () => {
    expect(angleBetween(350, 10)).toBe(20);
    expect(angleBetween(10, 350)).toBe(20);
    expect(angleBetween(0, 180)).toBe(180);
  });

  it('prefers a camera aimed at the venue over one merely closer', () => {
    const facing = image({ id: 'facing', computed_compass_angle: 0 });
    const closerButLookingAway = image({
      id: 'away',
      computed_compass_angle: 90,
      computed_geometry: { coordinates: [4.8900, 52.36995] as [number, number] },
    });
    expect(pickFacingImage([closerButLookingAway, facing], venue)?.id).toBe('facing');
  });

  it('returns nothing when every camera faced elsewhere', () => {
    expect(pickFacingImage([image({ computed_compass_angle: 180 })], venue)).toBeNull();
  });

  it('ignores a photo taken from the doorstep', () => {
    // Standing on the venue itself shows the street, not the shopfront.
    const onTop = image({
      computed_compass_angle: 0,
      computed_geometry: { coordinates: [4.8900, 52.36999] as [number, number] },
    });
    expect(pickFacingImage([onTop], venue)).toBeNull();
  });

  it('ignores an image with no thumbnail or no heading', () => {
    expect(pickFacingImage([image({ thumb_1024_url: undefined, computed_compass_angle: 0 })], venue)).toBeNull();
    expect(pickFacingImage([image({ computed_compass_angle: undefined })], venue)).toBeNull();
  });

  it('breaks a tie on recency', () => {
    const older = image({ id: 'older', computed_compass_angle: 0, captured_at: 1_600_000_000_000 });
    const newer = image({ id: 'newer', computed_compass_angle: 0, captured_at: 1_700_000_000_000 });
    expect(pickFacingImage([older, newer], venue)?.id).toBe('newer');
  });
});
