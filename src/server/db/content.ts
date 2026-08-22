import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser, getEntitlements, canAccessCourse } from '@/server/auth/session';
import type {
  ChapterNode,
  CourseCard,
  CourseDetail,
  LessonNeighbours,
  LessonNode,
  ModuleNode,
} from '@/types/domain';
import type { Enums } from '@/types/database.types';

export const CATALOG_PAGE_SIZE = 12;

export const getLevels = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('levels')
    .select('id, slug, name, description, sort_order')
    .eq('status', 'published')
    .order('sort_order');
  return data ?? [];
});

export const getSubjects = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subjects')
    .select('id, slug, name, description, icon, color, sort_order')
    .eq('status', 'published')
    .order('sort_order');
  return data ?? [];
});

export interface CatalogFilters {
  levelId?: string;
  subjectId?: string;
  difficulty?: Enums<'difficulty_level'>;
  maxHours?: number;
  search?: string;
  page?: number;
  pageSize?: number;
  onlyStarted?: boolean;
  onlyFavorites?: boolean;
}

/**
 * Catalogue paginé.
 *
 * Trois requêtes courtes plutôt qu'une jointure profonde : la liste, puis la
 * progression et les favoris du membre pour ces seules formations. Jamais de
 * `select('*')`, jamais de chargement complet de la table.
 */
export async function getCourseCatalog(filters: CatalogFilters): Promise<{
  courses: CourseCard[];
  total: number;
  page: number;
  pageCount: number;
}> {
  const supabase = await createClient();
  const user = await getSessionUser();
  const entitlements = await getEntitlements();

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? CATALOG_PAGE_SIZE;

  let startedIds: string[] | null = null;
  if (filters.onlyStarted && user) {
    const { data } = await supabase
      .from('course_progress')
      .select('course_id')
      .eq('user_id', user.id);
    startedIds = (data ?? []).map((row) => row.course_id);
    if (startedIds.length === 0) {
      return { courses: [], total: 0, page: 1, pageCount: 0 };
    }
  }

  let favoriteIds: string[] | null = null;
  if (filters.onlyFavorites && user) {
    const { data } = await supabase
      .from('favorites')
      .select('course_id')
      .eq('user_id', user.id)
      .not('course_id', 'is', null);
    favoriteIds = (data ?? []).map((row) => row.course_id!).filter(Boolean);
    if (favoriteIds.length === 0) {
      return { courses: [], total: 0, page: 1, pageCount: 0 };
    }
  }

  let query = supabase
    .from('courses')
    .select(
      `id, slug, title, summary, thumbnail_url, difficulty, lessons_count, duration_seconds,
       level_id, subject_id,
       level:levels!courses_level_id_fkey(id, name),
       subject:subjects!courses_subject_id_fkey(id, name, color, icon)`,
      { count: 'exact' },
    )
    .eq('status', 'published');

  if (filters.levelId) query = query.eq('level_id', filters.levelId);
  if (filters.subjectId) query = query.eq('subject_id', filters.subjectId);
  if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);
  if (filters.maxHours) query = query.lte('duration_seconds', filters.maxHours * 3600);
  if (startedIds) query = query.in('id', startedIds);
  if (favoriteIds) query = query.in('id', favoriteIds);

  if (filters.search?.trim()) {
    // Recherche plein texte sur l'index GIN, jamais un ILIKE '%…%'.
    query = query.textSearch('search_vector', filters.search.trim(), {
      type: 'websearch',
      config: 'french',
    });
  }

  const from = (page - 1) * pageSize;
  const { data, count, error } = await query
    .order('sort_order')
    .order('title')
    .range(from, from + pageSize - 1);

  if (error) throw new Error(`Catalogue indisponible : ${error.message}`);

  const rows = data ?? [];
  const courseIds = rows.map((row) => row.id);

  const [progressMap, favoriteSet] = await Promise.all([
    getProgressMap(courseIds),
    getFavoriteCourseIds(courseIds),
  ]);

  const courses: CourseCard[] = rows.map((row) => {
    const progress = progressMap.get(row.id);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      thumbnailUrl: row.thumbnail_url,
      difficulty: row.difficulty,
      lessonsCount: row.lessons_count,
      durationSeconds: row.duration_seconds,
      levelId: row.level_id,
      levelName: row.level?.name ?? '',
      subjectId: row.subject_id,
      subjectName: row.subject?.name ?? '',
      subjectColor: row.subject?.color ?? null,
      subjectIcon: row.subject?.icon ?? null,
      progressPercent: progress?.percent,
      lessonsCompleted: progress?.lessonsCompleted,
      unlocked: canAccessCourse(entitlements, { id: row.id, subject_id: row.subject_id }),
      isFavorite: favoriteSet.has(row.id),
    };
  });

  const total = count ?? 0;
  return { courses, total, page, pageCount: Math.ceil(total / pageSize) };
}

