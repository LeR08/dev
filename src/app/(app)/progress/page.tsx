import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/states';
import { StatTiles } from '@/components/gamification/stat-tiles';
import { BadgeGrid } from '@/components/gamification/badge-grid';
import { StudyChart } from '@/components/gamification/study-chart';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { getDashboardStats } from '@/server/db/dashboard';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';
import { routes } from '@/lib/constants/routes';
import { pluralize } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Ma progression',
  robots: { index: false, follow: false },
};

export default async function ProgressPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [stats, { data: courseProgress }, { data: badges }, { data: userBadges }, { data: sessions }] =
    await Promise.all([
      getDashboardStats(),
      supabase
        .from('course_progress')
        .select(
          `course_id, percent, lessons_completed, lessons_total, status,
           course:courses!course_progress_course_id_fkey(
             title, slug,
             subject:subjects!courses_subject_id_fkey(name)
           )`,
        )
        .eq('user_id', user.id)
        .order('percent', { ascending: false }),
      supabase.from('badges').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('user_badges').select('badge_id, earned_at').eq('user_id', user.id),
      supabase
        .from('study_sessions')
        .select('started_at, duration_seconds')
        .eq('user_id', user.id)
        .gte('started_at', thirtyDaysAgo.toISOString()),
    ]);

  const earned = new Map((userBadges ?? []).map((row) => [row.badge_id, row.earned_at]));

  // Agrégation par jour sur 30 jours, y compris les jours sans activité.
  const byDay = new Map<string, number>();
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * 24 * 3600 * 1000);
    byDay.set(date.toISOString().slice(0, 10), 0);
  }
  for (const session of sessions ?? []) {
    const key = session.started_at.slice(0, 10);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + session.duration_seconds / 60);
  }
  const chartData = [...byDay.entries()].map(([date, minutes]) => ({
    date,
    minutes: Math.round(minutes),
  }));

  const withProgress = (courseProgress ?? []).filter((row) => row.course);

  return (
    <div className="space-y-9">
      <PageHeader
        title="Ma progression"
        description="Votre avancement formation par formation, votre temps d'étude et vos badges."
      />

      {stats && <StatTiles stats={stats} />}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Temps d&apos;étude — 30 derniers jours</h2>
        <div className="bg-card rounded-xl border p-4 sm:p-5">
          <StudyChart data={chartData} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Progression par formation</h2>
        {withProgress.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Aucune progression enregistrée"
            description="Commencez une leçon : votre avancement apparaîtra ici automatiquement."
            action={{ label: 'Explorer le catalogue', href: routes.explore }}
          />
        ) : (
          <ul className="bg-card divide-y rounded-xl border">
            {withProgress.map((row) => (
              <li key={row.course_id}>
                <Link
                  href={routes.course(row.course!.slug)}
                  className="hover:bg-muted flex flex-col gap-2.5 px-4 py-4 transition-colors sm:flex-row sm:items-center sm:gap-5"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{row.course!.title}</p>
                      {row.status === 'completed' && <Badge variant="success">Terminée</Badge>}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {row.course!.subject?.name} · {row.lessons_completed} / {row.lessons_total}{' '}
                      {pluralize(row.lessons_total, 'leçon')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:w-64">
                    <Progress
                      value={row.percent}
                      tone={row.status === 'completed' ? 'success' : 'primary'}
                    />
                    <span className="w-11 shrink-0 text-right text-sm font-medium tabular-nums">
                      {Math.round(row.percent)} %
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Badges</h2>
          <p className="text-muted-foreground text-sm">
            {earned.size} / {badges?.length ?? 0} obtenus
          </p>
        </div>
        <BadgeGrid badges={badges ?? []} earned={earned} />
      </section>
    </div>
  );
}
