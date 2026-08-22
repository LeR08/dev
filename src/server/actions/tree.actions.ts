'use server';

import { z } from 'zod';
import { requireStaffOrFail } from '@/server/auth/guards';
import { getCourseTree, type TreeModule } from '@/server/db/admin';
import { fail, guard, ok, type ActionResult } from './action-result';

/** Chargement paresseux du sous-arbre d'une formation dans l'éditeur. */
export async function loadCourseTree(courseId: string): Promise<ActionResult<TreeModule[]>> {
  return guard(async () => {
    await requireStaffOrFail();
    const parsed = z.string().uuid().safeParse(courseId);
    if (!parsed.success) return fail('Identifiant invalide');

    const modules = await getCourseTree(parsed.data);
    return ok(modules);
  });
}
