import { describe, expect, it } from 'vitest';
import { parseEwkt, rdToWgs84, toWgs84 } from '@/lib/rd';

/**
 * The three reference points published with the Rijksdriehoek definition.
 * Tolerance is 1e-4 degrees (~10 m), which the towgs84 datum shift comfortably
 * meets and a wrong projection definition would miss by kilometres.
 */
const REFERENCE = [
  { name: 'Amersfoort (origin)', x: 155000, y: 463000, lat: 52.15517440, lng: 5.38720621 },
  { name: 'Westertoren, Amsterdam', x: 120700.723, y: 487525.501, lat: 52.37453253, lng: 4.88352538 },
  { name: 'Martinitoren, Groningen', x: 233883.131, y: 582065.167, lat: 53.21938161, lng: 6.56820508 },
];

describe('rdToWgs84', () => {
  for (const point of REFERENCE) {
    it(`transforms ${point.name}`, () => {
      const result = rdToWgs84(point.x, point.y);
      expect(result.lat).toBeCloseTo(point.lat, 4);
      expect(result.lng).toBeCloseTo(point.lng, 4);
    });
  }
});

describe('toWgs84', () => {
  it('passes through coordinates that are already WGS84', () => {
    expect(toWgs84(4.895, 52.371)).toEqual({ lng: 4.895, lat: 52.371 });
  });

  it('converts Rijksdriehoek metres inside Amsterdam', () => {
    const result = toWgs84(120700.723, 487525.501)!;
    expect(result.lat).toBeCloseTo(52.37453, 4);
  });

  it('rejects a point that lands outside Amsterdam after conversion', () => {
    // Groningen is real, correctly projected, and not in this directory.
    expect(toWgs84(233883.131, 582065.167)).toBeNull();
  });
});

describe('parseEwkt', () => {
  it('reads the SRID=28992;POINT(x y) form the raw WFS payload can carry', () => {
    const result = parseEwkt('SRID=28992;POINT(120700.723 487525.501)')!;
    expect(result.lat).toBeCloseTo(52.37453, 4);
    expect(result.lng).toBeCloseTo(4.88353, 4);
  });

  it('reads a plain WGS84 point', () => {
    expect(parseEwkt('POINT(4.895 52.371)')).toEqual({ lng: 4.895, lat: 52.371 });
  });

  it('returns null for anything else', () => {
    expect(parseEwkt('LINESTRING(0 0, 1 1)')).toBeNull();
    expect(parseEwkt('')).toBeNull();
  });
});
