import 'server-only';

import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { getSessionUser, type SessionUser } from './session';
import { routes } from '@/lib/constants/routes';
import type { Enums } from '@/types/database.types';

/**
 * Barrières 2 et 3 sur 4 (docs/ARCHITECTURE.md §4.2).
 *
 * À appeler dans CHAQUE layout protégé ET dans CHAQUE server action mutative :
 * une server action est un endpoint HTTP public, le layout ne la protège pas.
 */

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();

  // Passer par /logout plutôt que par /login : un Server Component ne peut pas
  // écrire de cookie, donc la session resterait en place. Le proxy la verrait
  // encore valide et renverrait vers /dashboard, qui renverrait vers /login…
  // La route de déconnexion, elle, efface réellement la session.
  if (!user) redirect(routes.login);
  if (!user.profile.is_active) redirect(`${routes.logout}?reason=account_disabled`);

  return user;
}

export async function requireRole(roles: Enums<'user_role'>[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.profile.role)) {
    // notFound() plutôt que redirect : ne révèle pas l'existence de la zone.
    notFound();
  }
  return user;
}

export const requireStaff = () => requireRole(['admin', 'teacher']);
export const requireAdmin = () => requireRole(['admin']);

/** Variante pour les server actions : renvoie une erreur au lieu de rediriger. */
export async function requireUserOrFail(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || !user.profile.is_active) {
    throw new Error('Vous devez être connecté pour effectuer cette action.');
  }
  return user;
}

export async function requireStaffOrFail(): Promise<SessionUser> {
  const user = await requireUserOrFail();
  if (user.profile.role === 'student') {
    throw new Error("Vous n'avez pas les droits nécessaires.");
  }
  return user;
}

export async function requireAdminOrFail(): Promise<SessionUser> {
  const user = await requireUserOrFail();
  if (user.profile.role !== 'admin') {
    throw new Error("Vous n'avez pas les droits nécessaires.");
  }
  return user;
}
