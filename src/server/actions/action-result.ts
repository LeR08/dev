/**
 * Contrat commun à toutes les server actions.
 * Une action ne lève jamais d'exception vers le client : elle renvoie un
 * résultat typé que le formulaire sait afficher (états error / success du §31).
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function fail(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** Enveloppe une action : convertit toute exception en résultat lisible. */
export async function guard<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error) {
      // Les erreurs de redirect/notFound de Next doivent remonter telles quelles.
      if ('digest' in error && typeof error.digest === 'string') throw error;
      return fail(error.message);
    }
    return fail('Une erreur inattendue est survenue.');
  }
}
