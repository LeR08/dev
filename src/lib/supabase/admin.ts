import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from '@/types/database.types';

/**
 * Client `service_role` — CONTOURNE LA RLS.
 *
 * Réservé aux opérations d'administration impossibles autrement :
 * lister les utilisateurs (table auth.users), désactiver un compte.
 * Chaque appelant DOIT avoir vérifié le rôle admin au préalable.
 *
 * `import 'server-only'` fait échouer la compilation si ce module est importé
 * depuis un composant client.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
