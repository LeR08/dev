import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { GoalManager } from '@/components/gamification/goal-manager';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';

export const metadata: Metadata = {
  title: 'Mes objectifs',
  robots: { index: false, follow: false },
};

export default async function GoalsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: goals }, { data: periods }] = await Promise.all([
    supabase
      .from('goals')
      .select('id, type, target_value')
      .eq('user_id', user.id)
      .eq('is_active', true),
    supabase
      .from('goal_periods')
      .select('goal_id, period_start, achieved_value, target_value, achieved')
      .eq('user_id', user.id)
      .order('period_start', { ascending: false })
      .limit(60),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <PageHeader
        title="Mes objectifs"
        description="Un objectif réaliste tenu chaque jour vaut mieux qu'un objectif ambitieux abandonné au bout d'une semaine."
      />
      <GoalManager goals={goals ?? []} periods={periods ?? []} />
    </div>
  );
}
