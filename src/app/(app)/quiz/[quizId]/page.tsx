import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { QuizRunner } from '@/components/quiz/quiz-runner';
import { LockedNotice } from '@/components/access/locked-notice';
import { Alert } from '@/components/ui/alert';
import { getQuizForAttempt } from '@/server/db/lessons';
import { getEntitlements, canAccessCourse } from '@/server/auth/session';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Quiz',
  robots: { index: false, follow: false },
};

export default async function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const data = await getQuizForAttempt(quizId);
  if (!data) notFound();

  const supabase = await createClient();
  const { data: course } = await supabase
    .from('courses')
    .select('id, slug, subject_id')
    .eq('id', data.quiz.course_id)
    .maybeSingle();

  const entitlements = await getEntitlements();
  const unlocked = course
    ? canAccessCourse(entitlements, { id: course.id, subject_id: course.subject_id })
    : false;

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">{data.quiz.title}</h1>
        <LockedNotice
          title="Quiz réservé"
          description="Ce quiz fait partie d'une formation qui n'est pas encore débloquée sur votre compte."
        />
      </div>
    );
  }

  if (!data.canAttempt) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">{data.quiz.title}</h1>
        <Alert variant="warning" title="Tentatives épuisées">
          Vous avez utilisé vos {data.quiz.max_attempts} tentatives pour ce quiz. Votre meilleur
          score est de {Math.round(Math.max(...data.attempts.map((a) => a.percentage), 0))} %.
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <QuizRunner
        quizId={data.quiz.id}
        title={data.quiz.title}
        description={data.quiz.description}
        passingScore={data.quiz.passing_score}
        timeLimitSeconds={data.quiz.time_limit_seconds}
        shuffleQuestions={data.quiz.shuffle_questions}
        questions={data.questions}
        courseSlug={data.course?.slug ?? null}
        lessonId={data.quiz.lesson_id}
        attemptsUsed={data.attemptsUsed}
        maxAttempts={data.quiz.max_attempts}
      />
    </div>
  );
}
