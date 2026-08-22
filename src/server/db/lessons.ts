import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser, getEntitlements, canAccessCourse } from '@/server/auth/session';
import { resolveVideoSource } from '@/lib/video';
import type { VideoSource } from '@/lib/video';
import type { Tables } from '@/types/database.types';
import type { QuizSummary } from '@/types/domain';

export interface LessonPlayerData {
  lesson: Tables<'lessons'>;
  course: Pick<Tables<'courses'>, 'id' | 'slug' | 'title' | 'subject_id'>;
  moduleTitle: string;
  chapterTitle: string;
  unlocked: boolean;
  /** Contenu textuel, chargé via RPC car la colonne est révoquée en lecture directe. */
  contentMd: string | null;
  videos: Array<{
    source: VideoSource;
    row: Tables<'videos'>;
    positionSeconds: number;
    percent: number;
    completed: boolean;
  }>;
  resources: Tables<'resources'>[];
  exercises: Tables<'exercises'>[];
  quizzes: QuizSummary[];
  notes: Tables<'notes'>[];
  status: 'not_started' | 'in_progress' | 'completed';
  isFavorite: boolean;
}

export const getLessonPlayerData = cache(
  async (lessonId: string): Promise<LessonPlayerData | null> => {
    const supabase = await createClient();
    const user = await getSessionUser();
    const entitlements = await getEntitlements();

    const { data: lesson } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .eq('status', 'published')
      .maybeSingle();

    if (!lesson) return null;

    const [{ data: course }, { data: chapter }, { data: module }] = await Promise.all([
      supabase
        .from('courses')
        .select('id, slug, title, subject_id')
        .eq('id', lesson.course_id)
        .maybeSingle(),
      supabase.from('chapters').select('title').eq('id', lesson.chapter_id).maybeSingle(),
      supabase.from('modules').select('title').eq('id', lesson.module_id).maybeSingle(),
    ]);

    if (!course) return null;

    const unlocked =
      lesson.is_free_preview || canAccessCourse(entitlements, { id: course.id, subject_id: course.subject_id });

    // Contenu textuel : la colonne content_md n'est pas lisible directement,
    // la fonction vérifie l'accès et lève une erreur explicite sinon.
    let contentMd: string | null = null;
    if (unlocked) {
      const { data } = await supabase.rpc('get_lesson_content', { p_lesson_id: lessonId });
      contentMd = data ?? null;
    }

    const [{ data: videoRows }, { data: resources }, { data: exercises }, { data: quizRows }] =
      await Promise.all([
        supabase.from('videos').select('*').eq('lesson_id', lessonId).order('sort_order'),
        supabase.from('resources').select('*').eq('lesson_id', lessonId).order('sort_order'),
        supabase
          .from('exercises')
          .select('*')
          .eq('lesson_id', lessonId)
          .eq('status', 'published')
          .order('sort_order'),
        supabase
          .from('quizzes')
          .select('id, title, description, passing_score, max_attempts')
          .eq('lesson_id', lessonId)
          .eq('status', 'published')
          .order('sort_order'),
      ]);

    const videoIds = (videoRows ?? []).map((video) => video.id);
    const progressByVideo = new Map<string, { position: number; percent: number; completed: boolean }>();
    const notes: Tables<'notes'>[] = [];
    let status: LessonPlayerData['status'] = 'not_started';
    let isFavorite = false;

    if (user) {
      const [{ data: videoProgress }, { data: lessonProgress }, { data: noteRows }, { data: fav }] =
        await Promise.all([
          videoIds.length
            ? supabase
                .from('video_progress')
                .select('video_id, position_seconds, percent, completed')
                .eq('user_id', user.id)
                .in('video_id', videoIds)
            : Promise.resolve({ data: [] as const }),
          supabase
            .from('lesson_progress')
            .select('status')
            .eq('user_id', user.id)
            .eq('lesson_id', lessonId)
            .maybeSingle(),
          supabase
            .from('notes')
            .select('*')
            .eq('user_id', user.id)
            .eq('lesson_id', lessonId)
            .order('timestamp_seconds', { ascending: true, nullsFirst: false })
            .order('created_at'),
          supabase
            .from('favorites')
            .select('id')
            .eq('user_id', user.id)
            .eq('lesson_id', lessonId)
            .maybeSingle(),
        ]);

      for (const row of videoProgress ?? []) {
        progressByVideo.set(row.video_id, {
          position: row.position_seconds,
          percent: row.percent,
          completed: row.completed,
        });
      }
      status = lessonProgress?.status ?? 'not_started';
      notes.push(...(noteRows ?? []));
      isFavorite = Boolean(fav);
    }

    const quizIds = (quizRows ?? []).map((quiz) => quiz.id);
    const quizzes = await buildQuizSummaries(quizRows ?? [], quizIds, user?.id);

    return {
      lesson,
      course,
      moduleTitle: module?.title ?? '',
      chapterTitle: chapter?.title ?? '',
      unlocked,
      contentMd,
      videos: (videoRows ?? []).map((row) => {
        const progress = progressByVideo.get(row.id);
        return {
          source: resolveVideoSource(row),
          row,
          positionSeconds: progress?.position ?? 0,
          percent: progress?.percent ?? 0,
          completed: progress?.completed ?? false,
        };
      }),
      resources: resources ?? [],
      exercises: exercises ?? [],
      quizzes,
      notes,
      status,
      isFavorite,
    };
  },
);

