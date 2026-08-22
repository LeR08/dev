import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database.types';

export type Profile = Tables<'profiles'>;

export interface SessionUser {
  id: string;
  email: string;
  profile: Profile;
}

/**
 * Utilisateur courant + profil.
 *
 * `cache()` de React : une seule requête par rendu, même si dix composants
 * serveur appellent getSessionUser().
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // Le profil est créé par trigger sur auth.users ; s'il manque, la session est
  // inutilisable — on la traite comme absente plutôt que de planter le rendu.
  if (!profile) return null;

  return { id: user.id, email: user.email ?? '', profile };
});

/** Accès actifs du membre — sert au verrouillage du contenu côté interface. */
export const getEntitlements = cache(async () => {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) return { hasAny: false, all: false, courseIds: [], subjectIds: [] };

  const { data } = await supabase
    .from('enrollments')
    .select('scope, course_id, subject_id, expires_at')
    .is('revoked_at', null);

  const now = Date.now();
  const active = (data ?? []).filter(
    (row) => !row.expires_at || new Date(row.expires_at).getTime() > now,
  );

  return {
    hasAny: active.length > 0 || user.profile.role !== 'student',
    all: active.some((row) => row.scope === 'all') || user.profile.role !== 'student',
    courseIds: active.filter((r) => r.scope === 'course').map((r) => r.course_id!),
    subjectIds: active.filter((r) => r.scope === 'subject').map((r) => r.subject_id!),
  };
});

export type Entitlements = Awaited<ReturnType<typeof getEntitlements>>;

/** Décide côté serveur si une formation est déverrouillée. */
export function canAccessCourse(
  entitlements: Entitlements,
  course: { id: string; subject_id: string },
): boolean {
  return (
    entitlements.all ||
    entitlements.courseIds.includes(course.id) ||
    entitlements.subjectIds.includes(course.subject_id)
  );
}
