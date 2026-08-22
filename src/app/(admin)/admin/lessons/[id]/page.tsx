import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LessonEditor } from '@/components/admin/lesson-editor';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/server/auth/guards';
import { routes } from '@/lib/constants/routes';

export const metadata: Metadata = {
  title: 'Éditer une leçon',
  robots: { index: false, follow: false },
};

export default async function AdminLessonPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  // content_md est révoqué au niveau colonne, y compris pour le staff : il est
  // servi par get_lesson_content(), qui autorise le staff via has_course_access().
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, chapter_id, module_id, course_id, slug, title, description, duration_seconds, sort_order, is_free_preview, status, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (!lesson) notFound();

  const [{ data: course }, { data: videos }, { data: resources }, { data: quizzes }] =
    await Promise.all([
      supabase.from('courses').select('id, title, slug').eq('id', lesson.course_id).maybeSingle(),
      supabase.from('videos').select('*').eq('lesson_id', id).order('sort_order'),
      supabase.from('resources').select('*').eq('lesson_id', id).order('sort_order'),
      supabase.from('quizzes').select('*').eq('lesson_id', id).order('sort_order'),
    ]);

  const quizIds = (quizzes ?? []).map((quiz) => quiz.id);
  const { data: questions } = quizIds.length
    ? await supabase.from('questions').select('*').in('quiz_id', quizIds).order('sort_order')
    : { data: [] };

  const questionIds = (questions ?? []).map((question) => question.id);
  // is_correct n'est lisible par personne en direct : la fonction
  // staff_get_answers() le rétablit pour le staff uniquement.
  const { data: answers } = questionIds.length
    ? await supabase.rpc('staff_get_answers', { p_question_ids: questionIds })
    : { data: [] };

  const { data: content } = await supabase.rpc('get_lesson_content', { p_lesson_id: id });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={course ? routes.adminCourse(course.id) : routes.adminCourses}>
            <ArrowLeft /> {course?.title ?? 'Retour'}
          </Link>
        </Button>
        {course && (
          <Button asChild variant="ghost" size="sm">
            <Link href={routes.lesson(lesson.id)} target="_blank">
              Prévisualiser <ExternalLink />
            </Link>
          </Button>
        )}
      </div>

      <LessonEditor
        lesson={{ ...lesson, content_md: content ?? null }}
        videos={videos ?? []}
        resources={resources ?? []}
        quizzes={quizzes ?? []}
        questions={questions ?? []}
        answers={answers ?? []}
      />
    </div>
  );
}
