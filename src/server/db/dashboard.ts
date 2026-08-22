import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser, getEntitlements, canAccessCourse } from '@/server/auth/session';
import type { CourseCard } from '@/types/domain';
import { computeLevel } from '@/lib/utils/gamification';

export interface ContinueCard {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  thumbnailUrl: string | null;
  subjectName: string;
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  percent: number;
  lessonsCompleted: number;
  lessonsTotal: number;
}

export interface DashboardStats {
  xp: number;
  level: number;
  xpInLevel: number;
  xpForNextLevel: number;
  streakCurrent: number;
  streakLongest: number;
  lessonsCompleted: number;
  coursesCompleted: number;
  quizzesPassed: number;
  studyMinutesWeek: number;
  studyMinutesTotal: number;
}

export const getDashboardStats = cache(async (): Promise<DashboardStats | null> => {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) return null;

  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const [lessons, courses, quizzes, sessionsWeek, sessionsAll] = await Promise.all([
    supabase
      .from('lesson_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed'),
    supabase
      .from('course_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed'),
    supabase
      .from('quiz_attempts')
      .select('quiz_id')
      .eq('user_id', user.id)
      .eq('passed', true),
    supabase
      .from('study_sessions')
      .select('duration_seconds')
      .eq('user_id', user.id)
      .gte('started_at', weekAgo),
    supabase.from('study_sessions').select('duration_seconds').eq('user_id', user.id),
  ]);

  const sum = (rows: Array<{ duration_seconds: number }> | null) =>
    Math.round((rows ?? []).reduce((total, row) => total + row.duration_seconds, 0) / 60);

  const { level, xpInLevel, xpForNextLevel } = computeLevel(user.profile.xp);

  return {
    xp: user.profile.xp,
    level,
    xpInLevel,
    xpForNextLevel,
    streakCurrent: user.profile.streak_current,
    streakLongest: user.profile.streak_longest,
    lessonsCompleted: lessons.count ?? 0,
    coursesCompleted: courses.count ?? 0,
    quizzesPassed: new Set((quizzes.data ?? []).map((row) => row.quiz_id)).size,
    studyMinutesWeek: sum(sessionsWeek.data),
    studyMinutesTotal: sum(sessionsAll.data),
  };
});

/** La grande carte « Reprendre là où vous vous êtes arrêté ». */
export const getContinueCard = cache(async (): Promise<ContinueCard | null> => {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) return null;

  const { data: progress } = await supabase
    .from('course_progress')
    .select(
      `course_id, percent, lessons_completed, lessons_total, last_lesson_id,
       course:courses!course_progress_course_id_fkey(
         slug, title, thumbnail_url,
         subject:subjects!courses_subject_id_fkey(name)
       )`,
    )
    .eq('user_id', user.id)
    .neq('status', 'completed')
    .not('last_lesson_id', 'is', null)
    .order('last_activity_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!progress?.course || !progress.last_lesson_id) return null;

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, module_id')
    .eq('id', progress.last_lesson_id)
    .maybeSingle();

  if (!lesson) return null;

  const { data: module } = await supabase
    .from('modules')
    .select('title')
    .eq('id', lesson.module_id)
    .maybeSingle();

  return {
    courseId: progress.course_id,
    courseSlug: progress.course.slug,
    courseTitle: progress.course.title,
    thumbnailUrl: progress.course.thumbnail_url,
    subjectName: progress.course.subject?.name ?? '',
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    moduleTitle: module?.title ?? '',
    percent: progress.percent,
    lessonsCompleted: progress.lessons_completed,
    lessonsTotal: progress.lessons_total,
  };
});

