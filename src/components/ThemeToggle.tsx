'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'smoke-trail:theme';

/** Dark by default (§12); the choice lives in this browser only. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      document.documentElement.dataset.theme = stored;
    }
  }, []);

  return (
    <button
      type="button"
      className="rounded border border-[var(--color-line)] px-2 py-1 text-xs hover:text-[var(--color-text)]"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      onClick={() => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        document.documentElement.dataset.theme = next;
        window.localStorage.setItem(STORAGE_KEY, next);
      }}
    >
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}
