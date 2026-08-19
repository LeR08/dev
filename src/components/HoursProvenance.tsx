import { resolveHours } from '@/lib/hours/core';
import { format, formatDate, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n';
import type { Venue } from '@/lib/types';

/**
 * §11 and the acceptance gate: hours never appear without their source, and the
 * licence tier never appears without the qualifier that it is an outer bound.
 */
export function HoursProvenance({
  venue,
  dict,
  locale,
}: {
  venue: Venue;
  dict: Dictionary['hours'];
  locale: Locale;
}) {
  const resolved = resolveHours(venue);

  if (!resolved.source) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        {dict.none} <span className="text-[var(--color-text)]">{dict.contribute}</span>
      </p>
    );
  }

  return (
    <div className="text-sm text-[var(--color-muted)]">
      <p>
        {dict[resolved.source]}
        {resolved.updatedAt ? format(dict.updated, { date: formatDate(resolved.updatedAt, locale) }) : ''}.
      </p>
      {resolved.qualified && <p className="mt-1.5 text-[var(--color-soon)]">{dict.qualifier}</p>}
    </div>
  );
}
