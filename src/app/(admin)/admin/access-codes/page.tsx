import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { AccessCodeManager } from '@/components/admin/access-code-manager';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/server/auth/guards';

export const metadata: Metadata = {
  title: "Codes d'accès",
  robots: { index: false, follow: false },
};

export default async function AdminAccessCodesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: codes }, { data: courses }, { data: subjects }] = await Promise.all([
    supabase
      .from('access_codes')
      .select(
        `*, course:courses!access_codes_course_id_fkey(title),
            subject:subjects!access_codes_subject_id_fkey(name)`,
      )
      .order('created_at', { ascending: false })
      .limit(300),
    supabase.from('courses').select('id, title').order('title'),
    supabase.from('subjects').select('id, name').order('sort_order'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Codes d'activation"
        description="Générez des codes après chaque vente. Aucun paiement ne transite par la plateforme : vous encaissez où vous voulez."
      />
      <AccessCodeManager
        codes={codes ?? []}
        courses={courses ?? []}
        subjects={subjects ?? []}
      />
    </div>
  );
}
