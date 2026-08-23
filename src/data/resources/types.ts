import type { ResourceCountry } from '@/domain/types';

/**
 * One helpline / service entry (spec v1.2 §8).
 *
 * Deliberately in the service's own natural language rather than the app's UI
 * language — calling a US hotline in French would not be useful, and the
 * organisation names themselves are usually not translated anyway.
 */
export type ResourceEntry = {
  name: string;
  /** Phone number, or a pointer to search for one when a specific digit
   *  string cannot be confidently verified (see the France table's own
   *  "verify before shipping" note from the spec, extended here to every
   *  country entry not sourced directly from that spec table). */
  contact: string;
  notes: string;
};

export type CountryResources = {
  country: ResourceCountry;
  entries: ResourceEntry[];
};
