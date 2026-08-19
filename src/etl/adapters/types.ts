import type { BBox } from '@/lib/geo';
import type { WeeklyHours } from '@/lib/types';

/**
 * One licensing authority, one adapter. Amsterdam is the only implementation in
 * v1, but every city-specific assumption lives behind this interface so adding a
 * municipality is a new file rather than a rewrite (§16.5) — other cities do not
 * all publish an equivalent licence dataset, so `fetchLicences` is deliberately
 * free to do whatever that city requires.
 */
export interface LicenceRecord {
  /** Stable identifier within the source, used for idempotent upserts. */
  sourceId: string;
  name: string;
  legalName: string | null;
  address: string;
  postcode: string | null;
  lat: number;
  lng: number;
  licenceNumber: string | null;
  licenceValidTo: string | null;
  /** Outer bound permitted by the licence — never presented as trading hours. */
  hoursLicensed: WeeklyHours | null;
  hasTerrace: boolean;
}

export interface CityAdapter {
  /** Slug used in the data model's `city` column and in future routes. */
  city: string;
  /** Human-readable name, used in Overpass queries and copy. */
  displayName: string;
  bbox: BBox;
  /** Licence attribution required by L4. */
  attribution: string[];
  fetchLicences(): Promise<LicenceRecord[]>;
  /** Optional polygon layer used to label venues with a neighbourhood. */
  fetchNeighbourhoods?(): Promise<NeighbourhoodPolygon[]>;
}

export interface NeighbourhoodPolygon {
  name: string;
  /** Outer rings only; holes are irrelevant at this scale. */
  rings: [number, number][][];
}
