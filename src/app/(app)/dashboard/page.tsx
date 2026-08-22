import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  CircleCheck,
  Compass,
  FileQuestion,
  PlayCircle,
  Sparkles,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress, ProgressRing } from '@/components/ui/progress';
import { CourseGrid } from '@/components/course/course-card';
import { StatTiles } from '@/components/gamification/stat-tiles';
import { EmptyState } from '@/components/shared/states';
import { requireUser } from '@/server/auth/guards';
import { getEntitlements } from '@/server/auth/session';
import {
  getContinueCard,
  getCoursesInProgress,
  getDashboardStats,
  getRecentActivity,
  getRecentQuizAttempts,
} from '@/server/db/dashboard';
import { getRecommendedCourses } from '@/server/services/recommendation.service';
import { createClient } from '@/lib/supabase/server';
import { routes } from '@/lib/constants/routes';
import { formatRelative, pluralize } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Tableau de bord',
  robots: { index: false, follow: false },
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Bonne nuit';
  if (hour < 18) return 'Bonjour';
  return 'Bonsoir';
}

export default async function DashboardPage() {
  const user = await requireUser();

  const [stats, continueCard, inProgress, recommended, activity, quizAttempts, entitlements] =
    await Promise.all([
      getDashboardStats(),
      getContinueCard(),
      getCoursesInProgress(3),
      getRecommendedCourses(3),
      getRecentActivity(5),
      getRecentQuizAttempts(4),
      getEntitlements(),
    ]);

  const supabase = await createClient();
  const { data: goals } = await supabase
    .from('goals')
    .select('id, type, target_value')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const { data: goalPeriods } = await supabase
    .from('goal_periods')
    .select('goal_id, achieved_value, target_value, achieved')
    .eq('user_id', user.id)
    .order('period_start', { ascending: false })
    .limit(8);

  const periodByGoal = new Map((goalPeriods ?? []).map((row) => [row.goal_id, row]));
  const firstName = user.profile.first_name ?? '';

  return (
    <div className="space-y-9">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting()}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-muted-foreground">
          {continueCard
            ? 'Reprenez exactement là où vous vous êtes arrêté.'
            : 'Choisissez une formation et lancez-vous.'}
        </p>
      </header>

      {/* Grande carte de reprise — l'élément central du tableau de bord */}
      {continueCard ? (
        <section
          aria-label="Reprendre"
          className="from-primary/10 via-card to-card overflow-hidden rounded-2xl border bg-gradient-to-br shadow-sm"
        >
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="bg-muted relative aspect-video w-full shrink-0 overflow-hidden rounded-xl sm:w-56">
              {continueCard.thumbnailUrl ? (
                <Image
                  src={continueCard.thumbnailUrl}
                  alt=""
                  fill
                  sizes="224px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="grid h-full place-items-center">
                  <PlayCircle className="text-muted-foreground size-8" aria-hidden />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-1">
                <Badge variant="primary">Continuer là où vous vous êtes arrêté</Badge>
                <h2 className="truncate text-lg font-semibold">{continueCard.courseTitle}</h2>
                <p className="text-muted-foreground truncate text-sm">
                  {continueCard.moduleTitle} · {continueCard.lessonTitle}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Progress value={continueCard.percent} className="max-w-xs" />
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {continueCard.lessonsCompleted}/{continueCard.lessonsTotal}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={routes.lesson(continueCard.lessonId)}>
                    <PlayCircle /> Continuer
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={routes.course(continueCard.courseSlug)}>Voir le programme</Link>
                </Button>
              </div>
            </div>

            <ProgressRing value={continueCard.percent} size={72} strokeWidth={6} className="hidden lg:block" />
          </div>
        </section>
      ) : (
        <EmptyState
          icon={entitlements.hasAny ? Compass : Sparkles}
          title={entitlements.hasAny ? 'Aucune formation en cours' : 'Votre accès n’est pas encore activé'}
          description={
            entitlements.hasAny
              ? 'Parcourez le catalogue et commencez votre première formation.'
              : 'Activez votre code pour débloquer les formations. Les leçons en accès libre restent disponibles sans code.'
          }
          action={
            entitlements.hasAny
              ? { label: 'Explorer le catalogue', href: routes.explore }
              : { label: 'Activer mon code', href: routes.activate }
          }
        />
      )}

      {stats && <StatTiles stats={stats} />}

      {inProgress.length > 0 && (
        <Section title="Vos formations en cours" href={routes.myCourses} linkLabel="Tout voir">
          <CourseGrid courses={inProgress} />
        </Section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Objectifs */}
        <section className="bg-card space-y-4 rounded-xl border p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Mes objectifs</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href={routes.goals}>
                Gérer <ArrowRight />
              </Link>
            </Button>
          </div>

          {goals && goals.length > 0 ? (
            <ul className="space-y-3.5">
              {goals.map((goal) => {
                const period = periodByGoal.get(goal.id);
                const achieved = period?.achieved_value ?? 0;
                const percent = Math.min(100, (achieved / goal.target_value) * 100);
                return (
                  <li key={goal.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{GOAL_LABELS[goal.type]}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {achieved} / {goal.target_value}
                      </span>
                    </div>
                    <Progress value={percent} size="sm" tone={percent >= 100 ? 'success' : 'primary'} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-4 text-center">
              <Target className="text-muted-foreground mx-auto size-6" aria-hidden />
              <p className="text-muted-foreground mt-2 text-sm">
                Aucun objectif défini. Un objectif quotidien aide à tenir le rythme.
              </p>
              <Button asChild size="sm" variant="secondary" className="mt-3">
                <Link href={routes.goals}>Définir un objectif</Link>
              </Button>
            </div>
          )}
        </section>

        {/* Derniers quiz */}
        <section className="bg-card space-y-4 rounded-xl border p-5">
          <h2 className="font-semibold">Derniers quiz</h2>
          {quizAttempts.length > 0 ? (
            <ul className="space-y-2.5">
              {quizAttempts.map((attempt) => (
                <li key={attempt.id} className="flex items-center gap-3">
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                      attempt.passed ? 'bg-success-muted text-success' : 'bg-danger-muted text-danger'
                    }`}
                  >
                    {attempt.passed ? (
                      <CircleCheck className="size-4" />
                    ) : (
                      <FileQuestion className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{attempt.title}</p>
                    <p className="text-muted-foreground text-xs">{formatRelative(attempt.at)}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {Math.round(attempt.percentage)} %
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Aucun quiz passé pour l&apos;instant.
            </p>
          )}
        </section>
      </div>

      {recommended.length > 0 && (
        <Section
          title="Recommandé pour vous"
          description="D'après votre parcours, vos domaines et votre progression."
        >
          <CourseGrid courses={recommended} />
        </Section>
      )}

      {activity.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Activité récente</h2>
          <ul className="bg-card divide-y rounded-xl border">
            {activity.map((item) => (
              <li key={item.lessonId}>
                <Link
                  href={routes.lesson(item.lessonId)}
                  className="hover:bg-muted flex items-center gap-3 px-4 py-3 transition-colors"
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                      item.status === 'completed'
                        ? 'bg-success-muted text-success'
                        : 'bg-primary-muted text-primary'
                    }`}
                  >
                    {item.status === 'completed' ? (
                      <CircleCheck className="size-4" />
                    ) : (
                      <PlayCircle className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.lessonTitle}</p>
                    <p className="text-muted-foreground truncate text-xs">{item.courseTitle}</p>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {formatRelative(item.at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

const GOAL_LABELS: Record<string, string> = {
  daily_minutes: "Minutes d'étude par jour",
  weekly_minutes: "Minutes d'étude par semaine",
  daily_lessons: 'Leçons par jour',
  weekly_lessons: 'Leçons par semaine',
};

function Section({
  title,
  description,
  href,
  linkLabel,
  children,
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>
        {href && (
          <Button asChild variant="ghost" size="sm">
            <Link href={href}>
              {linkLabel ?? 'Voir tout'} <ArrowRight />
            </Link>
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}