async function buildQuizSummaries(
  quizRows: Array<{
    id: string;
    title: string;
    description: string | null;
    passing_score: number;
    max_attempts: number | null;
  }>,
  quizIds: string[],
  userId: string | undefined,
): Promise<QuizSummary[]> {
  if (quizRows.length === 0) return [];
  const supabase = await createClient();

  const { data: questionCounts } = await supabase
    .from('questions')
    .select('id, quiz_id')
    .in('quiz_id', quizIds);

  const countByQuiz = new Map<string, number>();
  for (const row of questionCounts ?? []) {
    countByQuiz.set(row.quiz_id, (countByQuiz.get(row.quiz_id) ?? 0) + 1);
  }

  const attemptsByQuiz = new Map<string, { best: number; count: number; passed: boolean }>();
  if (userId) {
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('quiz_id, percentage, passed')
      .eq('user_id', userId)
      .in('quiz_id', quizIds);

    for (const attempt of attempts ?? []) {
      const current = attemptsByQuiz.get(attempt.quiz_id) ?? { best: 0, count: 0, passed: false };
      attemptsByQuiz.set(attempt.quiz_id, {
        best: Math.max(current.best, attempt.percentage),
        count: current.count + 1,
        passed: current.passed || attempt.passed,
      });
    }
  }

  return quizRows.map((quiz) => {
    const stats = attemptsByQuiz.get(quiz.id);
    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      questionCount: countByQuiz.get(quiz.id) ?? 0,
      passingScore: quiz.passing_score,
      maxAttempts: quiz.max_attempts,
      bestPercentage: stats ? stats.best : null,
      attemptsUsed: stats?.count ?? 0,
      passed: stats?.passed ?? false,
    };
  });
}

/** Quiz complet pour la passation. Les bonnes réponses ne sortent JAMAIS d'ici. */
export const getQuizForAttempt = cache(async (quizId: string) => {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) return null;

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', quizId)
    .eq('status', 'published')
    .maybeSingle();

  if (!quiz) return null;

  const { data: questions } = await supabase
    .from('questions')
    .select('id, type, prompt, media_url, points, sort_order')
    .eq('quiz_id', quizId)
    .order('sort_order');

  const questionIds = (questions ?? []).map((question) => question.id);

  // `is_correct` est révoqué au niveau colonne : impossible de le lire ici,
  // même en le demandant explicitement. La correction passe par le serveur.
  const { data: answers } = questionIds.length
    ? await supabase
        .from('answers')
        .select('id, question_id, label, sort_order')
        .in('question_id', questionIds)
        .order('sort_order')
    : { data: [] };

  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('id, attempt_number, percentage, passed, submitted_at')
    .eq('user_id', user.id)
    .eq('quiz_id', quizId)
    .order('attempt_number', { ascending: false });

  const answersByQuestion = new Map<string, Array<{ id: string; label: string }>>();
  for (const answer of answers ?? []) {
    const list = answersByQuestion.get(answer.question_id) ?? [];
    list.push({ id: answer.id, label: answer.label });
    answersByQuestion.set(answer.question_id, list);
  }

  const course = await supabase
    .from('courses')
    .select('id, slug, title')
    .eq('id', quiz.course_id)
    .maybeSingle();

  return {
    quiz,
    course: course.data,
    questions: (questions ?? []).map((question) => ({
      ...question,
      answers: answersByQuestion.get(question.id) ?? [],
    })),
    attempts: attempts ?? [],
    attemptsUsed: attempts?.length ?? 0,
    canAttempt: quiz.max_attempts === null || (attempts?.length ?? 0) < quiz.max_attempts,
  };
});
