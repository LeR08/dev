import Link from 'next/link';
import { Logo } from '@/components/layout/logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface-gradient flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <ThemeToggle />
      </header>

      <main id="contenu" className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
        <div className="animate-slide-up w-full max-w-md">{children}</div>
      </main>

      <footer className="text-muted-foreground px-5 py-6 text-center text-xs sm:px-8">
        <Link href="/" className="hover:text-foreground transition-colors">
          Retour à l&apos;accueil
        </Link>
      </footer>
    </div>
  );
}
