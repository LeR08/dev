import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { EntityManager } from '@/components/admin/entity-manager';
import { upsertSubject } from '@/server/actions/admin.actions';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/server/auth/guards';

export const metadata: Metadata = { title: 'Domaines', robots: { index: false, follow: false } };

export default async function AdminSubjectsPage() {
  await requireStaff();
  const supabase = await createClient();

  const [{ data: subjects }, { data: courses }] = await Promise.all([
    supabase.from('subjects').select('*').order('sort_order'),
    supabase.from('courses').select('subject_id'),
  ]);

  const usage = new Map<string, number>();
  for (const course of courses ?? []) {
    usage.set(course.subject_id, (usage.get(course.subject_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Domaines"
        description="Media Buying, Marketing digital, Vente… Un domaine regroupe des formations quel que soit le parcours."
      />
      <EntityManager
        entity="subjects"
        singular="Domaine"
        withAppearance
        usageLabel="formation(s)"
        rows={(subjects ?? []).map((subject) => ({
          ...subject,
          usageCount: usage.get(subject.id) ?? 0,
        }))}
        onSave={upsertSubject}
      />
    </div>
  );
}
