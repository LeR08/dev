import type { Metadata } from 'next';
import { Bell } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/states';
import { NotificationList } from '@/components/layout/notification-list';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';
import { routes } from '@/lib/constants/routes';

export const metadata: Metadata = {
  title: 'Notifications',
  robots: { index: false, follow: false },
};

export default async function NotificationsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, body, link_url, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const notifications = data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <PageHeader
        title="Notifications"
        description="Nouveautés du catalogue, objectifs atteints et badges obtenus."
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Aucune notification"
          description="Vous serez prévenu ici des nouvelles formations et de vos objectifs atteints."
          action={{ label: 'Régler mes préférences', href: routes.settingsNotifications }}
        />
      ) : (
        <NotificationList notifications={notifications} />
      )}
    </div>
  );
}
