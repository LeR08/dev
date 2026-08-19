'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { isLocale, LOCALES, LOCALE_NAMES, type Locale } from '@/i18n/config';

const STORAGE_KEY = 'smoke-trail:locale';

/**
 * Swaps the locale segment in place, so switching language keeps you on the
 * same venue rather than dropping you at the front page. The choice is
 * remembered in this browser only — no cookie, nothing server-side.
 */
export function LanguagePicker({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const switchTo = (next: Locale) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    const segments = (pathname ?? `/${locale}`).split('/');
    if (isLocale(segments[1] ?? '')) segments[1] = next;
    else segments.splice(1, 0, next);
    setOpen(false);
    router.push(`${segments.join('/')}${window.location.search}`);
  };

  return (
    <div className="relative" ref={container}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden focusable="false">
          <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <ellipse cx="8" cy="8" rx="2.9" ry="6.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M1.9 6h12.2M1.9 10h12.2" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        <span className="uppercase">{locale}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="panel absolute right-0 top-full z-40 mt-1.5 w-44 overflow-hidden p-1"
        >
          {LOCALES.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={option === locale}
                onClick={() => switchTo(option)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-2)] ${
                  option === locale ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)]'
                }`}
              >
                {LOCALE_NAMES[option]}
                {option === locale && <span aria-hidden>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
