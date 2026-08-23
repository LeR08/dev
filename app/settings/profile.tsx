import React, { useState } from 'react';
import { View } from 'react-native';

import { ProfileFields } from '@/components/ProfileFields';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { buildProfile, draftFromProfile, isValidEmail, type ProfileDraft } from '@/domain/profile';
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

  const emailInvalid = (draft.email ?? '').trim() !== '' && !isValidEmail(draft.email ?? '');

  const save = async () => {
    setSaving(true);
    try {
      const toSave: ProfileDraft = { ...draft, email: emailInvalid ? null : draft.email };
      await saveProfile(buildProfile(toSave, profile, Date.now()));
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

        <View style={{ gap: theme.spacing(4) }}>
          <Field
            label={t('signIn.nameLabel')}
            value={draft.name ?? ''}
            onChangeText={(name) => setDraft({ ...draft, name: name === '' ? null : name })}
            placeholder={t('signIn.namePlaceholder')}
            autoCapitalize="words"
          />
          <Field
            label={t('signIn.emailLabel')}
            value={draft.email ?? ''}
            onChangeText={(email) => setDraft({ ...draft, email: email === '' ? null : email })}
            placeholder={t('signIn.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            hint={t('signIn.emailHint')}
          />
        </View>

        <ProfileFields value={draft} onChange={setDraft} settings={settings} section="all" />

        <Button label={t('common.save')} size="lg" onPress={() => void save()} loading={saving} />
      </View>
    </Screen>
  );
}
