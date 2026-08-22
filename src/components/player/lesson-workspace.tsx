'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Check,
  CircleCheck,
  FileQuestion,
  NotebookPen,
  Paperclip,
  PencilRuler,
  Star,
  Video as VideoIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { VideoPlayer } from './video-player';
import { NotePanel } from '@/components/notes/note-panel';
import { ResourceList } from '@/components/course/resource-list';
import { ExercisePanel } from '@/components/course/exercise-panel';
import { Markdown } from '@/lib/utils/markdown';
import { setLessonCompleted } from '@/server/actions/progress.actions';
import { toggleFavorite } from '@/server/actions/engagement.actions';
import { routes } from '@/lib/constants/routes';
import { cn, formatDuration, pluralize } from '@/lib/utils';
import type { VideoSource } from '@/lib/video';
import type { Tables } from '@/types/database.types';
import type { PublicExercise, QuizSummary } from '@/types/domain';

interface LessonWorkspaceProps {
  lessonId: string;
  courseId: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'completed';
  contentMd: string | null;
  videos: Array<{ source: VideoSource; positionSeconds: number; completed: boolean }>;
  resources: Array<Tables<'resources'> & { href: string }>;
  exercises: PublicExercise[];
  quizzes: QuizSummary[];
  notes: Tables<'notes'>[];
  isFavorite: boolean;
  previousLessonId: string | null;
  nextLessonId: string | null;
}