async function getProgressMap(courseIds: string[]) {
  const map = new Map<string, { percent: number; lessonsCompleted: number }>();
  if (courseIds.length === 0) return map;

  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) return map;

  const { data } = await supabase
    .from('course_progress')
    .select('course_id, percent, lessons_completed')
    .eq('user_id', user.id)
    .in('course_id', courseIds);

  for (const row of data ?? []) {
    map.set(row.course_id, { percent: row.percent, lessonsCompleted: row.lessons_completed });
  }
  return map;
}

async function getFavoriteCourseIds(courseIds: string[]) {
  const set = new Set<string>();
  if (courseIds.length === 0) return set;

  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) return set;

  const { data } = await supabase
    .from('favorites')
    .select('course_id')
    .eq('user_id', user.id)
    .in('course_id', courseIds);

  for (const row of data ?? []) if (row.course_id) set.add(row.course_id);
  return set;
}

/**
 * Détail complet d'une formation : arbre modules → chapitres → leçons.
 *
 * Quatre requêtes plates assemblées en mémoire plutôt qu'un embed à trois
 * niveaux — PostgREST ne sait pas trier les niveaux profonds de façon fiable,
 * et chacune de ces requêtes utilise un index dédié.
 */
export const getCourseDetail = cache(async (slug: string): Promise<CourseDetail | null> => {
  const supabase = await createClient();
  const user = await getSessionUser();
  const entitlements = await getEntitlements();

  const { data: course } = await supabase
    .from('courses')
    .select(
      `*, level:levels!courses_level_id_fkey(id, name, slug),
          subject:subjects!courses_subject_id_fkey(id, name, slug, color, icon)`,
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (!course || !course.level || !course.subject) return null;

  const unlocked = canAccessCourse(entitlements, {
    id: course.id,
    subject_id: course.subject_id,
  });

  const [{ data: modules }, { data: chapters }, { data: lessons }] = await Promise.all([
    supabase
      .from('modules')
      .select('id, title, description, sort_order')
      .eq('course_id', course.id)
      .eq('status', 'published')
      .order('sort_order'),
    supabase
      .from('chapters')
      .select('id, module_id, title, description, sort_order')
      .eq('course_id', course.id)
      .eq('status', 'published')
      .order('sort_order'),
    supabase
      .from('lessons')
      .select('id, chapter_id, slug, title, description, duration_seconds, sort_order, is_free_preview')
      .eq('course_id', course.id)
      .eq('status', 'published')
      .order('sort_order'),
  ]);

  const lessonIds = (lessons ?? []).map((lesson) => lesson.id);

  // Les vidéos et quiz sont masqués par la RLS pour un membre sans accès :
  // on n'affiche alors que la structure, ce qui est exactement l'intention.
  const [videoLessonIds, quizLessonIds, progressByLesson] = await Promise.all([
    getLessonIdsHaving('videos', lessonIds),
    getLessonIdsHaving('quizzes', lessonIds),
    getLessonProgress(lessonIds),
  ]);

  const lessonsByChapter = new Map<string, LessonNode[]>();
  for (const lesson of lessons ?? []) {
    const node: LessonNode = {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      description: lesson.description,
      durationSeconds: lesson.duration_seconds,
      sortOrder: lesson.sort_order,
      isFreePreview: lesson.is_free_preview,
      hasVideo: videoLessonIds.has(lesson.id),
      hasQuiz: quizLessonIds.has(lesson.id),
      status: progressByLesson.get(lesson.id) ?? 'not_started',
      locked: !unlocked && !lesson.is_free_preview,
    };
    const list = lessonsByChapter.get(lesson.chapter_id) ?? [];
    list.push(node);
    lessonsByChapter.set(lesson.chapter_id, list);
  }

  const chaptersByModule = new Map<string, ChapterNode[]>();
  for (const chapter of chapters ?? []) {
    const chapterLessons = lessonsByChapter.get(chapter.id) ?? [];
    const completed = chapterLessons.filter((l) => l.status === 'completed').length;
    const node: ChapterNode = {
      id: chapter.id,
      title: chapter.title,
      description: chapter.description,
      sortOrder: chapter.sort_order,
      lessons: chapterLessons,
      lessonsCompleted: completed,
      completed: chapterLessons.length > 0 && completed === chapterLessons.length,
    };
    const list = chaptersByModule.get(chapter.module_id) ?? [];
    list.push(node);
    chaptersByModule.set(chapter.module_id, list);
  }

  const moduleNodes: ModuleNode[] = (modules ?? []).map((module) => {
    const moduleChapters = chaptersByModule.get(module.id) ?? [];
    const all = moduleChapters.flatMap((chapter) => chapter.lessons);
    const completed = all.filter((lesson) => lesson.status === 'completed').length;
    return {
      id: module.id,
      title: module.title,
      description: module.description,
      sortOrder: module.sort_order,
      chapters: moduleChapters,
      lessonsTotal: all.length,
      lessonsCompleted: completed,
      completed: all.length > 0 && completed === all.length,
    };
  });

  const lessonsTotal = lessonIds.length;
  const lessonsCompleted = [...progressByLesson.values()].filter((s) => s === 'completed').length;

  let resumeLessonId: string | null = null;
  let isFavorite = false;

  if (user) {
    const [{ data: progress }, { data: favorite }] = await Promise.all([
      supabase
        .from('course_progress')
        .select('last_lesson_id')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .maybeSingle(),
      supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .maybeSingle(),
    ]);
    resumeLessonId = progress?.last_lesson_id ?? null;
    isFavorite = Boolean(favorite);
  }

  // Sans reprise enregistrée : première leçon non terminée, sinon la première.
  const orderedLessons = moduleNodes.flatMap((m) => m.chapters.flatMap((c) => c.lessons));
  if (!resumeLessonId) {
    resumeLessonId =
      orderedLessons.find((lesson) => lesson.status !== 'completed')?.id ??
      orderedLessons[0]?.id ??
      null;
  }

  return {
    course,
    level: course.level,
    subject: course.subject,
    modules: moduleNodes,
    lessonsTotal,
    lessonsCompleted,
    progressPercent: lessonsTotal === 0 ? 0 : Math.round((lessonsCompleted / lessonsTotal) * 100),
    unlocked,
    resumeLessonId,
    isFavorite,
  };
});

async function getLessonIdsHaving(table: 'videos' | 'quizzes', lessonIds: string[]) {
  const set = new Set<string>();
  if (lessonIds.length === 0) return set;
  const supabase = await createClient();
  const { data } = await supabase.from(table).select('lesson_id').in('lesson_id', lessonIds);
  for (const row of data ?? []) if (row.lesson_id) set.add(row.lesson_id);
  return set;
}

async function getLessonProgress(lessonIds: string[]) {
  const map = new Map<string, LessonNode['status']>();
  if (lessonIds.length === 0) return map;
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) return map;

  const { data } = await supabase
    .from('lesson_progress')
    .select('lesson_id, status')
    .eq('user_id', user.id)
    .in('lesson_id', lessonIds);

  for (const row of data ?? []) map.set(row.lesson_id, row.status);
  return map;
}

