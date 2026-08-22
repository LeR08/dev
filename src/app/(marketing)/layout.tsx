import Link from 'next/link';
import { Logo } from '@/components/layout/logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Button } from '@/components/ui/button';
import { getSessionUser } from '@/server/auth/session';
import { routes } from '@/lib/constants/routes';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-background/85 sticky top-0 z-30 border-b backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-8">
          <Logo className="min-w-0 shrink" />
          <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {user ? (
              <Button asChild size="sm">
                <Link href={routes.dashboard}>Mon espace</Link>
              </Button>
            ) : (
              <>
                {/* Sous 640 px, « Connexion » disparaît au profit du seul appel
                    à l'action : à trois éléments, la barre déborde sur un
                    téléphone de 360 px. La connexion reste accessible depuis le
                    pied de page et depuis la page d'inscription. */}
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href={routes.login}>Connexion</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={routes.register}>
                    <span className="sm:hidden">S&apos;inscrire</span>
                    <span className="hidden sm:inline">Créer un compte</span>
                  </Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="contenu" className="flex-1">
        {children}
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo />
          <p>© {new Date().getFullYear()} AtelierDigital. Tous droits réservés.</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1">
            {!user && (
              <Link href={routes.login} className="hover:text-foreground transition-colors">
                Connexion
              </Link>
            )}
            <Link href="/legal/mentions" className="hover:text-foreground transition-colors">
              Mentions légales
            </Link>
            <Link href="/legal/confidentialite" className="hover:text-foreground transition-colors">
              Confidentialité
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
