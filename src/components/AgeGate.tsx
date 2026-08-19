'use client';

import { useEffect, useState } from 'react';
import type { Dictionary } from '@/i18n';

const STORAGE_KEY = 'smoke-trail:age-confirmed';

/**
 * L1: an 18+ interstitial on first visit, persisted client-side. The page
 * underneath is still server-rendered, so the venue facts stay indexable and
 * the gate never becomes a cloaking device.
 */
export function AgeGate({ dict }: { dict: Dictionary['ageGate'] }) {
  const [confirmed, setConfirmed] = useState(true);

  useEffect(() => {
    setConfirmed(window.localStorage.getItem(STORAGE_KEY) === 'yes');
  }, []);

  if (confirmed) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/92 p-4 backdrop-blur-md"
    >
      <div className="panel w-full max-w-md p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
          18+
        </p>
        <h1 id="age-gate-title" className="mt-2 text-2xl font-semibold">
          {dict.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{dict.body}</p>
        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              window.localStorage.setItem(STORAGE_KEY, 'yes');
              setConfirmed(true);
            }}
            className="btn-accent flex-1 px-4 py-3"
          >
            {dict.confirm}
          </button>
          <a href="https://www.jellinek.nl" className="btn-quiet flex-1 px-4 py-3 text-center">
            {dict.leave}
          </a>
        </div>
        <p className="mt-4 text-xs text-[var(--color-muted)]">{dict.note}</p>
      </div>
    </div>
  );
}
