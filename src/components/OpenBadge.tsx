import { badgeDescriptor, openState } from '@/lib/hours/core';
import type { BadgeTone, HoursFields } from '@/lib/hours/core';
import { format } from '@/i18n/config';
import type { Dictionary } from '@/i18n';
import type { Venue } from '@/lib/types';

type BadgeVenue = HoursFields & Pick<Venue, 'status'>;

const TONE_CLASSES: Record<BadgeTone, string> = {
  open: 'text-[var(--color-open)] border-[color-mix(in_srgb,var(--color-open)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-open)_12%,transparent)]',
  soon: 'text-[var(--color-soon)] border-[color-mix(in_srgb,var(--color-soon)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-soon)_12%,transparent)]',
  closed: 'text-[var(--color-closed)] border-[var(--color-line)] bg-[var(--color-surface-2)]',
  unknown: 'text-[var(--color-muted)] border-dashed border-[var(--color-line-strong)]',
};

export function OpenBadge({
  venue,
  dict,
  now,
  className = '',
}: {
  venue: BadgeVenue;
  dict: Dictionary['badge'];
  now?: Date;
  className?: string;
}) {
  if (venue.status === 'closed') return <Badge tone="closed" text={dict.permanentlyClosed} className={className} />;
  if (venue.status === 'renamed') return <Badge tone="closed" text={dict.renamed} className={className} />;

  const descriptor = badgeDescriptor(openState(venue, now));
  const text =
    descriptor.key === 'closed' || descriptor.key === 'unknown'
      ? dict[descriptor.key]
      : format(dict[descriptor.key], { time: descriptor.time });

  return <Badge tone={descriptor.tone} text={text} className={className} />;
}

function Badge({ tone, text, className }: { tone: BadgeTone; text: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]} ${className}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {text}
    </span>
  );
}
