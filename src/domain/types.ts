/**
 * Core domain types.
 *
 * These describe the shapes the app reasons about, independent of how they are
 * stored. The storage layer (src/db) maps rows onto these and nothing above it
 * needs to know whether SQLite or the web fallback is underneath.
 */

export const CATEGORIES = [
  'beer',
  'wine',
  'spirit',
  'cocktail',
  'cider',
  'aperitif',
  'liqueur',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  beer: 'Beer',
  wine: 'Wine',
  spirit: 'Spirit',
  cocktail: 'Cocktail',
  cider: 'Cider',
  aperitif: 'Aperitif',
  liqueur: 'Liqueur',
  other: 'Other',
};

/**
 * A drink the user can log. Catalog drinks ship with the app (`isCustom: false`,
 * stable slug ids); custom drinks are created by the user.
 */
export type Drink = {
  id: string;
  name: string;
  category: Category;
  /** Alcohol by volume, as a percentage (5 means 5%). */
  abv: number;
  /** Default serving size in millilitres. */
  defaultVolumeMl: number;
  /** Default price for one serving, in the user's currency. Null when unset. */
  defaultPrice: number | null;
  isCustom: boolean;
  /** Hidden from pickers but kept so old entries can still resolve their source. */
  archived: boolean;
  createdAt: number;
  updatedAt: number;
};

export type DrinkInput = {
  name: string;
  category: Category;
  abv: number;
  defaultVolumeMl: number;
  defaultPrice?: number | null;
};

/**
 * A logged consumption event.
 *
 * The drink's name/category/abv/volume are copied onto the entry at log time.
 * That denormalisation is deliberate: editing or deleting a drink preset later
 * must never silently rewrite history.
 */
export type Entry = {
  id: string;
  /** Source drink, if it still exists. History does not depend on it. */
  drinkId: string | null;
  name: string;
  category: Category;
  abv: number;
  /** Volume of a single serving, in millilitres. */
  volumeMl: number;
  /** Number of servings logged in this entry. */
  quantity: number;
  /** Total price paid for the whole entry, or null if not recorded. */
  price: number | null;
  /** Epoch milliseconds, local wall-clock time of consumption. */
  consumedAt: number;
  note: string | null;
  location: string | null;
  createdAt: number;
  updatedAt: number;
};

export type EntryInput = {
  drinkId: string | null;
  name: string;
  category: Category;
  abv: number;
  volumeMl: number;
  quantity: number;
  price?: number | null;
  consumedAt: number;
  note?: string | null;
  location?: string | null;
};

export type VolumeUnit = 'ml' | 'cl';

/** Which metric the dashboard uses when it says "how much". */
export type IntakeUnit = 'standardDrinks' | 'grams';

export type ThemeMode = 'system' | 'light' | 'dark';

export type AccentName = 'sage' | 'ocean' | 'plum' | 'amber' | 'clay';

/**
 * Optional personal goals. Both are opt-in and framed as the user's own choice,
 * never as a limit the app enforces.
 */
export type Goals = {
  /** Max intake per week, in the user's chosen intake unit. Null = not set. */
  weeklyIntake: number | null;
  /** Target number of alcohol-free days per week. Null = not set. */
  alcoholFreeDaysPerWeek: number | null;
};

export type Settings = {
  volumeUnit: VolumeUnit;
  intakeUnit: IntakeUnit;
  /** Grams of pure alcohol in one "standard drink". Varies by country. */
  standardDrinkGrams: number;
  currency: string;
  /** 0 = Sunday, 1 = Monday. */
  weekStartsOn: 0 | 1;
  themeMode: ThemeMode;
  accent: AccentName;
  goals: Goals;
  onboardingCompletedAt: number | null;
};

export const DEFAULT_SETTINGS: Settings = {
  volumeUnit: 'cl',
  intakeUnit: 'standardDrinks',
  standardDrinkGrams: 10,
  currency: 'EUR',
  weekStartsOn: 1,
  themeMode: 'system',
  accent: 'sage',
  goals: { weeklyIntake: null, alcoholFreeDaysPerWeek: null },
  onboardingCompletedAt: null,
};
