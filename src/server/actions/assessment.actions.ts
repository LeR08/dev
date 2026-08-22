'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUserOrFail } from '@/server/auth/guards';
import { fail, guard, ok, type ActionResult } from './action-result';
import { exerciseAttemptSchema, quizSubmissionSchema } from '@/validations/engagement.schema';
import type { QuizResult } from '@/types/domain';

/**
 * Soumission d'un quiz.
 *
 * La correction est intégralement faite par `submit_quiz_attempt` en
 * SECURITY DEFINER : le client n'a jamais accès à `answers.is_correct`
 * (privilège révoqué au niveau colonne) et ne peut donc ni tricher, ni
 * s'attribuer un score. Les explications ne reviennent qu'après enregistrement.
 */
export async function submitQuiz(input: unknown): Promise<ActionResult<QuizResult>> {
  return guard(async () => {
    await requireUserOrFail();
    const parsed = quizSubmissionSchema.safeParse(input);
    if (!parsed.success) return fail('Réponses invalides');

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('submit_quiz_attempt', {
      p_quiz_id: parsed.data.quizId,
      p_responses: parsed.data.responses,
    });

    if (error) {
      if (error.message.includes('tentatives')) {
        return fail('Vous avez épuisé vos tentatives pour ce quiz.');
      }
      if (error.message.includes('Accès non autorisé')) {
        return fail("Cette formation n'est pas débloquée sur votre compte.");
      }
      return fail("Le quiz n'a pas pu être enregistré.");
    }

    revalidatePath('/progress');
    revalidatePath('/dashboard');

    return ok(data as unknown as QuizResult);
  });
}

export async function submitExerciseAttempt(
  input: unknown,
): Promise<ActionResult<{ isCorrect: boolean | null }>> {
  return guard(async () => {
    const user = await requireUserOrFail();
    const parsed = exerciseAttemptSchema.safeParse(input);
    if (!parsed.success) return fail('Réponse invalide');

    const supabase = await createClient();

    // La correction automatique n'existe que pour les réponses numériques ;
    // `expected_answer` étant révoqué en lecture, on passe par une RPC dédiée.
    const { data: check } = await supabase.rpc('grade_numeric_exercise', {
      p_exercise_id: parsed.data.exerciseId,
      p_response: parsed.data.responseText ?? '',
    });

    const isCorrect = typeof check === 'boolean' ? check : null;

    const { error } = await supabase.from('exercise_attempts').insert({
      user_id: user.id,
      exercise_id: parsed.data.exerciseId,
      response_text: parsed.data.responseText ?? null,
      is_correct: isCorrect,
      self_assessment: parsed.data.selfAssessment ?? null,
    });

    if (error) return fail("La réponse n'a pas pu être enregistrée.");

    return ok<{ isCorrect: boolean | null }>({ isCorrect });
  });
}
