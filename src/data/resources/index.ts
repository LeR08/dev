import type { ResourceCountry } from '@/domain/types';
import ae from './ae.json';
import ca from './ca.json';
import cn from './cn.json';
import fr from './fr.json';
import gb from './gb.json';
import other from './other.json';
import sa from './sa.json';
import type { CountryResources } from './types';
import us from './us.json';

export const RESOURCES: Record<ResourceCountry, CountryResources> = {
  FR: fr as CountryResources,
  US: us as CountryResources,
  GB: gb as CountryResources,
  CA: ca as CountryResources,
  CN: cn as CountryResources,
  SA: sa as CountryResources,
  AE: ae as CountryResources,
  OTHER: other as CountryResources,
};

export function resourcesFor(country: ResourceCountry): CountryResources {
  return RESOURCES[country] ?? RESOURCES.OTHER;
}

export type { CountryResources, ResourceEntry } from './types';
