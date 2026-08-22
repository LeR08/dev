import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { Enums } from '@/types/database.types';

export interface TreeCourse {
  id: string;
  title: string;
  slug: string;
  status: Enums<'content_status'>;
  sortOrder: number;
  lessonsCount: number;
}

export interface TreeSubject {
  id: string;
  name: string;
  courses: TreeCourse[];
}

export interface TreeLevel {
  id: string;
  name: string;
  status: Enums<'content_status'>;
  subjects: TreeSubject[];
}

/**
 * Racines de l'arborescence : parcours → domaines → formations.
 *
 * On ne charge jamais l'arbre complet d'un coup — modules, chapitres et leçons
 * ne sont récupérés qu'à l'ouverture d'une formation (getCourseTree).
 */
export async function getAdminTreeRoots(): Promise<TreeLevel[]> {
  const supabase = await createClient();

  const [{ data: levels }, { data: subjects }, { data: courses }] = await Promise.all([
    supabase.from('levels').select('id, name, status, sort_order').order('sort_order'),
    supabase.from('subjects').select('id, name, sort_order').order('sort_order'),
    supabase
      .from('courses')
      .select('id, title, slug, status, sort_order, lessons_count, level_id, subject_id')
      .order('sort_order'),
  ]);

  const subjectById = new Map((subjects ?? []).map((subject) => [subject.id, subject]));

  return (levels ?? []).map((level) => {
    const bySubject = new Map<string, TreeCourse[]>();

    for (const course of courses ?? []) {
      if (course.level_id !== level.id) continue;
      const list = bySubject.get(course.subject_id) ?? [];
      list.push({
        id: course.id,
        title: course.title,
        slug: course.slug,
        status: course.status,
        sortOrder: course.sort_order,
        lessonsCount: course.lessons_count,
      });
      bySubject.set(course.subject_id, list);
    }

    return {
      id: level.id,
      name: level.name,
      status: level.status,
      subjects: [...bySubject.entries()]
        .map(([subjectId, list]) => ({
          id: subjectId,
          name: subjectById.get(subjectId)?.name ?? 'Domaine',
          courses: list,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  });
}

export interface TreeLesson {
  id: string;
  title: string;
  status: Enums<'content_status'>;
  sortOrder: number;
  isFreePreview: boolean;
  durationSeconds: number;
  videoCount: number;
  quizCount: number;
  resourceCount: number;
  exerciseCount: number;
}

export interface TreeChapter {
  id: string;
  title: string;
  sortOrder: number;
  lessons: TreeLesson[];
}

export interface TreeModule {
  id: string;
  title: string;
  sortOrder: number;
  chapters: TreeChapter[];
}

/** Sous-arbre complet d'une formation, chargé à la demande. */
export async function getCourseTree(courseId: string): Promise<TreeModule[]> {
  const supabase = await createClient();

  const [{ data: modules }, { data: chapters }, { data: lessons }] = await Promise.all([
    supabase.from('modules').select('id, title, sort_order').eq('course_id', courseId).order('sort_order'),
    supabase
      .from('chapters')
      .select('id, module_id, title, sort_order')
      .eq('course_id', courseId)
      .order('sort_order'),
    supabase
      .from('lessons')
      .select('id, chapter_id, title, status, sort_order, is_free_preview, duration_seconds')
      .eq('course_id', courseId)
      .order('sort_order'),
  ]);

  const lessonIds = (lessons ?? []).map((lesson) => lesson.id);

  const [videos, quizzes, resources, exercises] = await Promise.all([
    countBy('videos', lessonIds),
    countBy('quizzes', lessonIds),
    countBy('resources', lessonIds),
    countBy('exercises', lessonIds),
  ]);

  const lessonsByChapter = new Map<string, TreeLesson[]>();
  for (const lesson of lessons ?? []) {
    const list = lessonsByChapter.get(lesson.chapter_id) ?? [];
    list.push({
      id: lesson.id,
      title: lesson.title,
      status: lesson.status,
      sortOrder: lesson.sort_order,
      isFreePreview: lesson.is_free_preview,
      durationSeconds: lesson.duration_seconds,
      videoCount: videos.get(lesson.id) ?? 0,
      quizCount: quizzes.get(lesson.id) ?? 0,
      resourceCount: resources.get(lesson.id) ?? 0,
      exerciseCount: exercises.get(lesson.id) ?? 0,
    });
    lessonsByChapter.set(lesson.chapter_id, list);
  }

  const chaptersByModule = new Map<string, TreeChapter[]>();
  for (const chapter of chapters ?? []) {
    const list = chaptersByModule.get(chapter.module_id) ?? [];
    list.push({
      id: chapter.id,
      title: chapter.title,
      sortOrder: chapter.sort_order,
      lessons: lessonsByChapter.get(chapter.id) ?? [],
    });
    chaptersByModule.set(chapter.module_id, list);
  }

  return (modules ?? []).map((module) => ({
    id: module.id,
    title: module.title,
    sortOrder: module.sort_order,
    chapters: chaptersByModule.get(module.id) ?? [],
  }));
}

async function countBy(
  table: 'videos' | 'quizzes' | 'resources' | 'exercises',
  lessonIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (lessonIds.length === 0) return map;

  const supabase = await createClient();
  const { data } = await supabase.from(table).select('lesson_id').in('lesson_id', lessonIds);

  for (const row of data ?? []) {
    if (!row.lesson_id) continue;
    map.set(row.lesson_id, (map.get(row.lesson_id) ?? 0) + 1);
  }
  return map;
}
