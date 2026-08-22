import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { ProfileForm } from '@/components/auth/profile-form';
import { StatTiles } from '@/components/gamification/stat-tiles';
import { BadgeGrid } from '@/components/gamification/badge-grid';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { requireUser } from '@/server/auth/guards';
import { getDashboardStats } from '@/server/db/dashboard';
import { getLevels, getSubjects } from '@/server/db/content';
import { createClient } from '@/lib/supabase/server';
import { formatDate, getFullName, getInitials } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Mon profil',
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [stats, levels, subjects, { data: badges }, { data: userBadges }, { data: interests }] =
    await Promise.all([
      getDashboardStats(),
      getLevels(),
      getSubjects(),
      supabase.from('badges').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('user_badges').select('badge_id, earned_at').eq('user_id', user.id),
      supabase.from('user_subject_interests').select('subject_id').eq('user_id', user.id),
    ]);

  const earned = new Map((userBadges ?? []).map((row) => [row.badge_id, row.earned_at]));
  const fullName = getFullName(user.profile.first_name, user.profile.last_name) || user.email;

  return (
    <div className="space-y-9">
      <PageHeader title="Mon profil" description="Vos informations, vos statistiques et vos badges." />

      <section className="bg-card flex flex-col items-center gap-4 rounded-xl border p-6 text-center sm:flex-row sm:text-left">
        <Avatar className="size-20">
          {user.profile.avatar_url && <AvatarImage src={user.profile.avatar_url} alt="" />}
          <AvatarFallback className="text-xl">
            {getInitials(user.profile.first_name, user.profile.last_name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-1.5">
          <h2 className="text-xl font-semibold">{fullName}</h2>
          <p className="text-muted-foreground text-sm">{user.email}</p>
          <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
            {stats && <Badge variant="primary">Niveau {stats.level}</Badge>}
            <Badge variant="outline">Membre depuis {formatDate(user.profile.created_at)}</Badge>
            {user.profile.role !== 'student' && (
              <Badge variant="warning">
                {user.profile.role === 'admin' ? 'Administrateur' : 'Formateur'}
              </Badge>
            )}
          </div>
        </div>
      </section>

      {stats && <StatTiles stats={stats} />}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Mes informations</h2>
        <ProfileForm
          profile={user.profile}
          levels={levels}
          subjects={subjects}
          selectedSubjectIds={(interests ?? []).map((row) => row.subject_id)}
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Mes badges</h2>
          <p className="text-muted-foreground text-sm">
            {earned.size} / {badges?.length ?? 0}
          </p>
        </div>
        <BadgeGrid badges={badges ?? []} earned={earned} />
      </section>
    </div>
  );
}
