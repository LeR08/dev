'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { formatDistance, haversine } from '@/lib/geo';
import { amsterdamToday, openState, openStateAtLocal } from '@/lib/hours/core';
import type { VenueIndexEntry } from '@/lib/venues';
import { OpenBadge } from '@/components/OpenBadge';
import { NearMe } from '@/components/NearMe';
import type { Coordinates } from '@/components/NearMe';

/**
 * The map is a lazy chunk: the list renders and is usable before any tile
 * request goes out, which is both the performance budget (§8) and the
 * keyboard-accessible alternative to the map (WCAG 2.1 AA).
 */
const MapView = dynamic(() => import('@/components/MapView').then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" aria-hidden />,
});

export type SortKey = 'distance' | 'rating' | 'name' | 'updated';

export interface FilterState {
  openNow: boolean;
  openLate: boolean;
  terrace: boolean;
  wheelchair: boolean;
  highlyRated: boolean;
  hasReviews: boolean;
  neighbourhood: string | null;
  includeClosed: boolean;
}

const EMPTY_FILTERS: FilterState = {
  openNow: false,
  openLate: false,
  terrace: false,
  wheelchair: false,
  highlyRated: false,
  hasReviews: false,
  neighbourhood: null,
  includeClosed: false,
};

const FILTER_LABELS: Record<keyof FilterState, string> = {
  openNow: 'Open now',
  openLate: 'Open after 23:00',
  terrace: 'Terrace',
  wheelchair: 'Wheelchair access',
  highlyRated: 'Rated 4+',
  hasReviews: 'Has reviews',
  neighbourhood: 'Neighbourhood',
  includeClosed: 'Include closed',
};

