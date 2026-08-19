export const SITE_NAME = 'The Smoke Trail';
export const SITE_TAGLINE = 'Licensed Amsterdam coffeeshops: where they are and when they are open';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/** L4: these strings must be visible on the map and on /about-data. */
export const TILE_ATTRIBUTION = '© OpenFreeMap · © OpenMapTiles';

/** L7: official harm-reduction information, not our own advice. */
export const HARM_REDUCTION_LINKS = [
  { label: 'Jellinek (addiction care, Amsterdam)', href: 'https://www.jellinek.nl' },
  { label: 'Trimbos Institute (national drugs monitor)', href: 'https://www.trimbos.nl' },
  { label: 'Drugs Info Team', href: 'https://www.drugsinfoteam.nl' },
];
