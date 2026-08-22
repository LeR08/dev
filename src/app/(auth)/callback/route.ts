import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { routes } from '@/lib/constants/routes';

/**
 * Point d'atterrissage des liens envoyés par e-mail (confirmation d'inscription
 * et réinitialisation de mot de passe). Échange le code contre une session.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next');
  // Ne jamais rediriger vers une URL absolue fournie en paramètre : ce serait
  // une redirection ouverte.
  const next = nextParam?.startsWith('/') ? nextParam : routes.dashboard;

  if (!code) {
    return NextResponse.redirect(`${origin}${routes.login}?error=invalid_link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}${routes.login}?error=expired_link`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