export function Directory({
  venues,
  neighbourhoods,
  renderedAt,
}: {
  venues: VenueIndexEntry[];
  neighbourhoods: { slug: string; name: string; count: number }[];
  /** The instant the server rendered, so badges hydrate without a mismatch. */
  renderedAt: number;
}) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>('name');
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [pane, setPane] = useState<'list' | 'map'>('list');
  const [selected, setSelected] = useState<string | null>(null);
  // Starts at the server's clock so hydration matches the delivered HTML, then
  // corrects to the visitor's own clock and ticks every minute. The page is
  // revalidated hourly, so the delivered badge can be up to an hour stale — the
  // effect below fixes that on the first frame after hydration.
  const [now, setNow] = useState<Date>(() => new Date(renderedAt));

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Restore shared state from the URL without pulling in the router on mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = { ...EMPTY_FILTERS };
    for (const key of Object.keys(EMPTY_FILTERS) as (keyof FilterState)[]) {
      if (key === 'neighbourhood') continue;
      if (params.get(key) === '1') (next[key] as boolean) = true;
    }
    next.neighbourhood = params.get('neighbourhood');
    setFilters(next);
    const q = params.get('q');
    if (q) setQuery(q);
    const sortParam = params.get('sort');
    if (sortParam === 'rating' || sortParam === 'name' || sortParam === 'distance') setSort(sortParam);
  }, []);

  const syncUrl = useCallback((next: FilterState, nextQuery: string, nextSort: SortKey) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value === true) params.set(key, '1');
      else if (typeof value === 'string' && value) params.set(key, value);
    }
    if (nextQuery) params.set('q', nextQuery);
    if (nextSort !== 'name') params.set('sort', nextSort);
    const url = params.toString() ? `?${params}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(venues, {
        keys: [
          { name: 'name', weight: 3 },
          { name: 'legal_name', weight: 2 },
          { name: 'address', weight: 1 },
          { name: 'neighbourhood', weight: 1 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [venues],
  );

  const results = useMemo(() => {
    const searched = query.trim() ? fuse.search(query.trim()).map((hit) => hit.item) : venues;
    const clock = now;
    const lateClock = amsterdamToday(23, 0, clock);

    const filtered = searched.filter((venue) => {
      if (!filters.includeClosed && venue.status !== 'open') return false;
      if (filters.neighbourhood && venue.neighbourhood !== filters.neighbourhood) return false;
      if (filters.terrace && venue.amenities.terrace !== true) return false;
      if (filters.wheelchair && venue.amenities.wheelchair !== true) return false;
      if (filters.highlyRated && (venue.rating_avg ?? 0) < 4) return false;
      if (filters.hasReviews && venue.rating_count < 1) return false;
      if (filters.openNow && openState(venue, clock).kind !== 'open') return false;
      if (filters.openLate && openStateAtLocal(venue, lateClock).kind !== 'open') {
        return false;
      }
      return true;
    });

    const withDistance = filtered.map((venue) => ({
      venue,
      distance: position ? haversine(position, venue) : null,
    }));

    withDistance.sort((a, b) => {
      if (sort === 'distance' && a.distance != null && b.distance != null) return a.distance - b.distance;
      if (sort === 'rating') return (b.venue.rating_avg ?? -1) - (a.venue.rating_avg ?? -1);
      if (sort === 'updated') {
        return (b.venue.hours_updated_at ?? '').localeCompare(a.venue.hours_updated_at ?? '');
      }
      return a.venue.name.localeCompare(b.venue.name, 'nl');
    });
    return withDistance;
  }, [venues, query, filters, sort, position, now, fuse]);

  const activeFilterKeys = (Object.keys(filters) as (keyof FilterState)[]).filter((key) =>
    key === 'neighbourhood' ? filters.neighbourhood != null : filters[key] === true,
  );

  const update = (patch: Partial<FilterState>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    syncUrl(next, query, sort);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 lg:h-[calc(100dvh-8rem)] lg:py-6">
      <div className="lg:grid lg:h-full lg:grid-cols-[minmax(360px,420px)_1fr] lg:gap-6">
        <div className="flex min-h-0 flex-col">
          <label htmlFor="venue-search" className="sr-only">
            Search coffeeshops by name, street or neighbourhood
          </label>
          <input
            id="venue-search"
            type="search"
            value={query}
            placeholder="Search by name, street or neighbourhood"
            onChange={(event) => {
              setQuery(event.target.value);
              syncUrl(filters, event.target.value, sort);
            }}
            className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-3 text-base"
          />

          <NearMe
            position={position}
            onPosition={(coords) => {
              setPosition(coords);
              if (coords) {
                setSort('distance');
                syncUrl(filters, query, 'distance');
              }
            }}
            neighbourhoods={neighbourhoods}
            onNeighbourhood={(name) => update({ neighbourhood: name })}
          />

          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filters">
            {(['openNow', 'openLate', 'terrace', 'wheelchair', 'highlyRated', 'hasReviews', 'includeClosed'] as const).map(
              (key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filters[key]}
                  onClick={() => update({ [key]: !filters[key] } as Partial<FilterState>)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    filters[key]
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-text)]'
                      : 'border-[var(--color-line)] text-[var(--color-muted)]'
                  }`}
                >
                  {FILTER_LABELS[key]}
                </button>
              ),
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[var(--color-muted)]">
            <p aria-live="polite">
              {results.length} {results.length === 1 ? 'venue' : 'venues'}
              {filters.neighbourhood ? ` in ${filters.neighbourhood}` : ''}
            </p>
            <label className="flex items-center gap-2">
              <span>Sort</span>
              <select
                value={sort}
                onChange={(event) => {
                  const next = event.target.value as SortKey;
                  setSort(next);
                  syncUrl(filters, query, next);
                }}
                className="rounded border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1"
              >
                <option value="name">Name</option>
                <option value="rating">Rating</option>
                <option value="distance" disabled={!position}>
                  Distance
                </option>
                <option value="updated">Recently updated</option>
              </select>
            </label>
          </div>

          <div className="mt-2 flex gap-2 lg:hidden">
            {(['list', 'map'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={pane === value}
                onClick={() => setPane(value)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm capitalize ${
                  pane === value ? 'border-[var(--color-accent)]' : 'border-[var(--color-line)] text-[var(--color-muted)]'
                }`}
              >
                {value}
              </button>
            ))}
          </div>

          <ul
            aria-label="Venues"
            className={`mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 ${pane === 'map' ? 'hidden lg:block' : ''}`}
          >
            {results.length === 0 && (
              <li className="rounded-md border border-dashed border-[var(--color-line)] p-6 text-center text-sm text-[var(--color-muted)]">
                <p>No venues match all of these filters.</p>
                {activeFilterKeys.length > 0 && (
                  <button
                    type="button"
                    className="mt-3 rounded border border-[var(--color-line)] px-3 py-1.5 text-[var(--color-text)]"
                    onClick={() => {
                      const narrowest = activeFilterKeys[activeFilterKeys.length - 1];
                      update(
                        narrowest === 'neighbourhood'
                          ? { neighbourhood: null }
                          : ({ [narrowest]: false } as Partial<FilterState>),
                      );
                    }}
                  >
                    Drop “{FILTER_LABELS[activeFilterKeys[activeFilterKeys.length - 1]]}”
                  </button>
                )}
              </li>
            )}

            {results.map(({ venue, distance }) => (
              <li key={venue.slug}>
                <Link
                  href={`/coffeeshop/${venue.slug}`}
                  onMouseEnter={() => setSelected(venue.slug)}
                  onFocus={() => setSelected(venue.slug)}
                  className={`block rounded-md border p-3 transition-colors ${
                    selected === venue.slug
                      ? 'border-[var(--color-accent)] bg-[var(--color-surface-2)]'
                      : 'border-[var(--color-line)] bg-[var(--color-surface)]'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{venue.name}</span>
                    {distance != null && (
                      <span className="shrink-0 text-xs text-[var(--color-muted)]">
                        {formatDistance(distance)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                    {venue.address}
                    {venue.neighbourhood ? ` · ${venue.neighbourhood}` : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <OpenBadge venue={venue} now={now} />
                    {venue.rating_count > 0 && (
                      <span className="text-xs text-[var(--color-muted)]">
                        {venue.rating_avg?.toFixed(1)} ★ ({venue.rating_count})
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div
          className={`mt-4 h-[60dvh] overflow-hidden rounded-lg border border-[var(--color-line)] lg:mt-0 lg:h-full ${
            pane === 'list' ? 'hidden lg:block' : ''
          }`}
        >
          <MapView
            venues={results.map((entry) => entry.venue)}
            position={position}
            selected={selected}
            onSelect={setSelected}
            now={now}
          />
        </div>
      </div>
    </div>
  );
}
