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

  const { data: lesson } = await supabase.from('lessons').select('*').eq('id', id).maybeSingle();
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
  // is_correct est révoqué pour `authenticated`, mais le staff y a accès :
  // la révocation porte sur les rôles, la policy `answers_staff` autorise le reste.
  const { data: answers } = questionIds.length
    ? await supabase
        .from('answers')
        .select('id, question_id, label, is_correct, match_pattern, sort_order')
        .in('question_id', questionIds)
        .order('sort_order')
    : { data: [] };

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
        lesson={lesson}
        videos={videos ?? []}
        resources={resources ?? []}
        quizzes={quizzes ?? []}
        questions={questions ?? []}
        answers={answers ?? []}
      />
    </div>
  );
}
