import { Lock } from 'lucide-react';
import { cn, formatRelative } from '@/lib/utils';
import type { Tables } from '@/types/database.types';

export function BadgeGrid({
  badges,
  earned,
}: {
  badges: Tables<'badges'>[];
  earned: Map<string, string>;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {badges.map((badge) => {
        const earnedAt = earned.get(badge.id);
        const unlocked = Boolean(earnedAt);

        return (
          <li
            key={badge.id}
            className={cn(
              'bg-card flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors',
              !unlocked && 'opacity-55',
            )}
          >
            <span
              className={cn(
                'grid size-11 place-items-center rounded-full text-xl',
                unlocked ? 'bg-warning-muted' : 'bg-muted',
              )}
              aria-hidden
            >
              {unlocked ? badge.icon : <Lock className="text-muted-foreground size-4" />}
            </span>
            <p className="text-sm leading-tight font-medium">{badge.name}</p>
            <p className="text-muted-foreground text-xs leading-snug">{badge.description}</p>
            {earnedAt && (
              <p className="text-success text-[0.6875rem] font-medium">
                Obtenu {formatRelative(earnedAt)}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