/** Fil de lecture d'un cours : sert au précédent / suivant du lecteur. */
export const getLessonNeighbours = cache(
  async (courseId: string, lessonId: string): Promise<LessonNeighbours> => {
    const supabase = await createClient();
    const { data: modules } = await supabase
      .from('modules')
      .select('id, sort_order')
      .eq('course_id', courseId)
      .eq('status', 'published')
      .order('sort_order');

    const { data: chapters } = await supabase
      .from('chapters')
      .select('id, module_id, sort_order')
      .eq('course_id', courseId)
      .eq('status', 'published')
      .order('sort_order');

    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, chapter_id, title, sort_order')
      .eq('course_id', courseId)
      .eq('status', 'published')
      .order('sort_order');

    const moduleRank = new Map((modules ?? []).map((m, i) => [m.id, i]));
    const chapterRank = new Map(
      (chapters ?? []).map((c) => [c.id, (moduleRank.get(c.module_id) ?? 0) * 1000 + c.sort_order]),
    );

    const ordered = [...(lessons ?? [])].sort((a, b) => {
      const rankA = chapterRank.get(a.chapter_id) ?? 0;
      const rankB = chapterRank.get(b.chapter_id) ?? 0;
      return rankA - rankB || a.sort_order - b.sort_order;
    });

    const index = ordered.findIndex((lesson) => lesson.id === lessonId);
    return {
      previous: index > 0 ? { id: ordered[index - 1].id, title: ordered[index - 1].title } : null,
      next:
        index >= 0 && index < ordered.length - 1
          ? { id: ordered[index + 1].id, title: ordered[index + 1].title }
          : null,
      index: index + 1,
      total: ordered.length,
    };
  },
);
