import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { CourseEditor } from '@/components/admin/course-editor';
import { CourseStructure } from '@/components/admin/course-structure';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCourseTree } from '@/server/db/admin';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/server/auth/guards';

export const metadata: Metadata = {
  title: 'Éditer une formation',
  robots: { index: false, follow: false },
};

export default async function AdminCourseEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const isNew = id === 'nouveau';

  const supabase = await createClient();
  const [{ data: levels }, { data: subjects }] = await Promise.all([
    supabase.from('levels').select('id, name').order('sort_order'),
    supabase.from('subjects').select('id, name').order('sort_order'),
  ]);

  if (isNew) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Nouvelle formation"
          description="Renseignez les informations principales, puis construisez la structure."
        />
        <CourseEditor course={null} levels={levels ?? []} subjects={subjects ?? []} />
      </div>
    );
  }

  const { data: course } = await supabase.from('courses').select('*').eq('id', id).maybeSingle();
  if (!course) notFound();

  const modules = await getCourseTree(course.id);

  return (
    <div className="space-y-6">
      <PageHeader title={course.title} description={`/courses/${course.slug}`} />

      <Tabs defaultValue="structure">
        <TabsList>
          <TabsTrigger value="structure">Structure</TabsTrigger>
          <TabsTrigger value="settings">Informations</TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="pt-6">
          <CourseStructure courseId={course.id} modules={modules} />
        </TabsContent>

        <TabsContent value="settings" className="pt-6">
          <CourseEditor course={course} levels={levels ?? []} subjects={subjects ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
