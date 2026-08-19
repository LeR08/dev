'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import { formatDistance, haversine } from '@/lib/geo';
import { amsterdamToday, openState, openStateAtLocal } from '@/lib/hours/core';
import { format, plural, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n';
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

const TOGGLES = [
  'openNow',
  'openLate',
  'terrace',
  'wheelchair',
  'highlyRated',
  'hasReviews',
  'includeClosed',
] as const;

function matchesFilters(venue: VenueIndexEntry, filters: FilterState, clock: Date): boolean {
  if (!filters.includeClosed && venue.status !== 'open') return false;
  if (filters.neighbourhood && venue.neighbourhood !== filters.neighbourhood) return false;
  if (filters.terrace && venue.amenities.terrace !== true) return false;
  if (filters.wheelchair && venue.amenities.wheelchair !== true) return false;
  if (filters.highlyRated && (venue.rating_avg ?? 0) < 4) return false;
  if (filters.hasReviews && venue.rating_count < 1) return false;
  if (filters.openNow && openState(venue, clock).kind !== 'open') return false;
  if (filters.openLate && openStateAtLocal(venue, amsterdamToday(23, 0, clock)).kind !== 'open') {
    return false;
  }
  return true;
}

export function Directory({
  venues,
  neighbourhoods,
  renderedAt,
  locale,
  dict,
}: {
  venues: VenueIndexEntry[];
  neighbourhoods: { slug: string; name: string; count: number }[];
  /** The instant the server rendered, so badges hydrate without a mismatch. */
  renderedAt: number;
  locale: Locale;
  dict: Dictionary;
}) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>('name');
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [pane, setPane] = useState<'list' | 'map'>('list');
  const [selected, setSelected] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Starts at the server's clock so hydration matches the delivered HTML, then
  // corrects to the visitor's own clock and ticks every minute.
  const [now, setNow] = useState<Date>(() => new Date(renderedAt));

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Restore shared state from the URL so a filtered view can be sent to someone.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = { ...EMPTY_FILTERS };
    for (const key of TOGGLES) if (params.get(key) === '1') next[key] = true;
    next.neighbourhood = params.get('neighbourhood');
    setFilters(next);
    const q = params.get('q');
    if (q) setQuery(q);
    const sortParam = params.get('sort');
    if (['rating', 'name', 'distance', 'updated'].includes(sortParam ?? '')) {
      setSort(sortParam as SortKey);
    }
  }, []);

  const syncUrl = useCallback((next: FilterState, nextQuery: string, nextSort: SortKey) => {
    const params = new URLSearchParams(window.location.search);
    for (const key of TOGGLES) {
      if (next[key]) params.set(key, '1');
      else params.delete(key);
    }
    if (next.neighbourhood) params.set('neighbourhood', next.neighbourhood);
    else params.delete('neighbourhood');
    if (nextQuery) params.set('q', nextQuery);
    else params.delete('q');
    if (nextSort !== 'name') params.set('sort', nextSort);
    else params.delete('sort');
    const search = params.toString();
    window.history.replaceState(null, '', search ? `?${search}` : window.location.pathname);
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(venues, {
        keys: [
          { name: 'name', weight: 3 },
          // The name on the door is what a visitor types, and it is often not
          // the name the licence is held under.
          { name: 'aliases', weight: 3 },
          { name: 'legal_name', weight: 2 },
          { name: 'address', weight: 1 },
          { name: 'neighbourhood', weight: 1 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [venues],
  );

  const searched = useMemo(
    () => (query.trim() ? fuse.search(query.trim()).map((hit) => hit.item) : venues),
    [query, fuse, venues],
  );

  const results = useMemo(() => {
    const withDistance = searched
      .filter((venue) => matchesFilters(venue, filters, now))
      .map((venue) => ({ venue, distance: position ? haversine(position, venue) : null }));

    withDistance.sort((a, b) => {
      if (sort === 'distance' && a.distance != null && b.distance != null) return a.distance - b.distance;
      if (sort === 'rating') return (b.venue.rating_avg ?? -1) - (a.venue.rating_avg ?? -1);
      if (sort === 'updated') {
        return (b.venue.hours_updated_at ?? '').localeCompare(a.venue.hours_updated_at ?? '');
      }
      return a.venue.name.localeCompare(b.venue.name, locale);
    });
    return withDistance;
  }, [searched, filters, sort, position, now, locale]);

  const activeFilterKeys = (Object.keys(filters) as (keyof FilterState)[]).filter((key) =>
    key === 'neighbourhood' ? filters.neighbourhood != null : filters[key] === true,
  );

  /**
   * §F2: an empty result proposes relaxing the *narrowest* filter — the one
   * whose removal brings back the most venues, measured rather than guessed.
   */
  const narrowestFilter = useMemo(() => {
    if (results.length > 0 || activeFilterKeys.length === 0) return null;
    let best: { key: keyof FilterState; gain: number } | null = null;
    for (const key of activeFilterKeys) {
      const relaxed: FilterState = { ...filters, [key]: key === 'neighbourhood' ? null : false };
      const gain = searched.filter((venue) => matchesFilters(venue, relaxed, now)).length;
      if (gain > 0 && (!best || gain > best.gain)) best = { key, gain };
    }
    return best;
  }, [results.length, activeFilterKeys, filters, searched, now]);

  const update = (patch: Partial<FilterState>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    syncUrl(next, query, sort);
  };

  const selectFromMap = (slug: string | null) => {
    setSelected(slug);
    if (!slug) return;
    listRef.current
      ?.querySelector(`[data-slug="${slug}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-6 lg:h-[calc(100dvh-8.5rem)] lg:pb-8">
      <div className="lg:grid lg:h-full lg:grid-cols-[minmax(370px,26rem)_1fr] lg:gap-5">
        <div className="flex min-h-0 flex-col">
          <div className="relative">
            <label htmlFor="venue-search" className="sr-only">
              {dict.search.label}
            </label>
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
              width="17"
              height="17"
              viewBox="0 0 18 18"
              aria-hidden
              focusable="false"
            >
              <circle cx="7.6" cy="7.6" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="m11.6 11.6 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              id="venue-search"
              type="search"
              value={query}
              placeholder={dict.search.placeholder}
              onChange={(event) => {
                setQuery(event.target.value);
                syncUrl(filters, event.target.value, sort);
              }}
              className="panel w-full py-3 pl-10 pr-3 text-base outline-none placeholder:text-[var(--color-muted)]"
            />
          </div>

          <NearMe
            dict={dict.nearMe}
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

          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={dict.filters.legend}>
            {TOGGLES.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={filters[key]}
                onClick={() => update({ [key]: !filters[key] } as Partial<FilterState>)}
                className={`chip ${filters[key] ? 'chip-on' : ''}`}
              >
                {dict.filters[key]}
              </button>
            ))}
            {filters.neighbourhood && (
              <button type="button" className="chip chip-on" onClick={() => update({ neighbourhood: null })}>
                {filters.neighbourhood}
                <span aria-hidden>×</span>
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[var(--color-muted)]">
            <p aria-live="polite">
              <span className="font-medium text-[var(--color-text)]">
                {plural(dict.list.count, results.length, locale)}
              </span>
              {filters.neighbourhood
                ? ` ${format(dict.list.inNeighbourhood, { name: filters.neighbourhood })}`
                : ''}
            </p>
            <label className="flex items-center gap-2">
              <span className="sr-only sm:not-sr-only">{dict.sort.label}</span>
              <select
                value={sort}
                onChange={(event) => {
                  const next = event.target.value as SortKey;
                  setSort(next);
                  syncUrl(filters, query, next);
                }}
                className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1.5 text-[var(--color-text)]"
              >
                <option value="name">{dict.sort.name}</option>
                <option value="rating">{dict.sort.rating}</option>
                <option value="distance" disabled={!position}>
                  {dict.sort.distance}
                </option>
                <option value="updated">{dict.sort.updated}</option>
              </select>
            </label>
          </div>

          <div
            className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-1 lg:hidden"
            role="group"
          >
            {(['list', 'map'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={pane === value}
                onClick={() => setPane(value)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pane === value
                    ? 'bg-[var(--color-surface-3)] text-[var(--color-text)]'
                    : 'text-[var(--color-muted)]'
                }`}
              >
                {dict.list[value]}
              </button>
            ))}
          </div>

          <ul
            ref={listRef}
            aria-label={dict.list.venues}
            className={`scroll-slim mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 ${
              pane === 'map' ? 'hidden lg:block' : ''
            }`}
          >
            {results.length === 0 && (
              <li className="rounded-xl border border-dashed border-[var(--color-line-strong)] p-8 text-center text-sm text-[var(--color-muted)]">
                <p>{dict.list.empty}</p>
                {narrowestFilter ? (
                  <button
                    type="button"
                    className="btn-quiet mt-4 px-3 py-2 text-[var(--color-text)]"
                    onClick={() =>
                      update(
                        narrowestFilter.key === 'neighbourhood'
                          ? { neighbourhood: null }
                          : ({ [narrowestFilter.key]: false } as Partial<FilterState>),
                      )
                    }
                  >
                    {format(dict.list.drop, {
                      label: dict.filters[narrowestFilter.key],
                      gain: narrowestFilter.gain,
                    })}
                  </button>
                ) : (
                  activeFilterKeys.length > 0 && (
                    <button
                      type="button"
                      className="btn-quiet mt-4 px-3 py-2 text-[var(--color-text)]"
                      onClick={() => update(EMPTY_FILTERS)}
                    >
                      {dict.list.clearAll}
                    </button>
                  )
                )}
              </li>
            )}

            {results.map(({ venue, distance }) => (
              <li key={venue.slug} data-slug={venue.slug}>
                <Link
                  href={`/${locale}/coffeeshop/${venue.slug}`}
                  onMouseEnter={() => setSelected(venue.slug)}
                  onFocus={() => setSelected(venue.slug)}
                  className={`card p-3.5 ${selected === venue.slug ? 'card-active' : ''}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">{venue.name}</span>
                    {distance != null && (
                      <span className="shrink-0 text-xs tabular-nums text-[var(--color-muted)]">
                        {formatDistance(distance)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-[var(--color-muted)]">
                    {venue.address}
                    {venue.neighbourhood ? ` · ${venue.neighbourhood}` : ''}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <OpenBadge venue={venue} dict={dict.badge} now={now} />
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
          className={`panel mt-4 h-[62dvh] overflow-hidden lg:mt-0 lg:h-full ${
            pane === 'list' ? 'hidden lg:block' : ''
          }`}
        >
          <MapView
            venues={results.map((entry) => entry.venue)}
            position={position}
            selected={selected}
            onSelect={selectFromMap}
            now={now}
            locale={locale}
            dict={dict}
          />
        </div>
      </div>
    </div>
  );
}
