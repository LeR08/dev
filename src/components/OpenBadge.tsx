import { badgeLabel, openState } from '@/lib/hours/core';
import type { HoursFields } from '@/lib/hours/core';
import type { Venue } from '@/lib/types';

type BadgeVenue = HoursFields & Pick<Venue, 'status'>;

const TONE_CLASSES: Record<string, string> = {
  open: 'text-[var(--color-open)] border-[var(--color-open)]/40 bg-[var(--color-open)]/10',
  soon: 'text-[var(--color-soon)] border-[var(--color-soon)]/40 bg-[var(--color-soon)]/10',
  closed: 'text-[var(--color-closed)] border-[var(--color-line)] bg-[var(--color-surface-2)]',
  unknown: 'text-[var(--color-muted)] border-dashed border-[var(--color-line)]',
};

export function OpenBadge({ venue, now, className = '' }: { venue: BadgeVenue; now?: Date; className?: string }) {
  if (venue.status === 'closed') {
    return <Badge tone="closed" text="Permanently closed" className={className} />;
  }
  if (venue.status === 'renamed') {
    return <Badge tone="closed" text="Renamed" className={className} />;
  }
  const { text, tone } = badgeLabel(openState(venue, now));
  return <Badge tone={tone} text={text} className={className} />;
}

function Badge({ tone, text, className }: { tone: string; text: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]} ${className}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {text}
    </span>
  );
}
