'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminOrFail, requireStaffOrFail } from '@/server/auth/guards';
import { fail, guard, ok, type ActionResult } from './action-result';
import {
  accessCodeBatchSchema,
  courseSchema,
  entitySchema,
  lessonSchema,
  quizSchema,
  questionSchema,
  reorderSchema,
  resourceSchema,
  videoSchema,
} from '@/validations/admin.schema';

/**
 * Actions d'administration.
 *
 * Chaque action revérifie le rôle : une server action est un endpoint HTTP
 * public, le layout protégé ne la couvre pas. La RLS reste la barrière finale.
 */

function invalidateContent() {
  revalidatePath('/admin', 'layout');
  revalidatePath('/explore');
  revalidatePath('/', 'layout');
}

// --- Parcours et domaines --------------------------------------------------

export async function upsertLevel(input: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireStaffOrFail();
    const parsed = entitySchema.safeParse(input);
    if (!parsed.success) return fail('Formulaire invalide');

    const supabase = await createClient();
    const payload = {
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description || null,
      status: parsed.data.status,
      sort_order: parsed.data.sortOrder,
    };

    const { data, error } = parsed.data.id
      ? await supabase.from('levels').update(payload).eq('id', parsed.data.id).select('id').single()
      : await supabase.from('levels').insert(payload).select('id').single();

    if (error || !data) return fail(translate(error?.message));
    invalidateContent();
    return ok({ id: data.id }, 'Parcours enregistré');
  });
}

export async function upsertSubject(input: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireStaffOrFail();
    const parsed = entitySchema.safeParse(input);
    if (!parsed.success) return fail('Formulaire invalide');

    const supabase = await createClient();
    const payload = {
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description || null,
      icon: parsed.data.icon || null,
      color: parsed.data.color || null,
      status: parsed.data.status,
      sort_order: parsed.data.sortOrder,
    };

    const { data, error } = parsed.data.id
      ? await supabase.from('subjects').update(payload).eq('id', parsed.data.id).select('id').single()
      : await supabase.from('subjects').insert(payload).select('id').single();

    if (error || !data) return fail(translate(error?.message));
    invalidateContent();
    return ok({ id: data.id }, 'Domaine enregistré');
  });
}

// --- Formations ------------------------------------------------------------

export async function upsertCourse(input: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const user = await requireStaffOrFail();
    const parsed = courseSchema.safeParse(input);
    if (!parsed.success) return fail('Formulaire invalide');

    const supabase = await createClient();
    const payload = {
      slug: parsed.data.slug,
      title: parsed.data.title,
      summary: parsed.data.summary || null,
      description: parsed.data.description || null,
      thumbnail_url: parsed.data.thumbnailUrl || null,
      level_id: parsed.data.levelId,
      subject_id: parsed.data.subjectId,
      difficulty: parsed.data.difficulty,
      status: parsed.data.status,
      sort_order: parsed.data.sortOrder,
      published_at: parsed.data.status === 'published' ? new Date().toISOString() : null,
    };

    const { data, error } = parsed.data.id
      ? await supabase.from('courses').update(payload).eq('id', parsed.data.id).select('id').single()
      : await supabase
          .from('courses')
          .insert({ ...payload, created_by: user.id })
          .select('id')
          .single();

    if (error || !data) return fail(translate(error?.message));
    invalidateContent();
    return ok({ id: data.id }, 'Formation enregistrée');
  });
}

// --- Modules, chapitres, leçons -------------------------------------------

const nodeSchema = z.object({
  id: z.string().uuid().optional(),
  parentId: z.string().uuid(),
  title: z.string().trim().min(1, 'Titre requis').max(200),
  description: z.string().max(2000).optional(),
  sortOrder: z.number().int().min(0).default(0),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
});

export async function upsertModule(input: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireStaffOrFail();
    const parsed = nodeSchema.safeParse(input);
    if (!parsed.success) return fail('Formulaire invalide');

    const supabase = await createClient();
    const payload = {
      course_id: parsed.data.parentId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      sort_order: parsed.data.sortOrder,
      status: parsed.data.status,
    };

    const { data, error } = parsed.data.id
      ? await supabase.from('modules').update(payload).eq('id', parsed.data.id).select('id').single()
      : await supabase.from('modules').insert(payload).select('id').single();

    if (error || !data) return fail(translate(error?.message));
    invalidateContent();
    return ok({ id: data.id }, 'Module enregistré');
  });
}

