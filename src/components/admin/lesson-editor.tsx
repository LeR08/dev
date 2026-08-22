'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FileQuestion, Paperclip, Play, Settings2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LessonSettingsForm } from './lesson-settings-form';
import { VideoManager } from './video-manager';
import { ResourceManager } from './resource-manager';
import { QuizManager } from './quiz-manager';
import type { Tables } from '@/types/database.types';

export function LessonEditor({
  lesson,
  videos,
  resources,
  quizzes,
  questions,
  answers,
}: {
  lesson: Tables<'lessons'>;
  videos: Tables<'videos'>[];
  resources: Tables<'resources'>[];
  quizzes: Tables<'quizzes'>[];
  questions: Tables<'questions'>[];
  answers: Array<Pick<Tables<'answers'>, 'id' | 'question_id' | 'label' | 'is_correct' | 'match_pattern' | 'sort_order'>>;
}) {
  const router = useRouter();

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{lesson.title}</h1>
        <p className="text-muted-foreground text-sm">
          {lesson.is_free_preview ? 'Leçon en accès libre' : 'Leçon réservée aux membres'} ·{' '}
          {lesson.status === 'published' ? 'Publiée' : 'Brouillon'}
        </p>
      </div>

      <Tabs defaultValue="videos">
        <TabsList>
          <TabsTrigger value="videos">
            <Play /> Vidéos
            {videos.length > 0 && <Badge variant="default">{videos.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="resources">
            <Paperclip /> Ressources
            {resources.length > 0 && <Badge variant="default">{resources.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="quizzes">
            <FileQuestion /> Quiz
            {quizzes.length > 0 && <Badge variant="default">{quizzes.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 /> Contenu et réglages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="pt-6">
          <VideoManager lessonId={lesson.id} videos={videos} onChanged={() => router.refresh()} />
        </TabsContent>

        <TabsContent value="resources" className="pt-6">
          <ResourceManager
            lessonId={lesson.id}
            resources={resources}
            onChanged={() => router.refresh()}
          />
        </TabsContent>

        <TabsContent value="quizzes" className="pt-6">
          <QuizManager
            lessonId={lesson.id}
            quizzes={quizzes}
            questions={questions}
            answers={answers}
            onChanged={() => router.refresh()}
          />
        </TabsContent>

        <TabsContent value="settings" className="pt-6">
          <LessonSettingsForm lesson={lesson} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
