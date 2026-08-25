import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { routes } from '@/lib/constants/routes';

/**
 * Déconnexion par Route Handler.
 *
 * Un Server Component ne peut pas écrire de cookie : appeler signOut() depuis
 * un layout laisserait la session en place. Le proxy verrait alors toujours un
 * utilisateur connecté et le renverrait vers /dashboard, qui le renverrait vers
 * /login — boucle de redirection, compte inutilisable.
 *
 * Cette route, elle, peut écrire les cookies : la session est réellement
 * effacée avant la redirection.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const reason = searchParams.get('reason');

  const supabase = await createClient();
  await supabase.auth.signOut();

  const url = new URL(routes.login, origin);
  if (reason) url.searchParams.set('error', reason);
  return NextResponse.redirect(url);
}

export const POST = GET;
