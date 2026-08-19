'use client';

import { useState } from 'react';

export interface Coordinates {
  lat: number;
  lng: number;
}

type Phase = 'idle' | 'asking' | 'granted' | 'denied' | 'unavailable';

/**
 * L6: the browser Geolocation API is used transiently. The coordinates stay in
 * component state, distances are computed on the device, and nothing is sent to
 * or stored on a server. Denial falls back to picking a neighbourhood (§F7).
 */
export function NearMe({
  position,
  onPosition,
  neighbourhoods,
  onNeighbourhood,
}: {
  position: Coordinates | null;
  onPosition: (coords: Coordinates | null) => void;
  neighbourhoods: { slug: string; name: string; count: number }[];
  onNeighbourhood: (name: string | null) => void;
}) {
  const [phase, setPhase] = useState<Phase>('idle');

  const request = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setPhase('unavailable');
      return;
    }
    setPhase('asking');
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPhase('granted');
        onPosition({ lat: result.coords.latitude, lng: result.coords.longitude });
      },
      () => setPhase('denied'),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  return (
    <div className="mt-3">
      {position ? (
        <div className="flex items-center justify-between rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm">
          <span className="text-[var(--color-muted)]">Sorting by distance from your location</span>
          <button
            type="button"
            className="underline"
            onClick={() => {
              onPosition(null);
              setPhase('idle');
            }}
          >
            Clear
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={request}
          disabled={phase === 'asking'}
          className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-3 text-sm font-medium disabled:opacity-60"
        >
          {phase === 'asking' ? 'Waiting for your browser…' : 'Find venues near me'}
        </button>
      )}

      {phase === 'idle' && !position && (
        <p className="mt-1.5 text-xs text-[var(--color-muted)]">
          Your location is used in this browser to sort the list. It is never sent to us.
        </p>
      )}

      {(phase === 'denied' || phase === 'unavailable') && (
        <div className="mt-2 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
          <p className="text-sm text-[var(--color-muted)]">
            {phase === 'denied'
              ? 'No problem — location access is off.'
              : 'This browser does not offer location access.'}{' '}
            Pick a neighbourhood instead:
          </p>
          <label className="sr-only" htmlFor="neighbourhood-picker">
            Neighbourhood
          </label>
          <select
            id="neighbourhood-picker"
            className="mt-2 w-full rounded border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2 py-2 text-sm"
            defaultValue=""
            onChange={(event) => onNeighbourhood(event.target.value || null)}
          >
            <option value="">All neighbourhoods</option>
            {neighbourhoods.map((entry) => (
              <option key={entry.slug} value={entry.name}>
                {entry.name} ({entry.count})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
