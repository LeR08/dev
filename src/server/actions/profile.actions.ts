'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireUserOrFail } from '@/server/auth/guards';
import { profileSchema } from '@/validations/auth.schema';
import { fail, guard, ok, type ActionResult } from './action-result';

export async function updateProfile(input: unknown): Promise<ActionResult<undefined>> {
  return guard(async () => {
    const user = await requireUserOrFail();
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) return fail('Formulaire invalide');

    const supabase = await createClient();
    // Le trigger profiles_guard_privileged_columns empêche de toucher au rôle,
    // à l'XP ou à la série, même si ces champs étaient envoyés.
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        bio: parsed.data.bio || null,
        level_id: parsed.data.levelId ?? null,
      })
      .eq('id', user.id);

    if (error) return fail('Enregistrement impossible.');

    revalidatePath('/profile');
    revalidatePath('/', 'layout');
    return ok(undefined, 'Profil mis à jour');
  });
}

export async function updateSubjectInterests(subjectIds: string[]): Promise<ActionResult<undefined>> {
  return guard(async () => {
    const user = await requireUserOrFail();
    const parsed = z.array(z.string().uuid()).max(20).safeParse(subjectIds);
    if (!parsed.success) return fail('Sélection invalide');

    const supabase = await createClient();
    await supabase.from('user_subject_interests').delete().eq('user_id', user.id);

    if (parsed.data.length > 0) {
      const { error } = await supabase
        .from('user_subject_interests')
        .insert(parsed.data.map((subjectId) => ({ user_id: user.id, subject_id: subjectId })));
      if (error) return fail('Enregistrement impossible.');
    }

    revalidatePath('/profile');
    return ok(undefined, 'Centres d’intérêt mis à jour');
  });
}

const preferencesSchema = z.object({
  new_course: z.boolean(),
  new_lesson: z.boolean(),
  new_quiz: z.boolean(),
  goal_reached: z.boolean(),
  badge_earned: z.boolean(),
  study_reminder: z.boolean(),
  email_enabled: z.boolean(),
});

export async function updateNotificationPreferences(input: unknown): Promise<ActionResult<undefined>> {
  return guard(async () => {
    const user = await requireUserOrFail();
    const parsed = preferencesSchema.safeParse(input);
    if (!parsed.success) return fail('Préférences invalides');

    const supabase = await createClient();
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({ user_id: user.id, ...parsed.data });

    if (error) return fail('Enregistrement impossible.');

    revalidatePath('/settings/notifications');
    return ok(undefined, 'Préférences enregistrées');
  });
}

/** Téléversement d'un avatar. Le chemin est préfixé par l'identifiant : la
 *  policy Storage impose que le premier dossier soit auth.uid(). */
export async function updateAvatarUrl(publicUrl: string): Promise<ActionResult<undefined>> {
  return guard(async () => {
    const user = await requireUserOrFail();
    const parsed = z.string().url().max(500).safeParse(publicUrl);
    if (!parsed.success) return fail('URL invalide');

    const supabase = await createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: parsed.data })
      .eq('id', user.id);

    if (error) return fail('Enregistrement impossible.');

    revalidatePath('/', 'layout');
    return ok(undefined, 'Photo mise à jour');
  });
}
