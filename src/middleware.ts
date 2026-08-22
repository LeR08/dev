import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { AUTH_ROUTES, PROTECTED_PREFIXES, routes } from '@/lib/constants/routes';

/**
 * Barrière 1 sur 4 (voir docs/ARCHITECTURE.md §4.2).
 *
 * Rafraîchit la session et gère les redirections. C'est une commodité d'UX :
 * la sécurité réelle vient des gardes serveur et surtout de la RLS PostgreSQL.
 */
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = routes.login;
    url.search = '';
    // Mémorise la destination pour y revenir après connexion.
    url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = routes.dashboard;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf :
     * - les fichiers statiques Next (_next/static, _next/image)
     * - les fichiers d'images et polices
     * - favicon, robots, sitemap
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)',
  ],
};
