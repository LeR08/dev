import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { LessonWorkspace } from '@/components/player/lesson-workspace';
import { LockedNotice } from '@/components/access/locked-notice';
import { Syllabus } from '@/components/course/syllabus';
import { Progress } from '@/components/ui/progress';
import { getLessonPlayerData } from '@/server/db/lessons';
import { getCourseDetail, getLessonNeighbours } from '@/server/db/content';
import { withDownloadUrls } from '@/server/db/resources';
import { routes } from '@/lib/constants/routes';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}): Promise<Metadata> {
  const { lessonId } = await params;
  const data = await getLessonPlayerData(lessonId);
  if (!data) return { title: 'Leçon introuvable' };

  return {
    title: data.lesson.title,
    description: data.lesson.description ?? undefined,
    // Page privée : jamais indexée.
    robots: { index: false, follow: false },
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const data = await getLessonPlayerData(lessonId);
  if (!data) notFound();

  const [neighbours, courseDetail, resources] = await Promise.all([
    getLessonNeighbours(data.course.id, lessonId),
    getCourseDetail(data.course.slug),
    withDownloadUrls(data.resources),
  ]);

  return (
    <div className="space-y-6">
      <nav aria-label="Fil d'Ariane" className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
        <Link href={routes.course(data.course.slug)} className="hover:text-foreground inline-flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="size-3.5" aria-hidden />
          {data.course.title}
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="truncate">{data.moduleTitle}</span>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="truncate">{data.chapterTitle}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {data.unlocked ? (
            <LessonWorkspace
              lessonId={data.lesson.id}
              courseId={data.course.id}
              title={data.lesson.title}
              status={data.status}
              contentMd={data.contentMd}
              videos={data.videos.map((video) => ({
                source: video.source,
                positionSeconds: video.positionSeconds,
                completed: video.completed,
              }))}
              resources={resources}
              exercises={data.exercises}
              quizzes={data.quizzes}
              notes={data.notes}
              isFavorite={data.isFavorite}
              previousLessonId={neighbours.previous?.id ?? null}
              nextLessonId={neighbours.next?.id ?? null}
            />
          ) : (
            <div className="space-y-5">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {data.lesson.title}
              </h1>
              {data.lesson.description && (
                <p className="text-muted-foreground">{data.lesson.description}</p>
              )}
              <LockedNotice />
            </div>
          )}
        </div>

        {/* Sommaire : navigation permanente entre les leçons */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="bg-card rounded-xl border">
            <div className="space-y-2 border-b p-4">
              <p className="text-sm font-medium">Programme</p>
              <p className="text-muted-foreground text-xs">
                Leçon {neighbours.index} sur {neighbours.total}
              </p>
              {courseDetail && (
                <Progress value={courseDetail.progressPercent} size="sm" />
              )}
            </div>
            <div className="max-h-[32rem] overflow-y-auto px-3 pb-2">
              {courseDetail && (
                <Syllabus modules={courseDetail.modules} currentLessonId={lessonId} compact />
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
