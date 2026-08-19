import proj4 from 'proj4';
import { inBBox } from '@/lib/geo';

/**
 * The Amsterdam services publish geometry in EPSG:28992 (Rijksdriehoek) and
 * *usually* honour `SRSNAME=EPSG::4326`. When they do not, the payload carries
 * metre-scale coordinates and we transform them ourselves (§5.1).
 */
proj4.defs(
  'EPSG:28992',
  '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 ' +
    '+k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel ' +
    '+towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 ' +
    '+units=m +no_defs',
);

export function rdToWgs84(x: number, y: number): { lng: number; lat: number } {
  const [lng, lat] = proj4('EPSG:28992', 'WGS84', [x, y]);
  return { lng, lat };
}

/**
 * Coordinates in the Amsterdam bbox are already WGS84; anything with a
 * magnitude in the tens of thousands is still Rijksdriehoek.
 */
export function toWgs84(x: number, y: number): { lng: number; lat: number } | null {
  if (inBBox(x, y)) return { lng: x, lat: y };
  if (Math.abs(x) > 1000 || Math.abs(y) > 1000) {
    const converted = rdToWgs84(x, y);
    if (inBBox(converted.lng, converted.lat)) return converted;
    return null;
  }
  return null;
}

/** Parses the `SRID=28992;POINT(x y)` form the raw WFS payload can contain. */
export function parseEwkt(value: string): { lng: number; lat: number } | null {
  const match = /^(?:SRID=(\d+);)?\s*POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)$/i.exec(value.trim());
  if (!match) return null;
  const x = Number(match[2]);
  const y = Number(match[3]);
  return match[1] === '28992' ? rdToWgs84(x, y) : toWgs84(x, y);
}
