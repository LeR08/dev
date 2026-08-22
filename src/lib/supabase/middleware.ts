import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import type { Database } from '@/types/database.types';

/**
 * Rafraîchit la session à chaque requête et propage les cookies mis à jour.
 * Sans cela, un jeton expiré ne serait renouvelé que côté client et les Server
 * Components verraient un utilisateur déconnecté.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() (et non getSession()) : seul getUser valide le jeton auprès du
  // serveur d'authentification. getSession lit le cookie sans le vérifier.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user, supabase };
}
