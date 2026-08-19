import type { NeighbourhoodPolygon } from '@/etl/adapters/types';

/** Ray casting; the rings come from the city's own boundary layer. */
function pointInRing(lng: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function neighbourhoodOf(
  lng: number,
  lat: number,
  polygons: NeighbourhoodPolygon[],
): string | null {
  for (const polygon of polygons) {
    for (const ring of polygon.rings) {
      if (pointInRing(lng, lat, ring)) return polygon.name;
    }
  }
  return null;
}
