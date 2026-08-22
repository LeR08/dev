import { z } from 'zod';

export const favoriteSchema = z.object({
  type: z.enum(['course', 'lesson', 'video', 'resource']),
  id: z.string().uuid(),
});

export const noteSchema = z.object({
  lessonId: z.string().uuid(),
  videoId: z.string().uuid().nullable().optional(),
  timestampSeconds: z.number().int().min(0).nullable().optional(),
  content: z
    .string()
    .trim()
    .min(1, 'La note ne peut pas être vide')
    .max(5000, 'Au plus 5000 caractères'),
});

export const goalSchema = z.object({
  type: z.enum(['daily_minutes', 'weekly_minutes', 'daily_lessons', 'weekly_lessons']),
  targetValue: z.number().int().min(1, 'Au moins 1').max(1440, 'Valeur trop élevée'),
});

export const activateCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4, 'Code trop court')
    .max(40, 'Code trop long')
    .transform((value) => value.toUpperCase()),
});

export const quizSubmissionSchema = z.object({
  quizId: z.string().uuid(),
  responses: z.array(
    z.object({
      question_id: z.string().uuid(),
      answer_ids: z.array(z.string().uuid()).default([]),
      text: z.string().max(500).optional(),
    }),
  ),
});

export const exerciseAttemptSchema = z.object({
  exerciseId: z.string().uuid(),
  responseText: z.string().max(5000).optional(),
  selfAssessment: z.number().int().min(0).max(2).optional(),
});

export type FavoriteInput = z.infer<typeof favoriteSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type ActivateCodeInput = z.infer<typeof activateCodeSchema>;
export type QuizSubmissionInput = z.infer<typeof quizSubmissionSchema>;
