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
export type WeightUnit = 'kg' | 'lb';
export type HeightUnit = 'cm' | 'in';

/** Which metric the dashboard uses when it says "how much". */
export type IntakeUnit = 'standardDrinks' | 'grams';

export type ThemeMode = 'system' | 'light' | 'dark';

export type AccentName = 'sage' | 'ocean' | 'plum' | 'amber' | 'clay' | 'indigo';

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

/**
 * In-app language, independent of the OS/store locale used for the display
 * name (spec v1.2 §3.2). Deliberately a curated set — major European
 * languages plus Chinese and Arabic — rather than every locale, so each one
 * can be a real, complete translation instead of a placeholder.
 */
export const LANGUAGES = ['en', 'fr', 'es', 'de', 'it', 'pt', 'zh', 'ar'] as const;
export type LanguageCode = (typeof LANGUAGES)[number];

/** Languages read right-to-left — affects only inline text runs; see LanguagePill/i18n notes on RTL scope. */
export const RTL_LANGUAGES: readonly LanguageCode[] = ['ar'];

/**
 * Country used to pick which help/resources content to show (spec v1.2 §8).
 * Deliberately a small, curated list rather than every ISO country — each
 * entry needs a matching resources JSON file with real, verified contacts.
 */
export const RESOURCE_COUNTRIES = ['FR', 'US', 'GB', 'ES', 'DE', 'IT', 'PT', 'CN', 'OTHER'] as const;
export type ResourceCountry = (typeof RESOURCE_COUNTRIES)[number];

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
  /**
   * When the interactive first-run tutorial (app/tutorial.tsx) was finished or
   * skipped. Null means it hasn't been seen, which is what routes the user
   * there once, right after onboarding. Settings → "Revoir le tutoriel" resets
   * it to null to replay it on demand.
   */
  tutorialCompletedAt: number | null;
  /** In-app language (spec v1.2 §3.2) — independent of the OS locale. */
  language: LanguageCode;
  /** Which country's help & resources content to show (spec v1.2 §8.1). */
  resourceCountry: ResourceCountry;
  /** Display unit for the profile's weight field (used by the BAC estimate). */
  weightUnit: WeightUnit;
  /** Display unit for the profile's height field (stats only, spec v1.2 §4.1). */
  heightUnit: HeightUnit;
  /** Premium state. No payment flow exists yet — see the Subscription docs below. */
  subscription: Subscription;
  /** Null when using the app fully locally, with no account — the default, and always available (spec v2.0). */
  account: Account | null;
};

/**
 * Bookkeeping for the optional cloud account (spec v2.0). Firebase Auth
 * itself is the source of truth for "am I signed in" (see src/sync/auth.ts);
 * this only tracks what this device needs to sync sensibly — whether it's
 * already uploaded its pre-existing local data for this uid (so that only
 * happens once, not on every app launch) and when it last synced.
 */
export type Account = {
  uid: string;
  email: string | null;
  /** Null until this device's first post-sign-in migration/merge completes for this uid. */
  migratedAt: number | null;
  lastSyncedAt: number | null;
};

export type SubscriptionStatus = 'free' | 'active';

/**
 * Premium state. There is no payment processing anywhere in the app right now
 * — Settings → Subscription is a preview of what the offer would look like,
 * with inert buttons (see app/settings/subscription.tsx). So nothing flips
 * this to 'active' today; it stays here because the launch interstitial is
 * still gated on it, and so re-introducing a real purchase later is a matter
 * of setting this field rather than re-threading it through the app.
 */
export type Subscription = {
  status: SubscriptionStatus;
  activatedAt: number | null;
};

export const DEFAULT_SUBSCRIPTION: Subscription = {
  status: 'free',
  activatedAt: null,
};

export const DEFAULT_SETTINGS: Settings = {
  volumeUnit: 'cl',
  intakeUnit: 'standardDrinks',
  standardDrinkGrams: 10,
  currency: 'EUR',
  weekStartsOn: 1,
  themeMode: 'system',
  accent: 'indigo',
  goals: { weeklyIntake: null, alcoholFreeDaysPerWeek: null },
  onboardingCompletedAt: null,
  tutorialCompletedAt: null,
  language: 'en',
  resourceCountry: 'OTHER',
  weightUnit: 'kg',
  heightUnit: 'cm',
  subscription: DEFAULT_SUBSCRIPTION,
  account: null,
};

/** Biological sex as used by the Widmark BAC formula. Never guessed or defaulted. */
export type BiologicalSex = 'male' | 'female' | 'unspecified';

export const REASON_KEYS = ['sevrage', 'financial', 'curiosity', 'medical', 'other'] as const;
export type ReasonKey = (typeof REASON_KEYS)[number];

export type SpendPeriod = 'day' | 'week';

/**
 * The onboarding profile (spec v1.2 §4).
 *
 * Per §4.4 this is *identified, non-anonymous* data by product decision, but it
 * is still local-only: no account, no server, no sync in this version. It
 * lives in the same on-device Store as everything else.
 *
 * Language, country and currency are deliberately NOT duplicated here even
 * though the spec's §11 table lists them on both Profile and a separate
 * "SettingsExtras" entity — those already have one home in `Settings`
 * (currency did even before v1.2), and giving them a second copy on Profile
 * would create exactly the two-sources-of-truth risk the v1.1 architecture
 * notes warn against. Settings stays the single source for all of them.
 */
export type Profile = {
  /**
   * Both of these sync. The profile document is pushed to Firestore whole
   * (see src/sync/firestore.ts's pushOps), so name and email leave the device
   * with the rest of it — the comments here used to claim the opposite, which
   * was true only before cloud sync existed.
   */
  name: string | null;
  /** Pre-filled from the account's own email at onboarding; editable after. */
  email: string | null;
  sex: BiologicalSex;
  /** Null when skipped. 13–120 when set; the app never invents a value. */
  age: number | null;
  /** Null when skipped. */
  weightKg: number | null;
  /** Null when skipped — optional per spec, stats-only, never used for BAC. */
  heightCm: number | null;
  /** Daily spend before the user started tracking, normalized from spendPeriod. Null if skipped. */
  spendBeforeTrackingPerDay: number | null;
  /** The period the user actually entered the figure in — kept so the settings screen can round-trip it. */
  spendPeriod: SpendPeriod;
  reasons: ReasonKey[];
  /** Free text for the "Autre" reason. */
  otherReason: string | null;
  createdAt: number;
  updatedAt: number;
};

export const EMPTY_PROFILE: Profile = {
  name: null,
  email: null,
  sex: 'unspecified',
  age: null,
  weightKg: null,
  heightCm: null,
  spendBeforeTrackingPerDay: null,
  spendPeriod: 'week',
  reasons: [],
  otherReason: null,
  createdAt: 0,
  updatedAt: 0,
};

export const TICKET_TYPES = ['bug', 'suggestion'] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export const TICKET_STATUSES = ['open', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/**
 * A locally-logged bug report or suggestion (spec v1.2 §9).
 *
 * v1.2 is local-only: nothing here is transmitted anywhere. The export screen
 * can write these out to JSON/CSV so they can be reviewed on a computer.
 */
export type Ticket = {
  id: string;
  type: TicketType;
  title: string;
  description: string;
  /** file:// URI of an attached screenshot, if any. */
  screenshotUri: string | null;
  appVersion: string;
  platform: string;
  status: TicketStatus;
  createdAt: number;
  updatedAt: number;
};

export type TicketInput = {
  type: TicketType;
  title: string;
  description: string;
  screenshotUri?: string | null;
  appVersion: string;
  platform: string;
};
