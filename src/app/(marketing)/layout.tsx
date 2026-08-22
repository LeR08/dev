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
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Logo />
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button asChild size="sm">
                <Link href={routes.dashboard}>Mon espace</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href={routes.login}>Connexion</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={routes.register}>Créer un compte</Link>
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
          <nav className="flex gap-4">
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
