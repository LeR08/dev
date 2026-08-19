'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'smoke-trail:theme';

/** Dark by default (§12); the choice lives in this browser only. */
export function ThemeToggle({ toLight, toDark }: { toLight: string; toDark: string }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') setTheme(stored);
  }, []);

  return (
    <button
      type="button"
      aria-label={theme === 'dark' ? toLight : toDark}
      className="rounded-lg p-1.5 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
      onClick={() => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        document.documentElement.dataset.theme = next;
        window.localStorage.setItem(STORAGE_KEY, next);
      }}
    >
      {theme === 'dark' ? (
        <svg width="17" height="17" viewBox="0 0 20 20" aria-hidden focusable="false">
          <circle cx="10" cy="10" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M10 2.2v2M10 15.8v2M2.2 10h2M15.8 10h2M4.5 4.5l1.4 1.4M14.1 14.1l1.4 1.4M15.5 4.5l-1.4 1.4M5.9 14.1l-1.4 1.4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 20 20" aria-hidden focusable="false">
          <path
            d="M16.5 12.4A7 7 0 0 1 7.6 3.5a7 7 0 1 0 8.9 8.9Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
