import catalog from '@/data/catalog.json';
import { CATEGORIES, type Category, type Drink } from '@/domain/types';

export type SeedDrink = {
  id: string;
  name: string;
  category: Category;
  abv: number;
  defaultVolumeMl: number;
  aliases: string[];
};

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

/**
 * The bundled catalog, validated on the way out so a bad hand-edit of the JSON
 * fails loudly in development instead of writing junk rows.
 */
export const SEED_DRINKS: SeedDrink[] = catalog.drinks.map((drink) => {
  if (!isCategory(drink.category)) {
    throw new Error(`catalog.json: "${drink.id}" has unknown category "${drink.category}"`);
  }
  return {
    id: drink.id,
    name: drink.name,
    category: drink.category,
    abv: drink.abv,
    defaultVolumeMl: drink.defaultVolumeMl,
    aliases: drink.aliases ?? [],
  };
});

export const CATALOG_VERSION: number = catalog.version;

/** Search terms indexed by drink id — aliases never surface in the UI. */
export const SEED_ALIASES = new Map(SEED_DRINKS.map((drink) => [drink.id, drink.aliases]));

export function seedToDrink(seed: SeedDrink, now: number): Drink {
  return {
    id: seed.id,
    name: seed.name,
    category: seed.category,
    abv: seed.abv,
    defaultVolumeMl: seed.defaultVolumeMl,
    defaultPrice: null,
    isCustom: false,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}
