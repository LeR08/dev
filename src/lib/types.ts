import { z } from 'zod';

/**
 * Provenance is a first-class field: §5.6 requires every displayed value to be
 * traceable to the source it came from, and §11 grades opening hours by trust.
 */
export const SourceId = z.enum(['amsterdam', 'osm', 'community', 'manual']);
export type SourceId = z.infer<typeof SourceId>;

export const HoursSource = z.enum(['community', 'osm', 'licence']);
export type HoursSource = z.infer<typeof HoursSource>;

export const VenueStatus = z.enum(['open', 'closed', 'renamed', 'pending']);
export type VenueStatus = z.infer<typeof VenueStatus>;

/** A single "HH:MM to HH:MM" block. `to` < `from` means it ends the next day. */
export const HoursInterval = z.object({
  from: z.string().regex(/^\d{2}:\d{2}$/),
  to: z.string().regex(/^\d{2}:\d{2}$/),
});
export type HoursInterval = z.infer<typeof HoursInterval>;

/** Index 0 = Sunday, matching JS `Date#getDay`. */
export const WeeklyHours = z.array(z.array(HoursInterval)).length(7);
export type WeeklyHours = z.infer<typeof WeeklyHours>;

export const Amenities = z.object({
  terrace: z.boolean().optional(),
  wheelchair: z.boolean().optional(),
  wifi: z.boolean().optional(),
  card_payment: z.boolean().optional(),
  toilet: z.boolean().optional(),
  air_conditioning: z.boolean().optional(),
  lounge: z.boolean().optional(),
  parking: z.boolean().optional(),
  drinks_snacks: z.boolean().optional(),
  /** OSM's `smoking` tag, stored verbatim; not shown as a chip. */
  smoking: z.string().optional(),
});
export type Amenities = z.infer<typeof Amenities>;

export const Venue = z.object({
  id: z.string(),
  slug: z.string(),
  city: z.string().default('amsterdam'),
  name: z.string(),
  legal_name: z.string().nullable().default(null),
  /**
   * Other names this venue trades under. The register records the licence
   * holder, which is often not the name on the door: Prinsengracht 480 is
   * registered as Superskunk and signed as Tops. Search matches all of them.
   */
  aliases: z.array(z.string()).default([]),
  address: z.string(),
  postcode: z.string().nullable().default(null),
  neighbourhood: z.string().nullable().default(null),
  lat: z.number(),
  lng: z.number(),
  status: VenueStatus.default('open'),
  renamed_to: z.string().nullable().default(null),
  licence_number: z.string().nullable().default(null),
  licence_valid_to: z.string().nullable().default(null),
  /**
   * The licence's end date has passed but the city still lists it as granted.
   * In this register that means a renewal in flight, not a closure — see
   * RENEWAL_GRACE_DAYS in the Amsterdam adapter.
   */
  licence_renewal_pending: z.boolean().default(false),
  website: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  amenities: Amenities.default({}),
  /** Outer bound permitted by the licence. Always displayed with a qualifier. */
  hours_licensed: WeeklyHours.nullable().default(null),
  /**
   * Concrete intervals for the week the snapshot covers, expanded by the ETL
   * from whichever tier won — including public-holiday rules. The browser reads
   * only this, which keeps the OSM-syntax evaluator out of the page bundle.
   */
  hours_weekly: WeeklyHours.nullable().default(null),
  /** OSM `opening_hours` syntax, evaluated with opening_hours.js. */
  hours_actual: z.string().nullable().default(null),
  hours_source: HoursSource.nullable().default(null),
  hours_updated_at: z.string().nullable().default(null),
  /**
   * A storefront photograph. Either street-level imagery under a licence that
   * permits re-serving, or one pinned by hand in overrides.json. Always carries
   * the credit its licence requires.
   */
  photo: z
    .object({
      source: z.string(),
      id: z.string().optional(),
      path: z.string(),
      credit: z.string(),
      captured_at: z.string().nullable().default(null),
      license: z.string(),
    })
    .nullable()
    .default(null),
  /**
   * Fields pinned by hand in data/overrides.json. No automated pass may write
   * these — §10 requires a manual correction to survive every later run.
   */
  override_fields: z.array(z.string()).default([]),
  /** Handles the venue publishes on its own website (§5.2 precedence: venue first). */
  socials: z.record(z.string()).default({}),
  /** Networks whose handle is a chain account shared with another venue. */
  socials_shared: z.array(z.string()).default([]),
  /** Whether the venue's own website answered on the last run. */
  website_live: z.boolean().nullable().default(null),
  osm_id: z.string().nullable().default(null),
  amsterdam_id: z.string().nullable().default(null),
  rating_avg: z.number().nullable().default(null),
  rating_count: z.number().int().default(0),
  sources: z.record(SourceId.or(z.string())).default({}),
  fetched_at: z.string(),
});
export type Venue = z.infer<typeof Venue>;

export const VenueSnapshot = z.object({
  generated_at: z.string(),
  city: z.string(),
  attribution: z.array(z.string()),
  venues: z.array(Venue),
});
export type VenueSnapshot = z.infer<typeof VenueSnapshot>;

/** A venue that OSM knows about but no licence backs — never auto-published (§5.6). */
export const PendingVenue = z.object({
  osm_id: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  address: z.string().nullable(),
  tags: z.record(z.string()),
  first_seen: z.string(),
});
export type PendingVenue = z.infer<typeof PendingVenue>;
