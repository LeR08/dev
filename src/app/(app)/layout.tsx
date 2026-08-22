import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { requireUser } from '@/server/auth/guards';
import { getEntitlements } from '@/server/auth/session';
import { createClient } from '@/lib/supabase/server';
import { routes } from '@/lib/constants/routes';

/**
 * Barrière 2 sur 4 : la garde s'exécute côté serveur avant tout rendu.
 * Impossible à contourner depuis le client.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  if (!user.profile.onboarding_done) {
    redirect(routes.onboarding);
  }

  const supabase = await createClient();
  const [{ count }, entitlements] = await Promise.all([
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null),
    getEntitlements(),
  ]);

  return (
    <AppShell user={user} unreadCount={count ?? 0} hasAccess={entitlements.hasAny}>
      {children}
    </AppShell>
  );
}
