/**
 * Social accounts are read from each venue's own website — the one place the
 * venue itself publishes them. No third-party platform is queried and no
 * platform's terms are involved: we fetch a public page the venue put online
 * and read the links it chose to put there.
 */
export interface SocialProfile {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  x?: string;
  youtube?: string;
  email?: string;
}

export interface SiteCheck {
  /** HTTP status; 0 means the host never answered. */
  status: number;
  /** True when the page resolves and is a real page, not a parking placeholder. */
  live: boolean;
  socials: SocialProfile;
}

const PATTERNS: [keyof SocialProfile, RegExp][] = [
  ['instagram', /https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]{2,30})/g],
  ['facebook', /https?:\/\/(?:www\.|m\.)?facebook\.com\/([A-Za-z0-9.\-]{3,50})/g],
  ['tiktok', /https?:\/\/(?:www\.)?tiktok\.com\/@([A-Za-z0-9._]{2,30})/g],
  ['x', /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([A-Za-z0-9_]{2,30})/g],
  ['youtube', /https?:\/\/(?:www\.)?youtube\.com\/(?:@|c\/|channel\/|user\/)([A-Za-z0-9._\-]{2,40})/g],
];

/** Platform paths that are not anybody's handle. */
const RESERVED = new Set([
  'pages', 'explore', 'share', 'sharer', 'profile.php', 'tr', 'plugins', 'groups',
  'hashtag', 'p', 'reel', 'reels', 'stories', 'watch', 'events', 'login', 'help',
  'privacy', 'policies', 'about', 'legal', 'accounts', 'dialog', 'home', 'search',
  'intent', 'i', 'directory', 'sitemap',
]);

const PARKED =
  /domain (is )?(for sale|parked)|this domain is|godaddy|sedoparking|hugedomains|namecheap parking|under construction|coming soon|website expired/i;

export async function checkSite(url: string): Promise<SiteCheck> {
  let html = '';
  let status = 0;

  // No retries here, unlike the other sources: a liveness check wants the
  // status code the host actually returned, and re-asking a 404 four times
  // over only makes the run slower without changing the answer.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          process.env.ETL_USER_AGENT ?? 'the-smoke-trail/0.1 (+https://github.com/LeR08/dev)',
      },
    });
    status = response.status;
    html = await response.text();
  } catch {
    // The host never answered at all, which is not the same as answering 404.
    return { status: 0, live: false, socials: {} };
  } finally {
    clearTimeout(timer);
  }

  const live = status >= 200 && status < 400 && html.length > 900 && !PARKED.test(html.slice(0, 20_000));

  const socials: SocialProfile = {};
  for (const [network, pattern] of PATTERNS) {
    const counts = new Map<string, number>();
    for (const match of html.matchAll(pattern)) {
      const handle = match[1];
      if (!handle || RESERVED.has(handle.toLowerCase())) continue;
      counts.set(handle, (counts.get(handle) ?? 0) + 1);
    }
    // The most-repeated handle is the site's own; a single mention is noise.
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best) socials[network] = best[0];
  }

  const email = /mailto:([^"'?\s>]+@[^"'?\s>]+)/.exec(html)?.[1]?.toLowerCase();
  if (email && !/example\.|sentry|wixpress/.test(email)) socials.email = email;

  return { status, live, socials };
}

/**
 * A handle that appears on more than one venue's site belongs to the chain or
 * the operator, not to a single venue — The Bulldog's branches all point at one
 * Instagram account. Worth keeping, worth labelling honestly.
 */
export function markSharedHandles(
  bySlug: Record<string, SocialProfile>,
): Record<string, (keyof SocialProfile)[]> {
  const owners = new Map<string, string[]>();
  for (const [slug, socials] of Object.entries(bySlug)) {
    for (const [network, handle] of Object.entries(socials)) {
      const key = `${network}:${handle}`;
      owners.set(key, [...(owners.get(key) ?? []), slug]);
    }
  }

  const shared: Record<string, (keyof SocialProfile)[]> = {};
  for (const [slug, socials] of Object.entries(bySlug)) {
    const networks = (Object.entries(socials) as [keyof SocialProfile, string][])
      .filter(([network, handle]) => (owners.get(`${network}:${handle}`)?.length ?? 0) > 1)
      .map(([network]) => network);
    if (networks.length) shared[slug] = networks;
  }
  return shared;
}
