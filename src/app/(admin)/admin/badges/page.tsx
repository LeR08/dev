import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/states';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/server/auth/guards';
import { formatNumber } from '@/lib/utils';
import { Award } from 'lucide-react';

export const metadata: Metadata = { title: 'Badges', robots: { index: false, follow: false } };

const CRITERIA_LABELS: Record<string, (value: unknown) => string> = {
  lessons_completed: (v) => `${v} leçon(s) terminée(s)`,
  courses_completed: (v) => `${v} formation(s) terminée(s)`,
  streak_days: (v) => `${v} jours consécutifs`,
  quizzes_passed: (v) => `${v} quiz réussi(s)`,
  perfect_quiz: (v) => `${v} quiz à 100 %`,
  subject_completed: (v) => `Domaine « ${v} » terminé`,
  all_courses_completed: () => 'Toutes les formations terminées',
};

export default async function AdminBadgesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: badges }, { data: awarded }] = await Promise.all([
    supabase.from('badges').select('*').order('sort_order'),
    supabase.from('user_badges').select('badge_id'),
  ]);

  const counts = new Map<string, number>();
  for (const row of awarded ?? []) {
    counts.set(row.badge_id, (counts.get(row.badge_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Badges"
        description="Les critères sont évalués automatiquement à chaque leçon terminée et chaque quiz réussi."
      />

      <Alert variant="info" title="Badges définis en base">
        Les badges sont créés par le fichier de données de démonstration
        (<code className="font-mono text-xs">supabase/seed.sql</code>). Pour en ajouter un, insérez
        une ligne dans <code className="font-mono text-xs">badges</code> avec son critère JSON, puis
        étendez la fonction <code className="font-mono text-xs">check_badges()</code> si le type de
        critère est nouveau.
      </Alert>

      {(badges ?? []).length === 0 ? (
        <EmptyState
          icon={Award}
          title="Aucun badge"
          description="Exécutez le fichier de données de démonstration pour créer les badges par défaut."
        />
      ) : (
        <ul className="bg-card divide-y rounded-xl border">
          {(badges ?? []).map((badge) => {
            const criteria = badge.criteria as { type?: string; value?: unknown; subject?: unknown };
            const describe = criteria.type ? CRITERIA_LABELS[criteria.type] : undefined;

            return (
              <li key={badge.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="bg-warning-muted grid size-10 shrink-0 place-items-center rounded-full text-lg" aria-hidden>
                  {badge.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{badge.name}</p>
                  <p className="text-muted-foreground truncate text-xs">{badge.description}</p>
                </div>
                <Badge variant="outline">
                  {describe ? describe(criteria.value ?? criteria.subject) : (criteria.type ?? '—')}
                </Badge>
                {badge.xp_reward > 0 && <Badge variant="primary">+{badge.xp_reward} XP</Badge>}
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {formatNumber(counts.get(badge.id) ?? 0)} obtention(s)
                </span>
                {!badge.is_active && <Badge variant="default">Inactif</Badge>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
