'use client';

import * as React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { updateNotificationPreferences } from '@/server/actions/profile.actions';
import type { Tables } from '@/types/database.types';

type Preferences = Tables<'notification_preferences'>;
type PreferenceKey = Exclude<keyof Preferences, 'user_id' | 'updated_at'>;

const OPTIONS: Array<{ key: PreferenceKey; label: string; description: string }> = [
  { key: 'new_course', label: 'Nouvelle formation', description: 'Quand une formation est publiée.' },
  { key: 'new_lesson', label: 'Nouvelle leçon', description: 'Quand une leçon est ajoutée à une formation suivie.' },
  { key: 'new_quiz', label: 'Nouveau quiz', description: 'Quand un quiz est ajouté à une leçon.' },
  { key: 'goal_reached', label: 'Objectif atteint', description: 'Quand vous atteignez un objectif.' },
  { key: 'badge_earned', label: 'Badge obtenu', description: 'Quand vous débloquez un badge.' },
  { key: 'study_reminder', label: "Rappel d'étude", description: 'Un rappel si vous risquez de perdre votre série.' },
  { key: 'email_enabled', label: 'Recevoir par e-mail', description: 'En plus des notifications dans l’application.' },
];

export function NotificationPreferencesForm({ preferences }: { preferences: Preferences }) {
  const { toast } = useToast();
  const [values, setValues] = React.useState(preferences);
  const [pending, setPending] = React.useState<PreferenceKey | null>(null);

  async function toggle(key: PreferenceKey, next: boolean) {
    const previous = values;
    // Bascule optimiste : le retour serveur ne doit pas faire clignoter l'interface.
    const updated = { ...values, [key]: next };
    setValues(updated);
    setPending(key);

    const result = await updateNotificationPreferences({
      new_course: updated.new_course,
      new_lesson: updated.new_lesson,
      new_quiz: updated.new_quiz,
      goal_reached: updated.goal_reached,
      badge_earned: updated.badge_earned,
      study_reminder: updated.study_reminder,
      email_enabled: updated.email_enabled,
    });
    setPending(null);

    if (!result.ok) {
      setValues(previous);
      toast({ title: 'Enregistrement impossible', description: result.error, tone: 'error' });
    }
  }

  return (
    <ul className="divide-y">
      {OPTIONS.map((option) => (
        <li key={option.key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
          <div className="min-w-0 space-y-0.5">
            <Label htmlFor={option.key}>{option.label}</Label>
            <p className="text-muted-foreground text-sm">{option.description}</p>
          </div>
          <Switch
            id={option.key}
            checked={Boolean(values[option.key])}
            disabled={pending === option.key}
            onCheckedChange={(next) => toggle(option.key, next)}
          />
        </li>
      ))}
    </ul>
  );
}
