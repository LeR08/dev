import { resolveHours } from '@/lib/hours/core';
import type { Venue } from '@/lib/types';

const SOURCE_COPY: Record<string, string> = {
  community: 'Corrected by a verified community report',
  osm: 'Hours from OpenStreetMap',
  licence: 'Hours from the Amsterdam operating licence',
};

/**
 * §11 and acceptance gate: hours never appear without their source, and the
 * licence tier never appears without the qualifier that it is an outer bound.
 */
export function HoursProvenance({ venue }: { venue: Venue }) {
  const resolved = resolveHours(venue);
  if (!resolved.source) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        No opening hours are recorded for this venue.{' '}
        <span className="text-[var(--color-text)]">Know them? Use the report link below.</span>
      </p>
    );
  }

  const updated = resolved.updatedAt
    ? new Date(resolved.updatedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Europe/Amsterdam',
      })
    : null;

  return (
    <div className="text-sm text-[var(--color-muted)]">
      <p>
        {SOURCE_COPY[resolved.source]}
        {updated ? `, updated ${updated}` : ''}.
      </p>
      {resolved.qualified && (
        <p className="mt-1 text-[var(--color-soon)]">
          These are the hours the licence permits — the actual closing time may be earlier.
        </p>
      )}
    </div>
  );
}