export function LessonWorkspace({
  lessonId,
  courseId,
  title,
  status,
  contentMd,
  videos,
  resources,
  exercises,
  quizzes,
  notes,
  isFavorite,
  previousLessonId,
  nextLessonId,
}: LessonWorkspaceProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [activeVideoIndex, setActiveVideoIndex] = React.useState(() => {
    const firstUnfinished = videos.findIndex((video) => !video.completed);
    return firstUnfinished === -1 ? 0 : firstUnfinished;
  });
  const [completed, setCompleted] = React.useState(status === 'completed');
  const [favorite, setFavorite] = React.useState(isFavorite);
  const [pending, setPending] = React.useState(false);

  const playerRef = React.useRef<{ seek: (s: number) => void; getTime: () => number } | null>(null);
  const activeVideo = videos[activeVideoIndex];

  async function handleToggleComplete() {
    setPending(true);
    const next = !completed;
    const result = await setLessonCompleted(lessonId, next);
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Action impossible', description: result.error, tone: 'error' });
      return;
    }

    setCompleted(next);
    toast({
      title: next ? 'Leçon terminée' : 'Leçon rouverte',
      description: next ? '+25 XP' : undefined,
      tone: 'success',
    });
    router.refresh();

    if (next && nextLessonId) {
      // Enchaînement automatique : c'est ce qu'on attend d'un LMS.
      setTimeout(() => router.push(routes.lesson(nextLessonId)), 700);
    }
  }

  async function handleToggleFavorite() {
    const result = await toggleFavorite({ type: 'lesson', id: lessonId });
    if (!result.ok) {
      toast({ title: 'Action impossible', description: result.error, tone: 'error' });
      return;
    }
    setFavorite(result.data.active);
    toast({ title: result.message ?? '', tone: 'success' });
  }

  return (
    <div className="space-y-5">
      {videos.length > 0 && activeVideo ? (
        <VideoPlayerBridge
          key={activeVideo.source.id}
          source={activeVideo.source}
          courseId={courseId}
          lessonId={lessonId}
          initialPosition={activeVideo.positionSeconds}
          hasPrevious={activeVideoIndex > 0 || Boolean(previousLessonId)}
          hasNext={activeVideoIndex < videos.length - 1 || Boolean(nextLessonId)}
          onPrevious={() => {
            if (activeVideoIndex > 0) setActiveVideoIndex((index) => index - 1);
            else if (previousLessonId) router.push(routes.lesson(previousLessonId));
          }}
          onNext={() => {
            if (activeVideoIndex < videos.length - 1) setActiveVideoIndex((index) => index + 1);
            else if (nextLessonId) router.push(routes.lesson(nextLessonId));
          }}
          onCompleted={() => {
            setCompleted(true);
            router.refresh();
          }}
          bindControls={(controls) => {
            playerRef.current = controls;
          }}
        />
      ) : (
        <div className="bg-muted grid aspect-video place-items-center rounded-xl border border-dashed">
          <div className="text-center">
            <VideoIcon className="text-muted-foreground mx-auto size-8" aria-hidden />
            <p className="text-muted-foreground mt-2 text-sm">Cette leçon est au format écrit.</p>
          </div>
        </div>
      )}

      {videos.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {videos.map((video, index) => (
            <button
              key={video.source.id}
              type="button"
              onClick={() => setActiveVideoIndex(index)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                index === activeVideoIndex
                  ? 'border-primary bg-primary-muted text-primary'
                  : 'hover:bg-muted',
              )}
            >
              {video.completed ? (
                <Check className="text-success size-3.5" strokeWidth={3} aria-hidden />
              ) : (
                <VideoIcon className="size-3.5" aria-hidden />
              )}
              <span className="max-w-40 truncate">{video.source.title}</span>
              {video.source.durationSeconds > 0 && (
                <span className="text-muted-foreground tabular-nums">
                  {formatDuration(video.source.durationSeconds)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="min-w-0 flex-1 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            aria-pressed={favorite}
            onClick={handleToggleFavorite}
          >
            <Star className={cn('size-4', favorite && 'fill-warning text-warning')} />
          </Button>
          <Button
            variant={completed ? 'secondary' : 'primary'}
            loading={pending}
            onClick={handleToggleComplete}
          >
            {completed ? <CircleCheck className="text-success" /> : <Check />}
            {completed ? 'Terminée' : 'Marquer comme terminé'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue={contentMd ? 'content' : 'notes'}>
        <TabsList>
          {contentMd && (
            <TabsTrigger value="content">
              <NotebookPen /> Contenu
            </TabsTrigger>
          )}
          <TabsTrigger value="notes">
            <NotebookPen /> Mes notes
            {notes.length > 0 && <Badge variant="default">{notes.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="resources">
            <Paperclip /> Ressources
            {resources.length > 0 && <Badge variant="default">{resources.length}</Badge>}
          </TabsTrigger>
          {exercises.length > 0 && (
            <TabsTrigger value="exercises">
              <PencilRuler /> Exercices
              <Badge variant="default">{exercises.length}</Badge>
            </TabsTrigger>
          )}
          {quizzes.length > 0 && (
            <TabsTrigger value="quiz">
              <FileQuestion /> Quiz
              <Badge variant="default">{quizzes.length}</Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {contentMd && (
          <TabsContent value="content" className="pt-6">
            <article className="max-w-3xl">
              <Markdown content={contentMd} />
            </article>
          </TabsContent>
        )}

        <TabsContent value="notes" className="pt-6">
          <div className="max-w-3xl">
            <NotePanel
              lessonId={lessonId}
              videoId={activeVideo?.source.id ?? null}
              initialNotes={notes}
              canTimestamp={Boolean(activeVideo?.source.capabilities.canTrackTime)}
              getCurrentTime={() => playerRef.current?.getTime() ?? 0}
              onSeek={
                activeVideo?.source.capabilities.canSeek
                  ? (seconds) => playerRef.current?.seek(seconds)
                  : undefined
              }
            />
          </div>
        </TabsContent>

        <TabsContent value="resources" className="pt-6">
          <div className="max-w-3xl">
            <ResourceList resources={resources} />
          </div>
        </TabsContent>

        {exercises.length > 0 && (
          <TabsContent value="exercises" className="pt-6">
            <div className="max-w-3xl">
              <ExercisePanel exercises={exercises} />
            </div>
          </TabsContent>
        )}

        {quizzes.length > 0 && (
          <TabsContent value="quiz" className="pt-6">
            <div className="max-w-3xl space-y-3">
              {quizzes.map((quiz) => (
                <QuizCard key={quiz.id} quiz={quiz} />
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function QuizCard({ quiz }: { quiz: QuizSummary }) {
  const exhausted = quiz.maxAttempts !== null && quiz.attemptsUsed >= quiz.maxAttempts;

  return (
    <div className="bg-card flex flex-wrap items-center gap-4 rounded-xl border p-4">
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-lg',
          quiz.passed ? 'bg-success-muted text-success' : 'bg-primary-muted text-primary',
        )}
      >
        {quiz.passed ? <CircleCheck className="size-5" /> : <FileQuestion className="size-5" />}
      </span>

      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate font-medium">{quiz.title}</p>
        <p className="text-muted-foreground text-xs">
          {quiz.questionCount} {pluralize(quiz.questionCount, 'question')} · réussite à partir de{' '}
          {quiz.passingScore} %
          {quiz.maxAttempts !== null && ` · ${quiz.attemptsUsed}/${quiz.maxAttempts} tentatives`}
        </p>
      </div>

      {quiz.bestPercentage !== null && (
        <Badge variant={quiz.passed ? 'success' : 'warning'}>
          Meilleur score : {Math.round(quiz.bestPercentage)} %
        </Badge>
      )}

      <Button asChild size="sm" variant={quiz.passed ? 'secondary' : 'primary'} disabled={exhausted}>
        <Link href={routes.quiz(quiz.id)}>
          {exhausted ? 'Tentatives épuisées' : quiz.attemptsUsed > 0 ? 'Refaire' : 'Commencer'}
        </Link>
      </Button>
    </div>
  );
}

/**
 * Expose les commandes du lecteur au reste de la page (notes horodatées),
 * sans faire remonter tout l'état du player.
 */
function VideoPlayerBridge({
  bindControls,
  ...props
}: React.ComponentProps<typeof VideoPlayer> & {
  bindControls: (controls: { seek: (s: number) => void; getTime: () => number }) => void;
}) {
  return <VideoPlayer {...props} controlsRef={bindControls} />;
}
