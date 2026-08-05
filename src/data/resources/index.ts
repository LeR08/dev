import type { ResourceCountry } from '@/domain/types';
import ca from './ca.json';
import fr from './fr.json';
import gb from './gb.json';
import other from './other.json';
import type { CountryResources } from './types';
import us from './us.json';

export const RESOURCES: Record<ResourceCountry, CountryResources> = {
  FR: fr as CountryResources,
  US: us as CountryResources,
  GB: gb as CountryResources,
  CA: ca as CountryResources,
  OTHER: other as CountryResources,
};

export function resourcesFor(country: ResourceCountry): CountryResources {
  return RESOURCES[country] ?? RESOURCES.OTHER;
}

export type { CountryResources, ResourceEntry } from './types';
