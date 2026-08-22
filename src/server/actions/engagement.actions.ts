'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUserOrFail } from '@/server/auth/guards';
import { fail, guard, ok, type ActionResult } from './action-result';
import { noteSchema, favoriteSchema, goalSchema } from '@/validations/engagement.schema';

/** Bascule un favori. La contrainte unique en base garantit l'idempotence. */
export async function toggleFavorite(input: unknown): Promise<ActionResult<{ active: boolean }>> {
  return guard(async () => {
    const user = await requireUserOrFail();
    const parsed = favoriteSchema.safeParse(input);
    if (!parsed.success) return fail('Élément invalide');

    const { type, id } = parsed.data;
    const column = `${type}_id` as 'course_id' | 'lesson_id' | 'video_id' | 'resource_id';

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq(column, id)
      .maybeSingle();

    if (existing) {
      await supabase.from('favorites').delete().eq('id', existing.id);
      revalidatePath('/favorites');
      return ok<{ active: boolean }>({ active: false }, 'Retiré des favoris');
    }

    const { error } = await supabase.from('favorites').insert({
      user_id: user.id,
      course_id: column === 'course_id' ? id : null,
      lesson_id: column === 'lesson_id' ? id : null,
      video_id: column === 'video_id' ? id : null,
      resource_id: column === 'resource_id' ? id : null,
    });

    if (error) return fail("Impossible d'ajouter aux favoris.");

    revalidatePath('/favorites');
    return ok<{ active: boolean }>({ active: true }, 'Ajouté aux favoris');
  });
}

export async function createNote(input: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const user = await requireUserOrFail();
    const parsed = noteSchema.safeParse(input);
    if (!parsed.success) return fail('Note invalide');

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        lesson_id: parsed.data.lessonId,
        video_id: parsed.data.videoId ?? null,
        timestamp_seconds: parsed.data.timestampSeconds ?? null,
        content: parsed.data.content,
      })
      .select('id')
      .single();

    if (error || !data) return fail("Impossible d'enregistrer la note.");

    revalidatePath('/notes');
    return ok({ id: data.id }, 'Note enregistrée');
  });
}

export async function updateNote(
  id: string,
  content: string,
): Promise<ActionResult<undefined>> {
  return guard(async () => {
    await requireUserOrFail();
    if (content.trim().length === 0) return fail('La note ne peut pas être vide.');

    const supabase = await createClient();
    // La RLS restreint déjà à ses propres lignes : pas de filtre user_id
    // redondant, mais aucune fuite non plus.
    const { error } = await supabase
      .from('notes')
      .update({ content: content.trim().slice(0, 5000) })
      .eq('id', id);

    if (error) return fail('Modification impossible.');

    revalidatePath('/notes');
    return ok(undefined, 'Note mise à jour');
  });
}

export async function deleteNote(id: string): Promise<ActionResult<undefined>> {
  return guard(async () => {
    await requireUserOrFail();
    const supabase = await createClient();
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) return fail('Suppression impossible.');
    revalidatePath('/notes');
    return ok(undefined, 'Note supprimée');
  });
}

export async function upsertGoal(input: unknown): Promise<ActionResult<undefined>> {
  return guard(async () => {
    const user = await requireUserOrFail();
    const parsed = goalSchema.safeParse(input);
    if (!parsed.success) return fail('Objectif invalide');

    const supabase = await createClient();

    // Un seul objectif actif par type : l'index unique partiel l'impose,
    // on désactive donc l'ancien avant d'insérer.
    await supabase
      .from('goals')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('type', parsed.data.type)
      .eq('is_active', true);

    const { error } = await supabase.from('goals').insert({
      user_id: user.id,
      type: parsed.data.type,
      target_value: parsed.data.targetValue,
      is_active: true,
    });

    if (error) return fail("Impossible d'enregistrer l'objectif.");

    revalidatePath('/goals');
    return ok(undefined, 'Objectif enregistré');
  });
}

export async function deactivateGoal(id: string): Promise<ActionResult<undefined>> {
  return guard(async () => {
    await requireUserOrFail();
    const supabase = await createClient();
    const { error } = await supabase.from('goals').update({ is_active: false }).eq('id', id);
    if (error) return fail('Suppression impossible.');
    revalidatePath('/goals');
    return ok(undefined, 'Objectif retiré');
  });
}

export async function markNotificationsRead(ids?: string[]): Promise<ActionResult<undefined>> {
  return guard(async () => {
    const user = await requireUserOrFail();
    const supabase = await createClient();

    let query = supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (ids && ids.length > 0) query = query.in('id', ids);

    const { error } = await query;
    if (error) return fail('Opération impossible.');

    revalidatePath('/notifications');
    return ok(undefined);
  });
}
