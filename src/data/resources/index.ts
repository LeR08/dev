import type { ResourceCountry } from '@/domain/types';
import ae from './ae.json';
import cn from './cn.json';
import de from './de.json';
import es from './es.json';
import fr from './fr.json';
import gb from './gb.json';
import it from './it.json';
import other from './other.json';
import pt from './pt.json';
import sa from './sa.json';
import type { CountryResources } from './types';
import us from './us.json';

export const RESOURCES: Record<ResourceCountry, CountryResources> = {
  FR: fr as CountryResources,
  US: us as CountryResources,
  GB: gb as CountryResources,
  ES: es as CountryResources,
  DE: de as CountryResources,
  IT: it as CountryResources,
  PT: pt as CountryResources,
  CN: cn as CountryResources,
  SA: sa as CountryResources,
  AE: ae as CountryResources,
  OTHER: other as CountryResources,
};

export function resourcesFor(country: ResourceCountry): CountryResources {
  return RESOURCES[country] ?? RESOURCES.OTHER;
}

export type { CountryResources, ResourceEntry } from './types';
