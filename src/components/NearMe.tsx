'use client';

import { useState } from 'react';
import type { Dictionary } from '@/i18n';

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
  dict,
  position,
  onPosition,
  neighbourhoods,
  onNeighbourhood,
}: {
  dict: Dictionary['nearMe'];
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
    <div className="mt-2.5">
      {position ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-accent)_40%,transparent)] bg-[var(--color-accent-soft)] px-3.5 py-2.5 text-sm">
          <span className="text-[var(--color-text)]">{dict.sorting}</span>
          <button
            type="button"
            className="shrink-0 text-[var(--color-muted)] underline underline-offset-4"
            onClick={() => {
              onPosition(null);
              setPhase('idle');
            }}
          >
            {dict.clear}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={request}
          disabled={phase === 'asking'}
          className="btn-quiet w-full px-3 py-3 text-sm font-medium disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden focusable="false">
            <circle cx="9" cy="9" r="2.4" fill="currentColor" />
            <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9 .8v2.4M9 14.8v2.4M.8 9h2.4M14.8 9h2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          {phase === 'asking' ? dict.waiting : dict.cta}
        </button>
      )}

      {phase === 'idle' && !position && (
        <p className="mt-1.5 px-1 text-xs leading-relaxed text-[var(--color-muted)]">{dict.note}</p>
      )}

      {(phase === 'denied' || phase === 'unavailable') && (
        <div className="panel mt-2 p-3.5">
          <p className="text-sm text-[var(--color-muted)]">
            {phase === 'denied' ? dict.denied : dict.unavailable} {dict.pick}
          </p>
          <label className="sr-only" htmlFor="neighbourhood-picker">
            {dict.neighbourhood}
          </label>
          <select
            id="neighbourhood-picker"
            className="mt-2 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-2 text-sm"
            defaultValue=""
            onChange={(event) => onNeighbourhood(event.target.value || null)}
          >
            <option value="">{dict.all}</option>
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
