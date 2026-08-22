import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/lib/env';
import type { Database } from '@/types/database.types';

/**
 * Client Supabase pour les Server Components, Server Actions et Route Handlers.
 * Les cookies portent la session ; ils sont rafraîchis par le middleware.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Appelé depuis un Server Component : l'écriture de cookie y est
          // interdite. Le middleware s'en charge, on peut ignorer.
        }
      },
    },
  });
}
