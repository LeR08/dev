import React, { useState } from 'react';
import { View } from 'react-native';

import { ProfileFields } from '@/components/ProfileFields';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { buildProfile, draftFromProfile, type ProfileDraft } from '@/domain/profile';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function ProfileScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { profile, settings, saveProfile } = useApp();
  const toast = useToast();

  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromProfile(profile));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await saveProfile(buildProfile(draft, profile, Date.now()));
      toast.show({ message: t('settings.profile.saveConfirm') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen bottomInset={theme.spacing(6)}>
      <View style={{ gap: theme.spacing(5), paddingTop: theme.spacing(4) }}>
        <Card tone="muted" style={{ gap: theme.spacing(1) }}>
          <Text variant="body" tone="muted">
            {t('settings.profile.intro')}
          </Text>
        </Card>

        <ProfileFields value={draft} onChange={setDraft} settings={settings} section="all" />

        <Button label={t('common.save')} size="lg" onPress={() => void save()} loading={saving} />
      </View>
    </Screen>
  );
}
