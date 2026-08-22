import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { Logo } from './logo';
import { SidebarNav } from './sidebar-nav';
import { MobileNav } from './mobile-nav';
import { MobileSidebar } from './mobile-sidebar';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';
import { NotificationBell } from './notification-bell';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/constants/routes';
import type { SessionUser } from '@/server/auth/session';

export function AppShell({
  user,
  unreadCount,
  hasAccess,
  children,
}: {
  user: SessionUser;
  unreadCount: number;
  hasAccess: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      {/* Sidebar — desktop uniquement */}
      <aside className="bg-card fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r lg:flex">
        <div className="px-5 py-5">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto px-3">
          <SidebarNav />
        </div>
        {!hasAccess && (
          <div className="border-t p-4">
            <div className="bg-primary-muted space-y-2 rounded-xl p-3.5">
              <p className="text-primary text-sm font-medium">Débloquer la formation</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Saisissez le code d&apos;activation reçu après votre achat.
              </p>
              <Button asChild size="sm" className="w-full">
                <Link href={routes.activate}>
                  <KeyRound /> Activer mon code
                </Link>
              </Button>
            </div>
          </div>
        )}
      </aside>

      <div className="lg:pl-64">
        <header className="bg-background/85 sticky top-0 z-20 flex h-14 items-center gap-2 border-b px-4 backdrop-blur-md sm:px-6">
          <MobileSidebar />
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="flex-1" />
          {!hasAccess && (
            <Button asChild size="sm" variant="secondary" className="hidden sm:inline-flex">
              <Link href={routes.activate}>
                <KeyRound /> Activer un code
              </Link>
            </Button>
          )}
          <NotificationBell unreadCount={unreadCount} />
          <ThemeToggle />
          <UserMenu
            firstName={user.profile.first_name}
            lastName={user.profile.last_name}
            email={user.email}
            avatarUrl={user.profile.avatar_url}
            role={user.profile.role}
          />
        </header>

        <main id="contenu" className="px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
