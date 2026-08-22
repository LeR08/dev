import type { Metadata } from 'next';
import { GraduationCap } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/states';
import { CourseGrid } from '@/components/course/course-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCourseCatalog } from '@/server/db/content';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';
import { routes } from '@/lib/constants/routes';

export const metadata: Metadata = {
  title: 'Mes formations',
  robots: { index: false, follow: false },
};

export default async function MyCoursesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ courses }, { data: progressRows }] = await Promise.all([
    getCourseCatalog({ onlyStarted: true, pageSize: 60 }),
    supabase
      .from('course_progress')
      .select('course_id, status')
      .eq('user_id', user.id),
  ]);

  const statusByCourse = new Map((progressRows ?? []).map((row) => [row.course_id, row.status]));
  const active = courses.filter((course) => statusByCourse.get(course.id) !== 'completed');
  const done = courses.filter((course) => statusByCourse.get(course.id) === 'completed');

  return (
    <div className="space-y-7">
      <PageHeader
        title="Mes formations"
        description="Toutes les formations que vous avez commencées."
      />

      {courses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Vous n'avez commencé aucune formation"
          description="Parcourez le catalogue et lancez votre première leçon."
          action={{ label: 'Explorer le catalogue', href: routes.explore }}
        />
      ) : (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">En cours ({active.length})</TabsTrigger>
            <TabsTrigger value="done">Terminées ({done.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="pt-6">
            {active.length > 0 ? (
              <CourseGrid courses={active} />
            ) : (
              <EmptyState
                icon={GraduationCap}
                title="Aucune formation en cours"
                description="Vous avez terminé tout ce que vous aviez commencé. Beau travail."
                action={{ label: 'Trouver une nouvelle formation', href: routes.explore }}
              />
            )}
          </TabsContent>

          <TabsContent value="done" className="pt-6">
            {done.length > 0 ? (
              <CourseGrid courses={done} />
            ) : (
              <EmptyState
                icon={GraduationCap}
                title="Aucune formation terminée"
                description="Terminez toutes les leçons d'une formation pour la voir apparaître ici."
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
