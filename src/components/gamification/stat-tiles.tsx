import { Flame, GraduationCap, Timer, Trophy, type LucideIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatNumber, pluralize } from '@/lib/utils';
import type { DashboardStats } from '@/server/db/dashboard';

export function StatTiles({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        icon={Trophy}
        label="Niveau"
        value={String(stats.level)}
        detail={`${formatNumber(stats.xp)} XP au total`}
        progress={
          stats.xpForNextLevel > 0 ? (stats.xpInLevel / stats.xpForNextLevel) * 100 : 0
        }
        progressLabel={`${stats.xpInLevel} / ${stats.xpForNextLevel} XP`}
      />
      <Tile
        icon={Flame}
        label="Série"
        value={`${stats.streakCurrent} ${pluralize(stats.streakCurrent, 'jour')}`}
        detail={`Record : ${stats.streakLongest} ${pluralize(stats.streakLongest, 'jour')}`}
        tone="warning"
      />
      <Tile
        icon={GraduationCap}
        label="Leçons terminées"
        value={String(stats.lessonsCompleted)}
        detail={`${stats.coursesCompleted} ${pluralize(stats.coursesCompleted, 'formation')} ${pluralize(stats.coursesCompleted, 'terminée', 'terminées')}`}
        tone="success"
      />
      <Tile
        icon={Timer}
        label="Cette semaine"
        value={formatMinutes(stats.studyMinutesWeek)}
        detail={`${formatMinutes(stats.studyMinutesTotal)} au total`}
      />
    </div>
  );
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`;
}

function Tile({
  icon: Icon,
  label,
  value,
  detail,
  progress,
  progressLabel,
  tone = 'primary',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  progress?: number;
  progressLabel?: string;
  tone?: 'primary' | 'warning' | 'success';
}) {
  const toneClass = {
    primary: 'bg-primary-muted text-primary',
    warning: 'bg-warning-muted text-warning-foreground',
    success: 'bg-success-muted text-success',
  }[tone];

  return (
    <div className="bg-card space-y-2.5 rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <span className={`grid size-7 place-items-center rounded-md ${toneClass}`}>
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="text-muted-foreground text-xs font-medium">{label}</span>
      </div>
      <p className="text-xl font-semibold tracking-tight tabular-nums">{value}</p>
      {typeof progress === 'number' ? (
        <div className="space-y-1">
          <Progress value={progress} size="sm" />
          <p className="text-muted-foreground text-xs tabular-nums">{progressLabel}</p>
        </div>
      ) : (
        detail && <p className="text-muted-foreground text-xs">{detail}</p>
      )}
    </div>
  );
}
