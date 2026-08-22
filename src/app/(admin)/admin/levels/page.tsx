import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { EntityManager } from '@/components/admin/entity-manager';
import { upsertLevel } from '@/server/actions/admin.actions';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/server/auth/guards';

export const metadata: Metadata = { title: 'Parcours', robots: { index: false, follow: false } };

export default async function AdminLevelsPage() {
  await requireStaff();
  const supabase = await createClient();

  const [{ data: levels }, { data: courses }] = await Promise.all([
    supabase.from('levels').select('*').order('sort_order'),
    supabase.from('courses').select('level_id'),
  ]);

  const usage = new Map<string, number>();
  for (const course of courses ?? []) {
    usage.set(course.level_id, (usage.get(course.level_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parcours"
        description="Débutant, Intermédiaire, Avancé… Les parcours orientent les recommandations."
      />
      <EntityManager
        entity="levels"
        singular="Parcours"
        usageLabel="formation(s)"
        rows={(levels ?? []).map((level) => ({ ...level, usageCount: usage.get(level.id) ?? 0 }))}
        onSave={upsertLevel}
      />
    </div>
  );
}
