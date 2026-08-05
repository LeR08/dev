import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Platform, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useAppInfo } from '@/hooks/useAppInfo';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';
import type { TicketType } from '@/domain/types';

export default function ReportProblemScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { addTicket } = useApp();
  const toast = useToast();
  const { appVersion, platform } = useAppInfo();

  const [type, setType] = useState<TicketType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSubmit = title.trim().length > 0 && !saving;

  const pickScreenshot = async () => {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      setScreenshotUri(result.assets[0].uri);
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await addTicket({
        type,
        title: title.trim(),
        description: description.trim(),
        screenshotUri,
        appVersion,
        platform,
      });
      toast.show({ message: t('tickets.submitted') });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen bottomInset={theme.spacing(6)}>
      <View style={{ gap: theme.spacing(4), paddingTop: theme.spacing(4) }}>
        <View style={{ gap: theme.spacing(2) }}>
          <Text variant="caption" tone="muted" overline>
            {t('tickets.typeLabel')}
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing(2) }}>
            <Chip label={t('tickets.typeBug')} selected={type === 'bug'} onPress={() => setType('bug')} />
            <Chip
              label={t('tickets.typeSuggestion')}
              selected={type === 'suggestion'}
              onPress={() => setType('suggestion')}
            />
          </View>
        </View>

        <Field
          label={t('tickets.titleLabel')}
          value={title}
          onChangeText={setTitle}
          placeholder={t('tickets.titlePlaceholder')}
        />

        <Field
          label={t('tickets.descriptionLabel')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('tickets.descriptionPlaceholder')}
          multiline
          style={{ minHeight: 96, textAlignVertical: 'top' }}
        />

        <View style={{ gap: theme.spacing(2) }}>
          <Text variant="caption" tone="muted" overline>
            {t('tickets.screenshotLabel')}
          </Text>
          {screenshotUri ? (
            <View style={{ gap: theme.spacing(2) }}>
              <Image
                source={{ uri: screenshotUri }}
                style={{ width: '100%', height: 180, borderRadius: theme.radius.md }}
                resizeMode="cover"
              />
              <Button
                label={t('tickets.removeScreenshot')}
                variant="ghost"
                haptic={false}
                onPress={() => setScreenshotUri(null)}
              />
            </View>
          ) : (
            <Button label={t('tickets.addScreenshot')} variant="secondary" onPress={() => void pickScreenshot()} />
          )}
        </View>

        <Text variant="caption" tone="faint">
          {t('tickets.autoCaptured')} ({appVersion} · {platform})
        </Text>

        <Button label={t('tickets.submit')} size="lg" onPress={() => void submit()} disabled={!canSubmit} loading={saving} />
      </View>
    </Screen>
  );
}
