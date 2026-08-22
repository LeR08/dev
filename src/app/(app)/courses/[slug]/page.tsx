import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { BarChart3, BookOpen, Clock, PlayCircle, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Syllabus } from '@/components/course/syllabus';
import { FavoriteButton } from '@/components/course/favorite-button';
import { LockedNotice } from '@/components/access/locked-notice';
import { ResourceList } from '@/components/course/resource-list';
import { Markdown } from '@/lib/utils/markdown';
import { getCourseDetail } from '@/server/db/content';
import { withDownloadUrls } from '@/server/db/resources';
import { createClient } from '@/lib/supabase/server';
import { routes } from '@/lib/constants/routes';
import { formatDuration, pluralize } from '@/lib/utils';
import { DIFFICULTY_LABELS } from '@/types/domain';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getCourseDetail(slug);
  if (!detail) return { title: 'Formation introuvable' };

  const title = detail.course.title;
  const description = detail.course.summary ?? detail.course.description ?? undefined;

  return {
    title,
    description,
    alternates: { canonical: routes.course(slug) },
    openGraph: {
      title,
      description,
      type: 'article',
      images: detail.course.thumbnail_url ? [detail.course.thumbnail_url] : undefined,
    },
  };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getCourseDetail(slug);
  if (!detail) notFound();

  const supabase = await createClient();
  const { data: courseResources } = await supabase
    .from('resources')
    .select('*')
    .eq('course_id', detail.course.id)
    .order('sort_order');

  const resources = await withDownloadUrls(courseResources ?? []);
  const started = detail.lessonsCompleted > 0;

  // Données structurées : améliore l'affichage dans les résultats de recherche.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: detail.course.title,
    description: detail.course.summary ?? undefined,
    provider: { '@type': 'Organization', name: 'AtelierDigital' },
    educationalLevel: detail.level.name,
    about: detail.subject.name,
  };

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{detail.level.name}</Badge>
            <Badge variant="primary">{detail.subject.name}</Badge>
            <Badge variant="default">{DIFFICULTY_LABELS[detail.course.difficulty]}</Badge>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {detail.course.title}
            </h1>
            {detail.course.summary && (
              <p className="text-muted-foreground text-lg">{detail.course.summary}</p>
            )}
          </div>

          <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5">
              <PlayCircle className="size-4" aria-hidden />
              {detail.lessonsTotal} {pluralize(detail.lessonsTotal, 'leçon')}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden />
              {formatDuration(detail.course.duration_seconds)}
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="size-4" aria-hidden />
              {detail.modules.length} {pluralize(detail.modules.length, 'module')}
            </span>
            <span className="flex items-center gap-1.5">
              <BarChart3 className="size-4" aria-hidden />
              {DIFFICULTY_LABELS[detail.course.difficulty]}
            </span>
          </div>

          {detail.course.description && (
            <div className="max-w-3xl border-t pt-5">
              <Markdown content={detail.course.description} />
            </div>
          )}
        </div>

        {/* Carte d'action — sticky sur desktop */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
            <div className="bg-muted relative aspect-video">
              {detail.course.thumbnail_url ? (
                <Image
                  src={detail.course.thumbnail_url}
                  alt=""
                  fill
                  sizes="352px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="grid h-full place-items-center">
                  <PlayCircle className="text-muted-foreground size-10" aria-hidden />
                </div>
              )}
            </div>

            <div className="space-y-4 p-5">
              {started && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Votre progression</span>
                    <span className="text-muted-foreground tabular-nums">
                      {detail.progressPercent} %
                    </span>
                  </div>
                  <Progress
                    value={detail.progressPercent}
                    tone={detail.progressPercent >= 100 ? 'success' : 'primary'}
                  />
                  <p className="text-muted-foreground text-xs">
                    {detail.lessonsCompleted} / {detail.lessonsTotal} leçons terminées
                  </p>
                </div>
              )}

              {detail.unlocked ? (
                detail.resumeLessonId && (
                  <Button asChild size="lg" className="w-full">
                    <Link href={routes.lesson(detail.resumeLessonId)}>
                      <PlayCircle />
                      {started ? 'Reprendre la formation' : 'Commencer la formation'}
                    </Link>
                  </Button>
                )
              ) : (
                <div className="space-y-2.5">
                  <Button asChild size="lg" className="w-full">
                    <Link href={routes.activate}>Activer mon code d&apos;accès</Link>
                  </Button>
                  {detail.modules
                    .flatMap((module) => module.chapters.flatMap((chapter) => chapter.lessons))
                    .some((lesson) => lesson.isFreePreview) && (
                    <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
                      <Sparkles className="text-primary mt-0.5 size-3.5 shrink-0" aria-hidden />
                      Certaines leçons sont accessibles gratuitement : elles apparaissent sans
                      cadenas dans le programme ci-dessous.
                    </p>
                  )}
                </div>
              )}

              <FavoriteButton
                type="course"
                id={detail.course.id}
                initialActive={detail.isFavorite}
                withLabel
              />
            </div>
          </div>
        </aside>
      </div>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Programme</h2>
          <p className="text-muted-foreground text-sm">
            {detail.modules.length} {pluralize(detail.modules.length, 'module')} ·{' '}
            {detail.lessonsTotal} {pluralize(detail.lessonsTotal, 'leçon')}
          </p>
        </div>

        <div className="bg-card rounded-xl border px-5">
          {detail.modules.length > 0 ? (
            <Syllabus modules={detail.modules} />
          ) : (
            <p className="text-muted-foreground py-10 text-center text-sm">
              Le programme de cette formation est en cours de publication.
            </p>
          )}
        </div>
      </section>

      {resources.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Ressources de la formation</h2>
          {detail.unlocked ? (
            <div className="max-w-3xl">
              <ResourceList resources={resources} />
            </div>
          ) : (
            <LockedNotice
              title="Ressources réservées"
              description="Modèles, checklists et fiches se débloquent avec votre code d'accès."
            />
          )}
        </section>
      )}
    </div>
  );
}
