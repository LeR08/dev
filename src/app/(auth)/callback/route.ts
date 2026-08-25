import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { routes } from '@/lib/constants/routes';

/**
 * Point d'atterrissage des liens envoyés par e-mail : confirmation
 * d'inscription, réinitialisation de mot de passe, invitation.
 *
 * Supabase peut arriver ici sous TROIS formes différentes selon la
 * configuration du projet et le modèle d'e-mail utilisé. Ne gérer que la
 * première — ce qu'on faisait — casse silencieusement l'authentification dès
 * que le modèle d'e-mail par défaut est employé.
 *
 *   1. `?code=…`                    flux PKCE, modèle « SSR »
 *   2. `?token_hash=…&type=…`       modèle d'e-mail par défaut de Supabase
 *   3. `?error=…&error_description=…`  lien expiré, déjà utilisé, ou URL de
 *                                      redirection non autorisée dans le projet
 *
 * Un quatrième cas existe : le flux « implicite », où les jetons arrivent dans
 * le fragment `#…` de l'URL. Le serveur ne voit jamais le fragment ; on renvoie
 * alors un message explicite plutôt qu'une page de connexion muette.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const supabaseError = searchParams.get('error') ?? searchParams.get('error_code');
  const errorDescription = searchParams.get('error_description');

  const nextParam = searchParams.get('next');
  // Ne jamais rediriger vers une URL absolue fournie en paramètre : ce serait
  // une redirection ouverte.
  const next = nextParam?.startsWith('/') && !nextParam.startsWith('//')
    ? nextParam
    : routes.dashboard;

  const fail = (reason: string, detail?: string | null) => {
    const url = new URL(routes.login, origin);
    url.searchParams.set('error', reason);
    if (detail) url.searchParams.set('detail', detail.slice(0, 200));
    return NextResponse.redirect(url);
  };

  // --- Cas 3 : Supabase signale lui-même une erreur -------------------------
  if (supabaseError) {
    const isExpired =
      supabaseError.includes('expired') || errorDescription?.includes('expired');
    return fail(isExpired ? 'expired_link' : 'provider_error', errorDescription);
  }

  const supabase = await createClient();

  // --- Cas 1 : flux PKCE ----------------------------------------------------
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail('expired_link', error.message);
    return NextResponse.redirect(`${origin}${next}`);
  }

  // --- Cas 2 : modèle d'e-mail par défaut ----------------------------------
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (error) return fail('expired_link', error.message);
    return NextResponse.redirect(`${origin}${next}`);
  }

  // --- Cas 4 : rien d'exploitable côté serveur ------------------------------
  return fail('invalid_link');
}
