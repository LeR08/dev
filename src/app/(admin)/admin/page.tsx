import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Award,
  FolderTree,
  GraduationCap,
  KeyRound,
  PlayCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/server/auth/guards';
import { routes } from '@/lib/constants/routes';
import { formatNumber, formatRelative } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Administration',
  robots: { index: false, follow: false },
};

export default async function AdminHomePage() {
  const user = await requireStaff();
  const supabase = await createClient();

  const [courses, published, lessons, videos, members, codes, recent] = await Promise.all([
    supabase.from('courses').select('id', { count: 'exact', head: true }),
    supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('lessons').select('id', { count: 'exact', head: true }),
    supabase.from('videos').select('id', { count: 'exact', head: true }),
    user.profile.role === 'admin'
      ? supabase.from('profiles').select('id', { count: 'exact', head: true })
      : Promise.resolve({ count: null }),
    user.profile.role === 'admin'
      ? supabase.from('access_codes').select('id', { count: 'exact', head: true }).eq('is_active', true)
      : Promise.resolve({ count: null }),
    supabase
      .from('courses')
      .select('id, title, slug, status, updated_at')
      .order('updated_at', { ascending: false })
      .limit(6),
  ]);

  const drafts = (courses.count ?? 0) - (published.count ?? 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Vue d'ensemble"
        description="L'état du catalogue et les raccourcis vers les tâches courantes."
        action={
          <Button asChild>
            <Link href={`${routes.adminCourses}/nouveau`}>Nouvelle formation</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={GraduationCap} label="Formations" value={formatNumber(courses.count ?? 0)} detail={`${drafts} brouillon(s)`} />
        <Stat icon={FolderTree} label="Leçons" value={formatNumber(lessons.count ?? 0)} />
        <Stat icon={PlayCircle} label="Vidéos" value={formatNumber(videos.count ?? 0)} />
        {user.profile.role === 'admin' ? (
          <Stat icon={Users} label="Membres" value={formatNumber(members.count ?? 0)} />
        ) : (
          <Stat icon={Award} label="Publiées" value={formatNumber(published.count ?? 0)} />
        )}
      </div>

      {user.profile.role === 'admin' && (
        <section className="bg-primary-muted flex flex-wrap items-center gap-4 rounded-xl p-5">
          <KeyRound className="text-primary size-5 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {formatNumber(codes.count ?? 0)} code(s) d&apos;accès actif(s)
            </p>
            <p className="text-muted-foreground text-sm">
              Générez un lot de codes à envoyer après chaque vente.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href={routes.adminAccessCodes}>Gérer les codes</Link>
          </Button>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Formations récemment modifiées</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href={routes.adminCourses}>Tout voir</Link>
          </Button>
        </div>

        <ul className="bg-card divide-y rounded-xl border">
          {(recent.data ?? []).map((course) => (
            <li key={course.id}>
              <Link
                href={routes.adminCourse(course.id)}
                className="hover:bg-muted flex items-center gap-3 px-4 py-3 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{course.title}</p>
                  <p className="text-muted-foreground text-xs">
                    Modifiée {formatRelative(course.updated_at)}
                  </p>
                </div>
                <Badge variant={course.status === 'published' ? 'success' : 'default'}>
                  {course.status === 'published' ? 'Publiée' : course.status === 'draft' ? 'Brouillon' : 'Archivée'}
                </Badge>
              </Link>
            </li>
          ))}
          {(recent.data ?? []).length === 0 && (
            <li className="text-muted-foreground px-4 py-8 text-center text-sm">
              Aucune formation. Commencez par en créer une.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="bg-card space-y-2 rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <span className="bg-muted text-muted-foreground grid size-7 place-items-center rounded-md">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="text-muted-foreground text-xs font-medium">{label}</span>
      </div>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      {detail && <p className="text-muted-foreground text-xs">{detail}</p>}
    </div>
  );
}
