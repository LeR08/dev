import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser, getEntitlements, canAccessCourse } from '@/server/auth/session';
import type { CourseCard } from '@/types/domain';

/**
 * Recommandations — sans IA, comme prévu pour la v1.
 *
 * Un score simple et explicable, calculé sur le catalogue publié :
 *   +40  le domaine fait partie des centres d'intérêt déclarés
 *   +30  le domaine a déjà été travaillé (une formation commencée dedans)
 *   +25  le parcours correspond à celui du membre
 *   +15  la difficulté suit logiquement les formations déjà terminées
 *   +10  la formation est débloquée sur le compte
 *   −∞   formation déjà commencée (elle a sa propre section)
 *
 * Le tout se calcule sur quelques centaines de lignes au maximum : pas de
 * requête lourde, pas de dépendance externe.
 */
export const getRecommendedCourses = cache(async (limit = 3): Promise<CourseCard[]> => {
  const supabase = await createClient();
  const user = await getSessionUser();
  const entitlements = await getEntitlements();
  if (!user) return [];

  const [{ data: interests }, { data: progress }, { data: courses }] = await Promise.all([
    supabase.from('user_subject_interests').select('subject_id').eq('user_id', user.id),
    supabase
      .from('course_progress')
      .select('course_id, status, course:courses!course_progress_course_id_fkey(subject_id, difficulty)')
      .eq('user_id', user.id),
    supabase
      .from('courses')
      .select(
        `id, slug, title, summary, thumbnail_url, difficulty, lessons_count, duration_seconds,
         level_id, subject_id,
         level:levels!courses_level_id_fkey(name),
         subject:subjects!courses_subject_id_fkey(name, color, icon)`,
      )
      .eq('status', 'published')
      .limit(200),
  ]);

  const interestIds = new Set((interests ?? []).map((row) => row.subject_id));
  const startedIds = new Set((progress ?? []).map((row) => row.course_id));

  const workedSubjects = new Set(
    (progress ?? []).map((row) => row.course?.subject_id).filter(Boolean) as string[],
  );

  const completedDifficulties = new Set(
    (progress ?? [])
      .filter((row) => row.status === 'completed')
      .map((row) => row.course?.difficulty)
      .filter(Boolean) as string[],
  );

  // Difficulté « logique » : celle qui suit ce qui est déjà terminé.
  const nextDifficulty = completedDifficulties.has('intermediate')
    ? 'advanced'
    : completedDifficulties.has('beginner')
      ? 'intermediate'
      : 'beginner';

  const scored = (courses ?? [])
    .filter((course) => !startedIds.has(course.id))
    .map((course) => {
      const unlocked = canAccessCourse(entitlements, {
        id: course.id,
        subject_id: course.subject_id,
      });

      let score = 0;
      if (interestIds.has(course.subject_id)) score += 40;
      if (workedSubjects.has(course.subject_id)) score += 30;
      if (course.level_id === user.profile.level_id) score += 25;
      if (course.difficulty === nextDifficulty) score += 15;
      if (unlocked) score += 10;

      return { course, score, unlocked };
    })
    .sort((a, b) => b.score - a.score || a.course.title.localeCompare(b.course.title))
    .slice(0, limit);

  return scored.map(({ course, unlocked }) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    summary: course.summary,
    thumbnailUrl: course.thumbnail_url,
    difficulty: course.difficulty,
    lessonsCount: course.lessons_count,
    durationSeconds: course.duration_seconds,
    levelId: course.level_id,
    levelName: course.level?.name ?? '',
    subjectId: course.subject_id,
    subjectName: course.subject?.name ?? '',
    subjectColor: course.subject?.color ?? null,
    subjectIcon: course.subject?.icon ?? null,
    unlocked,
  }));
});
