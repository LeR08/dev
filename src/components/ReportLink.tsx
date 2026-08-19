'use client';

import { useState } from 'react';
import { format } from '@/i18n/config';
import type { Dictionary } from '@/i18n';

/**
 * §F8: reporting needs no account. The write path lands in M5 — until then the
 * form says so plainly rather than silently dropping what someone typed.
 */
export function ReportLink({
  venueSlug,
  venueName,
  dict,
}: {
  venueSlug: string;
  venueName: string;
  dict: Dictionary['report'];
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'unavailable'>('idle');

  const kinds = [
    { value: 'wrong_hours', label: dict.wrongHours },
    { value: 'closed', label: dict.closed },
    { value: 'wrong_address', label: dict.wrongAddress },
    { value: 'other', label: dict.other },
  ];

  return (
    <section className="mt-10 border-t border-[var(--color-line)] pt-6">
      {!open ? (
        <button
          type="button"
          className="text-sm text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-text)]"
          onClick={() => setOpen(true)}
        >
          {dict.open}
        </button>
      ) : (
        <form
          className="panel space-y-3 p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setState('sending');
            const form = new FormData(event.currentTarget);
            try {
              const response = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  target_type: 'venue',
                  target_id: venueSlug,
                  kind: String(form.get('kind')),
                  message: String(form.get('message') ?? ''),
                }),
              });
              setState(response.ok ? 'sent' : 'unavailable');
            } catch {
              setState('unavailable');
            }
          }}
        >
          <h2 className="text-sm font-semibold">{format(dict.title, { name: venueName })}</h2>
          <label className="block text-sm">
            <span className="text-[var(--color-muted)]">{dict.what}</span>
            <select
              name="kind"
              className="mt-1.5 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-2"
            >
              {kinds.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-[var(--color-muted)]">{dict.details}</span>
            <textarea
              name="message"
              rows={3}
              maxLength={1000}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-2"
            />
          </label>
          <button type="submit" disabled={state === 'sending'} className="btn-accent px-4 py-2 text-sm disabled:opacity-60">
            {dict.send}
          </button>
          <p aria-live="polite" className="text-sm text-[var(--color-muted)]">
            {state === 'sent' && dict.sent}
            {state === 'unavailable' && dict.unavailable}
          </p>
        </form>
      )}
    </section>
  );
}
