import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NotificationPreferencesForm } from '@/components/layout/notification-preferences-form';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';

export const metadata: Metadata = {
  title: 'Préférences de notification',
  robots: { index: false, follow: false },
};

export default async function NotificationSettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Choisissez ce dont vous voulez être prévenu. Chaque réglage prend effet immédiatement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <NotificationPreferencesForm
          preferences={
            data ?? {
              user_id: user.id,
              new_course: true,
              new_lesson: true,
              new_quiz: true,
              goal_reached: true,
              badge_earned: true,
              study_reminder: false,
              email_enabled: false,
              updated_at: new Date().toISOString(),
            }
          }
        />
      </CardContent>
    </Card>
  );
}
