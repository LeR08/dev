'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { badgeDescriptor, openState } from '@/lib/hours/core';
import { formatDistance, haversine } from '@/lib/geo';
import { format, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n';
import type { VenueIndexEntry } from '@/lib/venues';
import type { Coordinates } from '@/components/NearMe';
import { OpenBadge } from '@/components/OpenBadge';

/** OpenFreeMap: no API key, no usage cap, no billing account (§5.4). */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const AMSTERDAM_CENTRE: [number, number] = [4.895, 52.371];

/**
 * Street level rather than city level. At 14 the clusters have already broken
 * apart into individual pins, which is what someone opening the map on a phone
 * in the centre actually wants to see.
 */
const DEFAULT_ZOOM = 14.2;
/** Where "near me" drops you: close enough to read the street names. */
const LOCATED_ZOOM = 15.4;

const STATE_COLOURS: Record<string, string> = {
  open: '#45c98f',
  soon: '#edb84a',
  closed: '#8b939c',
  unknown: '#6f7780',
};

export function MapView({
  venues,
  position,
  selected,
  onSelect,
  now,
  locale,
  dict,
}: {
  venues: VenueIndexEntry[];
  position: Coordinates | null;
  selected: string | null;
  onSelect: (slug: string | null) => void;
  now: Date;
  locale: Locale;
  dict: Dictionary;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const youAreHere = useRef<maplibregl.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!container.current || map.current) return;

    const params = new URLSearchParams(window.location.search);
    const lat = Number(params.get('lat'));
    const lng = Number(params.get('lng'));
    const zoom = Number(params.get('z'));

    const instance = new maplibregl.Map({
      container: container.current,
      style: STYLE_URL,
      center: Number.isFinite(lat) && Number.isFinite(lng) && lat && lng ? [lng, lat] : AMSTERDAM_CENTRE,
      zoom: Number.isFinite(zoom) && zoom ? zoom : DEFAULT_ZOOM,
      attributionControl: false,
    });
    map.current = instance;

    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    // L4: the licence and OSM notices stay on the map itself, not only on /about-data.
    instance.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: [
          'Contains data from Gemeente Amsterdam (CC BY 4.0)',
          '© OpenStreetMap contributors (ODbL)',
        ],
      }),
    );

    // Any error before the style has loaded means no basemap will appear. The
    // list is the answer in that case, so say so rather than showing an empty
    // grey rectangle — §12 requires a real error state, not a blank one.
    //
    // Aborts are the exception: tearing the map down cancels its in-flight tile
    // requests, and in development React mounts every effect twice, so a healthy
    // map reports a handful of them on the way out. They say nothing about
    // whether the basemap works.
    let loaded = false;
    let disposed = false;
    const isAbort = (error: unknown) =>
      error instanceof Error && (error.name === 'AbortError' || /abort/i.test(error.message));

    instance.on('error', (event) => {
      if (disposed || isAbort(event.error)) return;
      if (!loaded) setFailed(true);
    });
    const styleTimeout = setTimeout(() => {
      if (!loaded && !disposed) setFailed(true);
    }, 15_000);

    instance.on('load', () => {
      instance.addSource('venues', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: 44,
        // §F1: clustering below zoom 14, individual pins above it.
        clusterMaxZoom: 13,
      });

      instance.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'venues',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#14171c',
          'circle-opacity': 0.92,
          'circle-stroke-color': '#ff6a45',
          'circle-stroke-width': 1.5,
          'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 30, 26],
        },
      });
      instance.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'venues',
        filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 },
        paint: { 'text-color': '#eef1f5' },
      });

      // A soft halo under the selected pin, so the map echoes the list.
      instance.addLayer({
        id: 'venue-halo',
        type: 'circle',
        source: 'venues',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'isSelected'], true]],
        paint: {
          'circle-radius': 17,
          'circle-color': '#ff6a45',
          'circle-opacity': 0.22,
        },
      });
      instance.addLayer({
        id: 'venue-pins',
        type: 'circle',
        source: 'venues',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['case', ['boolean', ['get', 'isSelected'], false], 9, 6.5],
          'circle-color': ['get', 'colour'],
          'circle-stroke-color': '#0b0d10',
          'circle-stroke-width': 2,
        },
      });

      instance.on('click', 'clusters', (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const source = instance.getSource('venues') as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(feature.properties.cluster_id as number).then((zoom) => {
          instance.easeTo({
            center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
            zoom,
          });
        });
      });

      instance.on('click', 'venue-pins', (event) => {
        const slug = event.features?.[0]?.properties?.slug;
        if (typeof slug === 'string') onSelect(slug);
      });

      for (const layer of ['clusters', 'venue-pins']) {
        instance.on('mouseenter', layer, () => {
          instance.getCanvas().style.cursor = 'pointer';
        });
        instance.on('mouseleave', layer, () => {
          instance.getCanvas().style.cursor = '';
        });
      }

      loaded = true;
      clearTimeout(styleTimeout);
      setReady(true);
    });

    // §F1: the viewport lives in the URL so a view can be shared.
    instance.on('moveend', () => {
      const centre = instance.getCenter();
      const url = new URL(window.location.href);
      url.searchParams.set('lat', centre.lat.toFixed(5));
      url.searchParams.set('lng', centre.lng.toFixed(5));
      url.searchParams.set('z', instance.getZoom().toFixed(1));
      window.history.replaceState(null, '', url);
    });

    return () => {
      disposed = true;
      clearTimeout(styleTimeout);
      try {
        instance.remove();
      } catch {
        // Removing a map mid-request throws once the aborted fetches settle.
        // The instance is gone either way; there is nothing to recover.
      }
      map.current = null;
    };
  }, [onSelect]);

  useEffect(() => {
    if (!ready || !map.current) return;
    const source = map.current.getSource('venues') as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData({
      type: 'FeatureCollection',
      features: venues.map((venue) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [venue.lng, venue.lat] },
        properties: {
          slug: venue.slug,
          name: venue.name,
          isSelected: venue.slug === selected,
          colour:
            venue.status !== 'open'
              ? STATE_COLOURS.closed
              : STATE_COLOURS[badgeDescriptor(openState(venue, now)).tone] ?? STATE_COLOURS.closed,
        },
      })),
    });
  }, [venues, selected, ready, now]);

  // L6: the marker is drawn from state the browser already holds; the position
  // is never sent anywhere.
  useEffect(() => {
    if (!ready || !map.current) return;
    youAreHere.current?.remove();
    youAreHere.current = null;
    if (!position) return;

    const dot = document.createElement('div');
    dot.style.cssText =
      'width:14px;height:14px;border-radius:999px;background:#3b82f6;box-shadow:0 0 0 4px rgb(59 130 246 / 0.25),0 0 0 1.5px #fff';
    youAreHere.current = new maplibregl.Marker({ element: dot })
      .setLngLat([position.lng, position.lat])
      .addTo(map.current);
    map.current.easeTo({ center: [position.lng, position.lat], zoom: LOCATED_ZOOM });
  }, [position, ready]);

  // Keep the map on the venue the list is pointing at.
  useEffect(() => {
    if (!ready || !map.current || !selected) return;
    const venue = venues.find((entry) => entry.slug === selected);
    if (!venue) return;
    const bounds = map.current.getBounds();
    if (!bounds.contains([venue.lng, venue.lat])) {
      map.current.easeTo({ center: [venue.lng, venue.lat], duration: 400 });
    }
  }, [selected, ready, venues]);

  const preview = selected ? venues.find((venue) => venue.slug === selected) : null;

  if (failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden focusable="false" className="text-[var(--color-muted)]">
          <path
            d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M9 4v13.5M15 6.5V20" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        <p className="max-w-xs text-sm text-[var(--color-muted)]">{dict.list.mapFailed}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={container} className="h-full w-full" aria-hidden />
      {!ready && <div className="skeleton absolute inset-0" aria-hidden />}

      {preview && (
        <div className="panel absolute inset-x-3 bottom-3 p-3.5 shadow-[var(--shadow-lift)] sm:inset-x-auto sm:left-3 sm:w-80">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{preview.name}</p>
              <p className="truncate text-sm text-[var(--color-muted)]">{preview.address}</p>
            </div>
            <button
              type="button"
              aria-label={dict.list.closePreview}
              onClick={() => onSelect(null)}
              className="-mr-1 -mt-1 rounded-lg p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden focusable="false">
                <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
            <OpenBadge venue={preview} dict={dict.badge} now={now} />
            {position && <span>{format(dict.list.away, { distance: formatDistance(haversine(position, preview)) })}</span>}
            {preview.rating_count > 0 && (
              <span>
                {preview.rating_avg?.toFixed(1)} ★ ({preview.rating_count})
              </span>
            )}
          </div>
          <Link
            href={`/${locale}/coffeeshop/${preview.slug}`}
            className="btn-accent mt-3 w-full px-3 py-2 text-sm"
          >
            {dict.list.details}
          </Link>
        </div>
      )}
    </div>
  );
}
