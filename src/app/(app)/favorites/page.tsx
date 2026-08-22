import type { Metadata } from 'next';
import Link from 'next/link';
import { PlayCircle, Star } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/states';
import { CourseGrid } from '@/components/course/course-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCourseCatalog } from '@/server/db/content';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';
import { routes } from '@/lib/constants/routes';
import { formatRelative } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Mes favoris',
  robots: { index: false, follow: false },
};

export default async function FavoritesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ courses }, { data: lessonFavorites }] = await Promise.all([
    getCourseCatalog({ onlyFavorites: true, pageSize: 60 }),
    supabase
      .from('favorites')
      .select(
        `id, created_at,
         lesson:lessons!favorites_lesson_id_fkey(
           id, title,
           course:courses!lessons_course_id_fkey(title, slug)
         )`,
      )
      .eq('user_id', user.id)
      .not('lesson_id', 'is', null)
      .order('created_at', { ascending: false }),
  ]);

  const lessons = (lessonFavorites ?? []).filter((row) => row.lesson);
  const isEmpty = courses.length === 0 && lessons.length === 0;

  return (
    <div className="space-y-7">
      <PageHeader
        title="Mes favoris"
        description="Les formations et leçons que vous avez mises de côté."
      />

      {isEmpty ? (
        <EmptyState
          icon={Star}
          title="Aucun favori pour l'instant"
          description="Cliquez sur l'étoile d'une formation ou d'une leçon pour la retrouver ici."
          action={{ label: 'Explorer le catalogue', href: routes.explore }}
        />
      ) : (
        <Tabs defaultValue="courses">
          <TabsList>
            <TabsTrigger value="courses">Formations ({courses.length})</TabsTrigger>
            <TabsTrigger value="lessons">Leçons ({lessons.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="pt-6">
            {courses.length > 0 ? (
              <CourseGrid courses={courses} />
            ) : (
              <EmptyState icon={Star} title="Aucune formation en favori" />
            )}
          </TabsContent>

          <TabsContent value="lessons" className="pt-6">
            {lessons.length > 0 ? (
              <ul className="bg-card divide-y rounded-xl border">
                {lessons.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={routes.lesson(row.lesson!.id)}
                      className="hover:bg-muted flex items-center gap-3 px-4 py-3.5 transition-colors"
                    >
                      <PlayCircle className="text-muted-foreground size-5 shrink-0" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{row.lesson!.title}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {row.lesson!.course?.title}
                        </p>
                      </div>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {formatRelative(row.created_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Star} title="Aucune leçon en favori" />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
