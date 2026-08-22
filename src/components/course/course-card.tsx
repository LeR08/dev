import Link from 'next/link';
import Image from 'next/image';
import { Clock, Lock, PlayCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { routes } from '@/lib/constants/routes';
import { cn, formatDuration, pluralize } from '@/lib/utils';
import { DIFFICULTY_LABELS, type CourseCard as CourseCardData } from '@/types/domain';

const difficultyTone = {
  beginner: 'success',
  intermediate: 'primary',
  advanced: 'warning',
} as const;

export function CourseCard({ course }: { course: CourseCardData }) {
  const started = typeof course.progressPercent === 'number' && course.progressPercent > 0;

  return (
    <Link
      href={routes.course(course.slug)}
      className="group bg-card focus-visible:ring-primary/40 flex flex-col overflow-hidden rounded-xl border shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="bg-muted relative aspect-video overflow-hidden">
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="grid h-full place-items-center"
            style={
              course.subjectColor
                ? { background: `color-mix(in oklab, ${course.subjectColor} 16%, transparent)` }
                : undefined
            }
          >
            <PlayCircle className="text-muted-foreground size-9" aria-hidden />
          </div>
        )}

        {!course.unlocked && (
          <div className="absolute inset-0 grid place-items-center bg-black/45 backdrop-blur-[1px]">
            <span className="flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white">
              <Lock className="size-3" aria-hidden /> Verrouillé
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{course.subjectName}</Badge>
          <Badge variant={difficultyTone[course.difficulty]}>
            {DIFFICULTY_LABELS[course.difficulty]}
          </Badge>
        </div>

        <div className="flex-1 space-y-1">
          <h3 className="group-hover:text-primary line-clamp-2 leading-snug font-semibold transition-colors">
            {course.title}
          </h3>
          {course.summary && (
            <p className="text-muted-foreground line-clamp-2 text-sm">{course.summary}</p>
          )}
        </div>

        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <PlayCircle className="size-3.5" aria-hidden />
            {course.lessonsCount} {pluralize(course.lessonsCount, 'leçon')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {formatDuration(course.durationSeconds)}
          </span>
        </div>

        {started && (
          <div className="space-y-1.5">
            <Progress value={course.progressPercent} size="sm" />
            <p className="text-muted-foreground text-xs">
              {course.lessonsCompleted ?? 0} / {course.lessonsCount} · {Math.round(course.progressPercent!)} %
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

export function CourseGrid({ courses, className }: { courses: CourseCardData[]; className?: string }) {
  return (
    <div className={cn('grid gap-5 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}
