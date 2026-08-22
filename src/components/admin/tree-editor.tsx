'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ChevronRight,
  FileQuestion,
  FolderOpen,
  Layers,
  Loader2,
  Paperclip,
  PencilRuler,
  Play,
  Sparkles,
  Tag,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SortableList } from './sortable-list';
import { useToast } from '@/components/ui/toast';
import { loadCourseTree } from '@/server/actions/tree.actions';
import { reorderEntities } from '@/server/actions/admin.actions';
import { routes } from '@/lib/constants/routes';
import { cn, formatDuration, pluralize } from '@/lib/utils';
import type { TreeLevel, TreeModule } from '@/server/db/admin';

/**
 * Arborescence complète du catalogue (§20 du cahier des charges).
 *
 * Le sous-arbre d'une formation n'est chargé qu'à son ouverture : afficher
 * 300 leçons d'un coup serait à la fois lent et illisible.
 */
export function TreeEditor({ levels }: { levels: TreeLevel[] }) {
  const { toast } = useToast();
  const [openLevels, setOpenLevels] = React.useState<Set<string>>(
    () => new Set(levels.slice(0, 1).map((level) => level.id)),
  );
  const [openCourses, setOpenCourses] = React.useState<Set<string>>(new Set());
  const [trees, setTrees] = React.useState<Record<string, TreeModule[]>>({});
  const [loading, setLoading] = React.useState<string | null>(null);

  async function toggleCourse(courseId: string) {
    setOpenCourses((current) => {
      const next = new Set(current);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });

    if (trees[courseId]) return;

    setLoading(courseId);
    const result = await loadCourseTree(courseId);
    setLoading(null);

    if (!result.ok) {
      toast({ title: 'Chargement impossible', description: result.error, tone: 'error' });
      return;
    }
    setTrees((current) => ({ ...current, [courseId]: result.data }));
  }

  async function reorder(entity: string, parentId: string | null, orderedIds: string[]) {
    const result = await reorderEntities({ entity, parentId, orderedIds });
    if (!result.ok) {
      toast({ title: 'Réordonnancement impossible', description: result.error, tone: 'error' });
      return;
    }
    toast({ title: 'Ordre enregistré', tone: 'success' });
  }

  if (levels.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed py-12 text-center text-sm">
        Aucun parcours. Créez d&apos;abord un parcours et un domaine.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {levels.map((level) => {
        const open = openLevels.has(level.id);
        return (
          <div key={level.id} className="bg-card overflow-hidden rounded-xl border">
            <button
              type="button"
              onClick={() =>
                setOpenLevels((current) => {
                  const next = new Set(current);
                  if (next.has(level.id)) next.delete(level.id);
                  else next.add(level.id);
                  return next;
                })
              }
              aria-expanded={open}
              className="hover:bg-muted flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors"
            >
              <ChevronRight className={cn('size-4 shrink-0 transition-transform', open && 'rotate-90')} />
              <Layers className="text-primary size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-medium">{level.name}</span>
              {level.status !== 'published' && <Badge variant="warning">Brouillon</Badge>}
              <span className="text-muted-foreground shrink-0 text-xs">
                {level.subjects.reduce((sum, s) => sum + s.courses.length, 0)}{' '}
                {pluralize(level.subjects.reduce((sum, s) => sum + s.courses.length, 0), 'formation')}
              </span>
            </button>

            {open && (
              <div className="space-y-4 border-t px-4 py-4">
                {level.subjects.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Aucune formation rattachée à ce parcours.
                  </p>
                )}

                {level.subjects.map((subject) => (
                  <div key={subject.id} className="space-y-2">
                    <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
                      <Tag className="size-3.5" aria-hidden />
                      {subject.name}
                    </p>

                    <SortableList
                      items={subject.courses}
                      className="space-y-1.5"
                      onReorder={(ids) => reorder('courses', subject.id, ids)}
                      renderItem={(course) => {
                        const courseOpen = openCourses.has(course.id);
                        return (
                          <div className="rounded-lg border">
                            <div className="flex items-center gap-2 px-3 py-2.5">
                              <button
                                type="button"
                                onClick={() => toggleCourse(course.id)}
                                aria-expanded={courseOpen}
                                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                              >
                                <ChevronRight
                                  className={cn(
                                    'size-3.5 shrink-0 transition-transform',
                                    courseOpen && 'rotate-90',
                                  )}
                                />
                                <BookOpen className="size-4 shrink-0 text-[color:var(--primary)]" aria-hidden />
                                <span className="truncate text-sm font-medium">{course.title}</span>
                                {course.status !== 'published' && (
                                  <Badge variant="warning">Brouillon</Badge>
                                )}
                              </button>

                              <span className="text-muted-foreground shrink-0 text-xs">
                                {course.lessonsCount} {pluralize(course.lessonsCount, 'leçon')}
                              </span>
                              <Button asChild size="sm" variant="ghost">
                                <Link href={routes.adminCourse(course.id)}>Éditer</Link>
                              </Button>
                            </div>

                            {courseOpen && (
                              <div className="space-y-3 border-t px-3 py-3">
                                {loading === course.id ? (
                                  <div className="text-muted-foreground flex items-center gap-2 py-3 text-sm">
                                    <Loader2 className="size-4 animate-spin" /> Chargement…
                                  </div>
                                ) : (
                                  <ModuleTree
                                    courseId={course.id}
                                    modules={trees[course.id] ?? []}
                                    onReorder={reorder}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ModuleTree({
  courseId,
  modules,
  onReorder,
}: {
  courseId: string;
  modules: TreeModule[];
  onReorder: (entity: string, parentId: string | null, ids: string[]) => Promise<void>;
}) {
  if (modules.length === 0) {
    return (
      <p className="text-muted-foreground py-2 text-sm">
        Aucun module. Ajoutez-en un depuis la page d&apos;édition de la formation.
      </p>
    );
  }

  return (
    <SortableList
      items={modules}
      className="space-y-3"
      onReorder={(ids) => onReorder('modules', courseId, ids)}
      renderItem={(module, index) => (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <FolderOpen className="text-muted-foreground size-4" aria-hidden />
            Module {index + 1} — {module.title}
          </p>

          <div className="space-y-2 pl-5">
            <SortableList
              items={module.chapters}
              className="space-y-2"
              onReorder={(ids) => onReorder('chapters', module.id, ids)}
              renderItem={(chapter) => (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">{chapter.title}</p>

                  <div className="pl-3">
                    <SortableList
                      items={chapter.lessons}
                      className="space-y-0.5"
                      onReorder={(ids) => onReorder('lessons', chapter.id, ids)}
                      renderItem={(lesson) => (
                        <Link
                          href={routes.adminLesson(lesson.id)}
                          className="hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
                        >
                          <Play className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                          <span className="min-w-0 flex-1 truncate">{lesson.title}</span>

                          {lesson.isFreePreview && (
                            <Badge variant="primary">
                              <Sparkles /> Gratuit
                            </Badge>
                          )}
                          {lesson.status !== 'published' && <Badge variant="warning">Brouillon</Badge>}

                          <span className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
                            {lesson.videoCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Play className="size-3" aria-hidden /> {lesson.videoCount}
                              </span>
                            )}
                            {lesson.quizCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <FileQuestion className="size-3" aria-hidden /> {lesson.quizCount}
                              </span>
                            )}
                            {lesson.resourceCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Paperclip className="size-3" aria-hidden /> {lesson.resourceCount}
                              </span>
                            )}
                            {lesson.exerciseCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <PencilRuler className="size-3" aria-hidden /> {lesson.exerciseCount}
                              </span>
                            )}
                            {lesson.durationSeconds > 0 && (
                              <span className="tabular-nums">
                                {formatDuration(lesson.durationSeconds)}
                              </span>
                            )}
                          </span>
                        </Link>
                      )}
                    />
                  </div>
                </div>
              )}
            />
          </div>
        </div>
      )}
    />
  );
}
