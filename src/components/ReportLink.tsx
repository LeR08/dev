'use client';

import { useState } from 'react';

const KINDS = [
  { value: 'wrong_hours', label: 'The opening hours are wrong' },
  { value: 'closed', label: 'This venue has closed' },
  { value: 'wrong_address', label: 'The address is wrong' },
  { value: 'other', label: 'Something else' },
];

/**
 * §F8: reporting needs no account. The write path lands in M5 — until then the
 * form says so plainly rather than silently dropping what someone typed.
 */
export function ReportLink({ venueSlug, venueName }: { venueSlug: string; venueName: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'unavailable'>('idle');

  return (
    <section className="mt-8 border-t border-[var(--color-line)] pt-6">
      {!open ? (
        <button type="button" className="text-sm underline" onClick={() => setOpen(true)}>
          Report incorrect information
        </button>
      ) : (
        <form
          className="space-y-3"
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
          <h2 className="text-sm font-medium">Report incorrect information about {venueName}</h2>
          <label className="block text-sm">
            <span className="text-[var(--color-muted)]">What is wrong?</span>
            <select
              name="kind"
              className="mt-1 w-full rounded border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-2"
            >
              {KINDS.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-[var(--color-muted)]">Details (optional)</span>
            <textarea
              name="message"
              rows={3}
              maxLength={1000}
              className="mt-1 w-full rounded border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={state === 'sending'}
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-on-accent)] disabled:opacity-60"
          >
            Send report
          </button>
          <p aria-live="polite" className="text-sm text-[var(--color-muted)]">
            {state === 'sent' && 'Thank you — a moderator will check this.'}
            {state === 'unavailable' &&
              'Reports are not being collected yet. Nothing was sent and nothing was stored.'}
          </p>
        </form>
      )}
    </section>
  );
}
