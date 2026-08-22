import type { Metadata } from 'next';
import Link from 'next/link';
import { GraduationCap, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/server/auth/guards';
import { routes } from '@/lib/constants/routes';
import { formatDuration, formatRelative, pluralize } from '@/lib/utils';
import { DIFFICULTY_LABELS } from '@/types/domain';

export const metadata: Metadata = { title: 'Formations', robots: { index: false, follow: false } };

export default async function AdminCoursesPage() {
  await requireStaff();
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from('courses')
    .select(
      `id, title, slug, status, difficulty, lessons_count, duration_seconds, updated_at,
       level:levels!courses_level_id_fkey(name),
       subject:subjects!courses_subject_id_fkey(name)`,
    )
    .order('updated_at', { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Formations"
        description="Créez, modifiez et publiez les formations du catalogue."
        action={
          <Button asChild>
            <Link href={`${routes.adminCourses}/nouveau`}>
              <Plus /> Nouvelle formation
            </Link>
          </Button>
        }
      />

      {(courses ?? []).length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Aucune formation"
          description="Créez votre première formation, puis ajoutez-y modules, chapitres et leçons."
          action={{ label: 'Créer une formation', href: `${routes.adminCourses}/nouveau` }}
        />
      ) : (
        <ul className="bg-card divide-y rounded-xl border">
          {(courses ?? []).map((course) => (
            <li key={course.id}>
              <Link
                href={routes.adminCourse(course.id)}
                className="hover:bg-muted flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{course.title}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {course.level?.name} · {course.subject?.name} ·{' '}
                    {DIFFICULTY_LABELS[course.difficulty]} · modifiée{' '}
                    {formatRelative(course.updated_at)}
                  </p>
                </div>

                <span className="text-muted-foreground shrink-0 text-xs">
                  {course.lessons_count} {pluralize(course.lessons_count, 'leçon')} ·{' '}
                  {formatDuration(course.duration_seconds)}
                </span>

                <Badge variant={course.status === 'published' ? 'success' : 'default'}>
                  {course.status === 'published'
                    ? 'Publiée'
                    : course.status === 'draft'
                      ? 'Brouillon'
                      : 'Archivée'}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
