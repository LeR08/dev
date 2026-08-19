'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { badgeLabel, openState } from '@/lib/hours/core';
import { formatDistance, haversine } from '@/lib/geo';
import type { VenueIndexEntry } from '@/lib/venues';
import type { Coordinates } from '@/components/NearMe';

/** OpenFreeMap: no API key, no usage cap, no billing account (§5.4). */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const AMSTERDAM_CENTRE: [number, number] = [4.895, 52.371];

const STATE_COLOURS: Record<string, string> = {
  open: '#3fbf8f',
  soon: '#e8b64c',
  closed: '#8b939c',
  unknown: '#6f7780',
};

export function MapView({
  venues,
  position,
  selected,
  onSelect,
  now,
}: {
  venues: VenueIndexEntry[];
  position: Coordinates | null;
  selected: string | null;
  onSelect: (slug: string | null) => void;
  now: Date;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
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
      zoom: Number.isFinite(zoom) && zoom ? zoom : 12.5,
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

    instance.on('error', (event) => {
      if (String(event.error?.message ?? '').includes('style')) setFailed(true);
    });

    instance.on('load', () => {
      instance.addSource('venues', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: 48,
        // §F1: clustering below zoom 14, individual pins above it.
        clusterMaxZoom: 13,
      });

      instance.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'venues',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#1e2227',
          'circle-stroke-color': '#ff5a3c',
          'circle-stroke-width': 1.5,
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 30, 28],
        },
      });
      instance.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'venues',
        filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 },
        paint: { 'text-color': '#e9ecef' },
      });
      instance.addLayer({
        id: 'venue-pins',
        type: 'circle',
        source: 'venues',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['case', ['boolean', ['get', 'isSelected'], false], 10, 7],
          'circle-color': ['get', 'colour'],
          'circle-stroke-color': '#0d0f11',
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
      instance.remove();
      map.current = null;
    };
  }, [onSelect]);

  useEffect(() => {
    if (!ready || !map.current) return;
    const source = map.current.getSource('venues') as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    const clock = now;
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
              ? '#8b939c'
              : STATE_COLOURS[badgeLabel(openState(venue, clock)).tone] ?? '#8b939c',
        },
      })),
    });
  }, [venues, selected, ready, now]);

  const preview = selected ? venues.find((venue) => venue.slug === selected) : null;

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--color-muted)]">
        The map could not load. The list beside it has every venue.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={container} className="h-full w-full" aria-hidden />
      {!ready && <div className="skeleton absolute inset-0" aria-hidden />}

      {preview && (
        <div className="absolute inset-x-2 bottom-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-3 shadow-lg sm:inset-x-auto sm:left-2 sm:w-80">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{preview.name}</p>
              <p className="text-sm text-[var(--color-muted)]">{preview.address}</p>
            </div>
            <button
              type="button"
              aria-label="Close preview"
              onClick={() => onSelect(null)}
              className="text-[var(--color-muted)]"
            >
              ✕
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
            {position && <span>{formatDistance(haversine(position, preview))} away</span>}
            {preview.rating_count > 0 && (
              <span>
                {preview.rating_avg?.toFixed(1)} ★ ({preview.rating_count})
              </span>
            )}
          </div>
          <Link
            href={`/coffeeshop/${preview.slug}`}
            className="mt-3 block rounded-md bg-[var(--color-accent)] px-3 py-2 text-center text-sm font-medium text-[var(--color-on-accent)]"
          >
            Details
          </Link>
        </div>
      )}
    </div>
  );
}
