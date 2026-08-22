import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/layout/logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { UserMenu } from '@/components/layout/user-menu';
import { AdminNav } from '@/components/admin/admin-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { requireStaff } from '@/server/auth/guards';
import { routes } from '@/lib/constants/routes';

/**
 * Barrière 2 sur 4 : la garde s'exécute côté serveur avant tout rendu.
 * Un membre `student` reçoit un 404, ce qui ne révèle même pas l'existence
 * de la zone. Les server actions revérifient (barrière 3) et la RLS tranche
 * en dernier ressort (barrière 4).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();

  return (
    <div className="min-h-dvh">
      <aside className="bg-card fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r lg:flex">
        <div className="space-y-2 px-5 py-5">
          <Logo href={routes.admin} />
          <Badge variant="warning">
            {user.profile.role === 'admin' ? 'Administration' : 'Espace formateur'}
          </Badge>
        </div>
        <div className="flex-1 overflow-y-auto px-3">
          <AdminNav role={user.profile.role} />
        </div>
        <div className="border-t p-3">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start">
            <Link href={routes.dashboard}>
              <ArrowLeft /> Retour à la plateforme
            </Link>
          </Button>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="bg-background/85 sticky top-0 z-20 flex h-14 items-center gap-2 border-b px-4 backdrop-blur-md sm:px-6">
          <div className="lg:hidden">
            <Logo href={routes.admin} />
          </div>
          <div className="flex-1" />
          <ThemeToggle />
          <UserMenu
            firstName={user.profile.first_name}
            lastName={user.profile.last_name}
            email={user.email}
            avatarUrl={user.profile.avatar_url}
            role={user.profile.role}
          />
        </header>

        {/* Navigation mobile de l'administration */}
        <div className="border-b px-4 py-2 lg:hidden">
          <AdminNav role={user.profile.role} horizontal />
        </div>

        <main id="contenu" className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
