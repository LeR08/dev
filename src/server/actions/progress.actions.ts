'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireUserOrFail } from '@/server/auth/guards';
import { fail, guard, ok, type ActionResult } from './action-result';

const videoProgressSchema = z.object({
  videoId: z.string().uuid(),
  position: z.number().int().min(0).max(24 * 3600),
  watched: z.number().int().min(0).max(24 * 3600).optional(),
});

/**
 * Enregistre la position de lecture.
 *
 * Appelée toutes les 10 s pendant la lecture, plus sur pause, changement
 * d'onglet et déchargement de page — jamais à chaque `timeupdate`, ce qui
 * produirait quatre écritures par seconde.
 */
export async function saveVideoProgress(input: unknown): Promise<ActionResult<{ completed: boolean }>> {
  return guard(async () => {
    await requireUserOrFail();
    const parsed = videoProgressSchema.safeParse(input);
    if (!parsed.success) return fail('Position invalide');

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('upsert_video_progress', {
      p_video_id: parsed.data.videoId,
      p_position: parsed.data.position,
      p_watched: parsed.data.watched ?? 0,
    });

    if (error) return fail(error.message);

    const result = (data ?? {}) as { completed?: boolean };
    return ok<{ completed: boolean }>({ completed: Boolean(result.completed) });
  });
}

/** Bouton « Marquer comme terminé » — et son inverse. */
export async function setLessonCompleted(
  lessonId: string,
  completed = true,
): Promise<ActionResult<{ completed: boolean }>> {
  return guard(async () => {
    await requireUserOrFail();

    const supabase = await createClient();
    const { error } = await supabase.rpc('set_lesson_completed', {
      p_lesson_id: lessonId,
      p_completed: completed,
    });

    if (error) return fail(error.message);

    revalidatePath(`/learn/${lessonId}`);
    revalidatePath('/dashboard');
    revalidatePath('/progress');

    return ok<{ completed: boolean }>(
      { completed },
      completed ? 'Leçon terminée' : 'Leçon rouverte',
    );
  });
}

const studyTimeSchema = z.object({
  seconds: z.number().int().min(1).max(1800),
  courseId: z.string().uuid().nullable().optional(),
  lessonId: z.string().uuid().nullable().optional(),
});

/** Temps d'étude effectif — alimente objectifs, séries et statistiques. */
export async function recordStudyTime(input: unknown): Promise<ActionResult<undefined>> {
  return guard(async () => {
    await requireUserOrFail();
    const parsed = studyTimeSchema.safeParse(input);
    if (!parsed.success) return fail('Durée invalide');

    const supabase = await createClient();
    const { error } = await supabase.rpc('record_study_time', {
      p_seconds: parsed.data.seconds,
      p_course_id: parsed.data.courseId ?? null,
      p_lesson_id: parsed.data.lessonId ?? null,
    });

    if (error) return fail(error.message);
    return ok(undefined);
  });
}
