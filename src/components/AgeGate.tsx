'use client';

import { useEffect, useState } from 'react';
import { SITE_NAME } from '@/lib/site';

const STORAGE_KEY = 'smoke-trail:age-confirmed';

/**
 * L1: an 18+ interstitial on first visit, persisted client-side. The page
 * underneath is still server-rendered, so the venue facts stay indexable and
 * the gate never becomes a cloaking device.
 */
export function AgeGate() {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/95 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
        <h1 id="age-gate-title" className="text-xl font-semibold">
          You must be 18 or over
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
          {SITE_NAME} is an informational directory of licensed coffeeshops in Amsterdam. Dutch law
          restricts access to these venues to adults aged 18 and over. This site lists no products
          and no prices.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              window.localStorage.setItem(STORAGE_KEY, 'yes');
              setConfirmed(true);
            }}
            className="flex-1 rounded-md bg-[var(--color-accent)] px-4 py-3 font-medium text-[var(--color-on-accent)]"
          >
            I am 18 or over
          </button>
          <a
            href="https://www.jellinek.nl"
            className="flex-1 rounded-md border border-[var(--color-line)] px-4 py-3 text-center font-medium"
          >
            Leave this site
          </a>
        </div>
        <p className="mt-4 text-xs text-[var(--color-muted)]">
          Your choice is stored in this browser only. Nothing is sent to a server.
        </p>
      </div>
    </div>
  );
}
