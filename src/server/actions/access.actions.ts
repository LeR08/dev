'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUserOrFail } from '@/server/auth/guards';
import { activateCodeSchema } from '@/validations/engagement.schema';
import { fail, guard, ok, type ActionResult } from './action-result';
import type { RedeemResult } from '@/types/domain';

/**
 * Activation d'un code d'accès.
 *
 * Toute la logique est dans `redeem_access_code` (SECURITY DEFINER, verrou de
 * ligne) : c'est le seul chemin de création d'une inscription. Aucune policy
 * INSERT n'existe sur `enrollments` pour l'utilisateur, et `access_codes` est
 * totalement invisible aux non-admins — impossible d'énumérer les codes valides.
 */
export async function activateCode(input: unknown): Promise<ActionResult<RedeemResult>> {
  return guard(async () => {
    await requireUserOrFail();

    const parsed = activateCodeSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Code invalide');
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('redeem_access_code', {
      p_code: parsed.data.code,
    });

    if (error) return fail("L'activation a échoué. Réessayez dans un instant.");

    const result = data as unknown as RedeemResult;
    if (!result?.ok) {
      return fail(result?.message ?? 'Ce code ne peut pas être utilisé.');
    }

    // L'accès change ce que voit l'utilisateur presque partout.
    revalidatePath('/', 'layout');

    return ok(result, result.message);
  });
}
