'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  CirclePlay,
  FileQuestion,
  Lock,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { routes } from '@/lib/constants/routes';
import { cn, formatDuration, pluralize } from '@/lib/utils';
import type { ModuleNode } from '@/types/domain';

/**
 * Sommaire LMS : modules → chapitres → leçons, avec l'état de chaque leçon.
 * Les leçons verrouillées restent visibles — c'est le programme que voit un
 * membre avant d'activer son code.
 */
export function Syllabus({
  modules,
  currentLessonId,
  compact = false,
}: {
  modules: ModuleNode[];
  currentLessonId?: string;
  compact?: boolean;
}) {
  // Ouvre par défaut le module contenant la leçon courante, sinon le premier
  // module non terminé.
  const defaultOpen = React.useMemo(() => {
    if (currentLessonId) {
      const found = modules.find((module) =>
        module.chapters.some((chapter) =>
          chapter.lessons.some((lesson) => lesson.id === currentLessonId),
        ),
      );
      if (found) return [found.id];
    }
    const pending = modules.find((module) => !module.completed);
    return pending ? [pending.id] : modules.slice(0, 1).map((module) => module.id);
  }, [modules, currentLessonId]);

  return (
    <Accordion type="multiple" defaultValue={defaultOpen} className="divide-y">
      {modules.map((module, index) => (
        <AccordionItem key={module.id} value={module.id} className="border-b-0">
          <AccordionTrigger className="gap-3 py-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold',
                  module.completed
                    ? 'bg-success-muted text-success'
                    : 'bg-muted text-muted-foreground',
                )}
                aria-hidden
              >
                {module.completed ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
              </span>
              <span className="min-w-0 flex-1 space-y-1.5">
                <span className="block truncate text-sm font-medium">{module.title}</span>
                <span className="text-muted-foreground flex items-center gap-2 text-xs font-normal">
                  {module.lessonsCompleted} / {module.lessonsTotal}{' '}
                  {pluralize(module.lessonsTotal, 'leçon')}
                </span>
                {module.lessonsTotal > 0 && (
                  <Progress
                    value={(module.lessonsCompleted / module.lessonsTotal) * 100}
                    size="sm"
                    tone={module.completed ? 'success' : 'primary'}
                    className="max-w-56"
                  />
                )}
              </span>
            </div>
            <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform" />
          </AccordionTrigger>

          <AccordionContent className="space-y-4 pl-9">
            {module.chapters.map((chapter) => (
              <div key={chapter.id} className="space-y-1">
                {!compact && (
                  <p className="text-muted-foreground px-2 pt-1 pb-1.5 text-xs font-medium tracking-wide uppercase">
                    {chapter.title}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {chapter.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <LessonRow lesson={lesson} isCurrent={lesson.id === currentLessonId} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function LessonRow({
  lesson,
  isCurrent,
}: {
  lesson: ModuleNode['chapters'][number]['lessons'][number];
  isCurrent: boolean;
}) {
  const Icon =
    lesson.status === 'completed'
      ? Check
      : lesson.locked
        ? Lock
        : isCurrent
          ? CirclePlay
          : PlayCircle;

  const content = (
    <>
      <Icon
        className={cn(
          'size-4 shrink-0',
          lesson.status === 'completed' && 'text-success',
          lesson.locked && 'text-muted-foreground',
          isCurrent && 'text-primary',
        )}
        strokeWidth={lesson.status === 'completed' ? 3 : 2}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
      {lesson.isFreePreview && lesson.locked && (
        <Badge variant="primary" className="shrink-0">
          <Sparkles /> Gratuit
        </Badge>
      )}
      {lesson.hasQuiz && (
        <FileQuestion className="text-muted-foreground size-3.5 shrink-0" aria-label="Quiz inclus" />
      )}
      {lesson.durationSeconds > 0 && (
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {formatDuration(lesson.durationSeconds)}
        </span>
      )}
    </>
  );

  const className = cn(
    'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors',
    isCurrent
      ? 'bg-primary-muted text-primary font-medium'
      : lesson.locked
        ? 'text-muted-foreground cursor-not-allowed'
        : 'hover:bg-muted',
  );

  if (lesson.locked) {
    return (
      <div className={className} title="Activez votre code d'accès pour débloquer cette leçon">
        {content}
      </div>
    );
  }

  return (
    <Link href={routes.lesson(lesson.id)} className={className}>
      {content}
    </Link>
  );
}
