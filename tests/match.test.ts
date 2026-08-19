import { describe, expect, it } from 'vitest';
import { matchSources } from '@/etl/match';
import type { LicenceRecord } from '@/etl/adapters/types';
import type { OsmRecord } from '@/etl/sources/overpass';

const licence = (over: Partial<LicenceRecord> & { sourceId: string; name: string; lat: number; lng: number; address: string }): LicenceRecord => ({
  legalName: over.name,
  postcode: null,
  licenceNumber: null,
  licenceValidTo: null,
  licenceRenewalPending: false,
  hoursLicensed: null,
  hasTerrace: false,
  ...over,
});

const osm = (over: Partial<OsmRecord> & { osmId: string; name: string; lat: number; lng: number }): OsmRecord => ({
  address: null,
  postcode: null,
  website: null,
  phone: null,
  openingHours: null,
  tags: {},
  ...over,
});

/** ~11 m per 0.0001 degree of latitude at this parallel. */
const shiftMetres = (lat: number, metres: number) => lat + metres / 111_320;

describe('matchSources', () => {
  it('matches on proximity plus a moderately similar name', () => {
    const result = matchSources(
      [licence({ sourceId: 'L1', name: 'Coffeeshop Grey Area', lat: 52.3745, lng: 4.885, address: 'Oude Leliestraat 2' })],
      [osm({ osmId: 'node/1', name: 'Grey Area', lat: shiftMetres(52.3745, 20), lng: 4.885 })],
    );
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].rule).toBe('proximity-name');
    expect(result.unmatchedOsm).toHaveLength(0);
  });

  it('matches on identical street and house number when the names diverge', () => {
    const result = matchSources(
      [licence({ sourceId: 'L2', name: '420CAFE', lat: 52.3752, lng: 4.897, address: 'Oudebrugsteeg 27-H' })],
      [osm({ osmId: 'node/2', name: 'The Bulldog Rockshop', lat: shiftMetres(52.3752, 90), lng: 4.897, address: 'Oudebrugsteeg 27' })],
    );
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].rule).toBe('address');
  });

  it('matches a near-identical name up to 150 m away', () => {
    const result = matchSources(
      [licence({ sourceId: 'L3', name: 'De Dampkring', lat: 52.3690, lng: 4.888, address: 'Handboogstraat 29' })],
      [osm({ osmId: 'node/3', name: 'Dampkring', lat: shiftMetres(52.3690, 120), lng: 4.888 })],
    );
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].rule).toBe('strong-name');
  });

  it('leaves a near-miss unmatched: same street, different house number', () => {
    const result = matchSources(
      [licence({ sourceId: 'L4', name: 'Katsu', lat: 52.3580, lng: 4.895, address: 'Eerste Van der Helststraat 70' })],
      [osm({ osmId: 'node/4', name: 'Bagels & Beans', lat: shiftMetres(52.3580, 200), lng: 4.895, address: 'Eerste Van der Helststraat 12' })],
    );
    expect(result.matches).toHaveLength(0);
    expect(result.unmatchedOsm.map((r) => r.osmId)).toEqual(['node/4']);
  });

  it('leaves a near-miss unmatched: similar name, too far away', () => {
    const result = matchSources(
      [licence({ sourceId: 'L5', name: 'The Bulldog', lat: 52.3740, lng: 4.900, address: 'Oudezijds Voorburgwal 90' })],
      [osm({ osmId: 'node/5', name: 'The Bulldog', lat: 52.3900, lng: 4.930 })],
    );
    expect(result.matches).toHaveLength(0);
  });

  it('never lets two licences claim the same OSM record', () => {
    const result = matchSources(
      [
        licence({ sourceId: 'L6', name: 'Boerejongens', lat: 52.3600, lng: 4.860, address: 'Baarsjesweg 239' }),
        licence({ sourceId: 'L7', name: 'Boerejongens West', lat: shiftMetres(52.3600, 15), lng: 4.860, address: 'Baarsjesweg 241' }),
      ],
      [osm({ osmId: 'node/6', name: 'Boerejongens', lat: shiftMetres(52.3600, 5), lng: 4.860 })],
    );
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].licence.sourceId).toBe('L6');
  });

  it('queues every unmatched OSM record for review rather than publishing it', () => {
    const result = matchSources([], [osm({ osmId: 'node/7', name: 'Brand New Shop', lat: 52.37, lng: 4.89 })]);
    expect(result.matches).toHaveLength(0);
    expect(result.unmatchedOsm).toHaveLength(1);
  });
});
