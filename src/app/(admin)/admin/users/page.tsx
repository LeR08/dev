import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { UserManager } from '@/components/admin/user-manager';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/server/auth/guards';

export const metadata: Metadata = { title: 'Membres', robots: { index: false, follow: false } };

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const [{ data: profiles }, { data: enrollments }, { data: courses }, { data: subjects }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, first_name, last_name, role, is_active, xp, streak_current, created_at, avatar_url')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('enrollments')
        .select(
          `id, user_id, scope, expires_at, revoked_at,
           course:courses!enrollments_course_id_fkey(title),
           subject:subjects!enrollments_subject_id_fkey(name)`,
        )
        .is('revoked_at', null),
      supabase.from('courses').select('id, title').order('title'),
      supabase.from('subjects').select('id, name').order('sort_order'),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Membres"
        description="Consultez, recherchez, accordez un accès ou désactivez un compte."
      />
      <UserManager
        currentUserId={admin.id}
        users={profiles ?? []}
        enrollments={enrollments ?? []}
        courses={courses ?? []}
        subjects={subjects ?? []}
      />
    </div>
  );
}