export async function upsertChapter(input: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireStaffOrFail();
    const parsed = nodeSchema.safeParse(input);
    if (!parsed.success) return fail('Formulaire invalide');

    const supabase = await createClient();
    // course_id est rempli par le trigger sync_chapter_denorm.
    const payload = {
      module_id: parsed.data.parentId,
      course_id: parsed.data.parentId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      sort_order: parsed.data.sortOrder,
      status: parsed.data.status,
    };

    const { data, error } = parsed.data.id
      ? await supabase.from('chapters').update(payload).eq('id', parsed.data.id).select('id').single()
      : await supabase.from('chapters').insert(payload).select('id').single();

    if (error || !data) return fail(translate(error?.message));
    invalidateContent();
    return ok({ id: data.id }, 'Chapitre enregistré');
  });
}

export async function upsertLesson(input: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireStaffOrFail();
    const parsed = lessonSchema.safeParse(input);
    if (!parsed.success) return fail('Formulaire invalide');

    const supabase = await createClient();
    // module_id et course_id sont dérivés du chapitre par trigger.
    const payload = {
      chapter_id: parsed.data.chapterId,
      module_id: parsed.data.chapterId,
      course_id: parsed.data.chapterId,
      slug: parsed.data.slug,
      title: parsed.data.title,
      description: parsed.data.description || null,
      content_md: parsed.data.contentMd || null,
      duration_seconds: parsed.data.durationSeconds,
      is_free_preview: parsed.data.isFreePreview,
      sort_order: parsed.data.sortOrder,
      status: parsed.data.status,
    };

    const { data, error } = parsed.data.id
      ? await supabase.from('lessons').update(payload).eq('id', parsed.data.id).select('id').single()
      : await supabase.from('lessons').insert(payload).select('id').single();

    if (error || !data) return fail(translate(error?.message));
    invalidateContent();
    return ok({ id: data.id }, 'Leçon enregistrée');
  });
}

// --- Vidéos, ressources, quiz ---------------------------------------------

export async function upsertVideo(input: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireStaffOrFail();
    const parsed = videoSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Formulaire invalide');
    }

    const supabase = await createClient();
    const payload = {
      lesson_id: parsed.data.lessonId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      provider: parsed.data.provider,
      external_id: parsed.data.externalId || null,
      url: parsed.data.url || null,
      thumbnail_url: parsed.data.thumbnailUrl || null,
      duration_seconds: parsed.data.durationSeconds,
      sort_order: parsed.data.sortOrder,
    };

    const { data, error } = parsed.data.id
      ? await supabase.from('videos').update(payload).eq('id', parsed.data.id).select('id').single()
      : await supabase.from('videos').insert(payload).select('id').single();

    if (error || !data) return fail(translate(error?.message));
    invalidateContent();
    return ok({ id: data.id }, 'Vidéo enregistrée');
  });
}

export async function upsertResource(input: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireStaffOrFail();
    const parsed = resourceSchema.safeParse(input);
    if (!parsed.success) return fail('Formulaire invalide');

    const supabase = await createClient();
    const payload = {
      lesson_id: parsed.data.lessonId ?? null,
      course_id: parsed.data.courseId ?? null,
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description || null,
      url: parsed.data.url || null,
      storage_path: parsed.data.storagePath || null,
      sort_order: parsed.data.sortOrder,
    };

    const { data, error } = parsed.data.id
      ? await supabase.from('resources').update(payload).eq('id', parsed.data.id).select('id').single()
      : await supabase.from('resources').insert(payload).select('id').single();

    if (error || !data) return fail(translate(error?.message));
    invalidateContent();
    return ok({ id: data.id }, 'Ressource enregistrée');
  });
}