/** Formations en cours, les plus récemment travaillées d'abord. */
export const getCoursesInProgress = cache(async (limit = 3): Promise<CourseCard[]> => {
  const supabase = await createClient();
  const user = await getSessionUser();
  const entitlements = await getEntitlements();
  if (!user) return [];

  const { data } = await supabase
    .from('course_progress')
    .select(
      `percent, lessons_completed,
       course:courses!course_progress_course_id_fkey(
         id, slug, title, summary, thumbnail_url, difficulty, lessons_count,
         duration_seconds, level_id, subject_id,
         level:levels!courses_level_id_fkey(name),
         subject:subjects!courses_subject_id_fkey(name, color, icon)
       )`,
    )
    .eq('user_id', user.id)
    .neq('status', 'completed')
    .order('last_activity_at', { ascending: false })
    .limit(limit);

  return (data ?? [])
    .filter((row) => row.course)
    .map((row) => ({
      id: row.course!.id,
      slug: row.course!.slug,
      title: row.course!.title,
      summary: row.course!.summary,
      thumbnailUrl: row.course!.thumbnail_url,
      difficulty: row.course!.difficulty,
      lessonsCount: row.course!.lessons_count,
      durationSeconds: row.course!.duration_seconds,
      levelId: row.course!.level_id,
      levelName: row.course!.level?.name ?? '',
      subjectId: row.course!.subject_id,
      subjectName: row.course!.subject?.name ?? '',
      subjectColor: row.course!.subject?.color ?? null,
      subjectIcon: row.course!.subject?.icon ?? null,
      progressPercent: row.percent,
      lessonsCompleted: row.lessons_completed,
      unlocked: canAccessCourse(entitlements, {
        id: row.course!.id,
        subject_id: row.course!.subject_id,
      }),
    }));
});

export const getRecentActivity = cache(async (limit = 6) => {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) return [];

  const { data } = await supabase
    .from('lesson_progress')
    .select(
      `lesson_id, status, last_viewed_at, completed_at,
       lesson:lessons!lesson_progress_lesson_id_fkey(title),
       course:courses!lesson_progress_course_id_fkey(title, slug)`,
    )
    .eq('user_id', user.id)
    .order('last_viewed_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    lessonId: row.lesson_id,
    lessonTitle: row.lesson?.title ?? '',
    courseTitle: row.course?.title ?? '',
    courseSlug: row.course?.slug ?? '',
    status: row.status,
    at: row.completed_at ?? row.last_viewed_at,
  }));
});

export const getRecentQuizAttempts = cache(async (limit = 4) => {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) return [];

  const { data } = await supabase
    .from('quiz_attempts')
    .select(
      `id, percentage, passed, submitted_at,
       quiz:quizzes!quiz_attempts_quiz_id_fkey(id, title)`,
    )
    .eq('user_id', user.id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    quizId: row.quiz?.id ?? '',
    title: row.quiz?.title ?? 'Quiz',
    percentage: row.percentage,
    passed: row.passed,
    at: row.submitted_at!,
  }));
});

/**
 * Temps d'étude quotidien sur une fenêtre glissante, jours vides compris.
 *
 * Le calcul vit ici plutôt que dans le composant : une page ne doit pas
 * fabriquer ses propres séries de données, et `Date.now()` n'a rien à faire
 * dans un rendu.
 */
export const getStudySeries = cache(async (days = 30) => {
  const supabase = await createClient();
  const user = await getSessionUser();

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const buckets = new Map<string, number>();
  for (let index = 0; index < days; index += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    buckets.set(date.toISOString().slice(0, 10), 0);
  }

  if (!user) {
    return [...buckets.entries()].map(([date, minutes]) => ({ date, minutes }));
  }

  const { data } = await supabase
    .from('study_sessions')
    .select('started_at, duration_seconds')
    .eq('user_id', user.id)
    .gte('started_at', start.toISOString());

  for (const session of data ?? []) {
    const key = session.started_at.slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + session.duration_seconds / 60);
    }
  }

  return [...buckets.entries()].map(([date, minutes]) => ({
    date,
    minutes: Math.round(minutes),
  }));
});