export async function upsertQuiz(input: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireStaffOrFail();
    const parsed = quizSchema.safeParse(input);
    if (!parsed.success) return fail('Formulaire invalide');

    const supabase = await createClient();
    const payload = {
      scope: 'lesson' as const,
      lesson_id: parsed.data.lessonId,
      course_id: parsed.data.lessonId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      passing_score: parsed.data.passingScore,
      max_attempts: parsed.data.maxAttempts ?? null,
      time_limit_seconds: parsed.data.timeLimitSeconds ?? null,
      shuffle_questions: parsed.data.shuffleQuestions,
      show_explanations: parsed.data.showExplanations,
      status: parsed.data.status,
      sort_order: parsed.data.sortOrder,
    };

    const { data, error } = parsed.data.id
      ? await supabase.from('quizzes').update(payload).eq('id', parsed.data.id).select('id').single()
      : await supabase.from('quizzes').insert(payload).select('id').single();

    if (error || !data) return fail(translate(error?.message));
    invalidateContent();
    return ok({ id: data.id }, 'Quiz enregistré');
  });
}

/** Question + réponses en une seule opération : elles n'ont pas de sens séparées. */
export async function upsertQuestion(input: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireStaffOrFail();
    const parsed = questionSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Formulaire invalide');
    }

    const supabase = await createClient();
    const payload = {
      quiz_id: parsed.data.quizId,
      type: parsed.data.type,
      prompt: parsed.data.prompt,
      explanation: parsed.data.explanation || null,
      points: parsed.data.points,
      sort_order: parsed.data.sortOrder,
    };

    const { data, error } = parsed.data.id
      ? await supabase.from('questions').update(payload).eq('id', parsed.data.id).select('id').single()
      : await supabase.from('questions').insert(payload).select('id').single();

    if (error || !data) return fail(translate(error?.message));

    // Remplacement complet des réponses : plus simple et plus sûr qu'un
    // rapprochement ligne à ligne, et sans conséquence (les tentatives
    // stockent les identifiants, pas les libellés).
    await supabase.from('answers').delete().eq('question_id', data.id);

    if (parsed.data.answers.length > 0) {
      const { error: answersError } = await supabase.from('answers').insert(
        parsed.data.answers.map((answer, index) => ({
          question_id: data.id,
          label: answer.label,
          is_correct: answer.isCorrect,
          match_pattern: answer.matchPattern || null,
          sort_order: index,
        })),
      );
      if (answersError) return fail('Les réponses n’ont pas pu être enregistrées.');
    }

    invalidateContent();
    return ok({ id: data.id }, 'Question enregistrée');
  });
}

// --- Suppression et réordonnancement --------------------------------------

const DELETABLE = [
  'levels', 'subjects', 'courses', 'modules', 'chapters', 'lessons',
  'videos', 'resources', 'quizzes', 'questions', 'exercises',
] as const;

export async function deleteEntity(
  entity: (typeof DELETABLE)[number],
  id: string,
): Promise<ActionResult<undefined>> {
  return guard(async () => {
    await requireStaffOrFail();
    if (!DELETABLE.includes(entity)) return fail('Entité inconnue');

    const supabase = await createClient();
    const { error } = await supabase.from(entity).delete().eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return fail('Suppression impossible : des éléments dépendent encore de celui-ci.');
      }
      return fail('Suppression impossible.');
    }

    invalidateContent();
    return ok(undefined, 'Élément supprimé');
  });
}

/** Glisser-déposer : la liste ordonnée complète part en une seule transaction. */
export async function reorderEntities(input: unknown): Promise<ActionResult<undefined>> {
  return guard(async () => {
    await requireStaffOrFail();
    const parsed = reorderSchema.safeParse(input);
    if (!parsed.success) return fail('Ordre invalide');

    const supabase = await createClient();
    const { error } = await supabase.rpc('reorder_entities', {
      p_entity: parsed.data.entity,
      p_parent_id: parsed.data.parentId ?? null,
      p_ordered_ids: parsed.data.orderedIds,
    });

    if (error) return fail('Réordonnancement impossible.');
    invalidateContent();
    return ok(undefined);
  });
}

// --- Codes d'accès ---------------------------------------------------------

export async function generateAccessCodes(
  input: unknown,
): Promise<ActionResult<{ codes: string[] }>> {
  return guard(async () => {
    await requireAdminOrFail();
    const parsed = accessCodeBatchSchema.safeParse(input);
    if (!parsed.success) return fail('Paramètres invalides');

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('generate_access_codes', {
      p_count: parsed.data.count,
      p_scope: parsed.data.scope,
      p_course_id: parsed.data.courseId ?? null,
      p_subject_id: parsed.data.subjectId ?? null,
      p_max_uses: parsed.data.maxUses,
      p_access_days: parsed.data.accessDays ?? null,
      p_label: parsed.data.label || null,
    });

    if (error) return fail('Génération impossible.');

    revalidatePath('/admin/access-codes');
    return ok(
      { codes: (data ?? []).map((row) => row.code) },
      `${parsed.data.count} code(s) généré(s)`,
    );
  });
}

export async function setAccessCodeActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult<undefined>> {
  return guard(async () => {
    await requireAdminOrFail();
    const supabase = await createClient();
    const { error } = await supabase.from('access_codes').update({ is_active: isActive }).eq('id', id);
    if (error) return fail('Modification impossible.');
    revalidatePath('/admin/access-codes');
    return ok(undefined, isActive ? 'Code réactivé' : 'Code désactivé');
  });
}

export async function grantAccess(
  userId: string,
  scope: 'all' | 'subject' | 'course',
  targetId: string | null,
): Promise<ActionResult<undefined>> {
  return guard(async () => {
    const admin = await requireAdminOrFail();
    const supabase = await createClient();

    const { error } = await supabase.from('enrollments').insert({
      user_id: userId,
      scope,
      course_id: scope === 'course' ? targetId : null,
      subject_id: scope === 'subject' ? targetId : null,
      source: 'admin',
      granted_by: admin.id,
    });

    if (error) {
      if (error.code === '23505') return fail('Ce membre a déjà cet accès.');
      return fail('Attribution impossible.');
    }

    revalidatePath('/admin/users');
    return ok(undefined, 'Accès accordé');
  });
}

export async function revokeAccess(enrollmentId: string): Promise<ActionResult<undefined>> {
  return guard(async () => {
    await requireAdminOrFail();
    const supabase = await createClient();
    const { error } = await supabase
      .from('enrollments')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', enrollmentId);

    if (error) return fail('Révocation impossible.');
    revalidatePath('/admin/users');
    return ok(undefined, 'Accès révoqué');
  });
}

// --- Membres ---------------------------------------------------------------

export async function setUserRole(
  userId: string,
  role: 'student' | 'teacher' | 'admin',
): Promise<ActionResult<undefined>> {
  return guard(async () => {
    const admin = await requireAdminOrFail();

    // Un administrateur ne peut pas se retirer ses propres droits : sans cette
    // garde, le dernier admin peut se verrouiller hors de l'administration.
    if (userId === admin.id && role !== 'admin') {
      return fail('Vous ne pouvez pas retirer vos propres droits d’administration.');
    }

    const supabase = await createClient();
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
    if (error) return fail('Modification impossible.');

    revalidatePath('/admin/users');
    return ok(undefined, 'Rôle mis à jour');
  });
}

export async function setUserActive(
  userId: string,
  isActive: boolean,
): Promise<ActionResult<undefined>> {
  return guard(async () => {
    const admin = await requireAdminOrFail();
    if (userId === admin.id && !isActive) {
      return fail('Vous ne pouvez pas désactiver votre propre compte.');
    }

    const supabase = await createClient();
    const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', userId);
    if (error) return fail('Modification impossible.');

    revalidatePath('/admin/users');
    return ok(undefined, isActive ? 'Compte réactivé' : 'Compte désactivé');
  });
}

/** Adresses e-mail des membres : elles vivent dans auth.users, hors RLS. */
export async function getUserEmails(userIds: string[]): Promise<ActionResult<Record<string, string>>> {
  return guard(async () => {
    await requireAdminOrFail();
    if (userIds.length === 0) return ok({});

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return fail('Lecture impossible.');

    const emails: Record<string, string> = {};
    for (const user of data.users) {
      if (userIds.includes(user.id) && user.email) emails[user.id] = user.email;
    }
    return ok(emails);
  });
}

function translate(message?: string): string {
  if (!message) return 'Enregistrement impossible.';
  if (message.includes('duplicate key') && message.includes('slug')) {
    return 'Ce slug est déjà utilisé. Choisissez-en un autre.';
  }
  if (message.includes('violates foreign key')) {
    return 'Référence invalide : vérifiez les éléments liés.';
  }
  return 'Enregistrement impossible.';
}
