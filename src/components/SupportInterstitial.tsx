import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';

const MESSAGE_COUNT = 5;

/**
 * The one thing free users see on launch instead of a real ad: a short,
 * skippable, self-authored message about support & addiction resources
 * (never sourced from an ad network, so its content stays something we
 * actually control) — the freemium ask was for something at every launch,
 * but kept light and optional rather than a mandatory 30s wait, and
 * themed around support rather than promotion. See README's "Freemium,
 * payments & ads" section.
 */
export function SupportInterstitial({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [messageIndex] = useState(() => Math.floor(Math.random() * MESSAGE_COUNT) + 1);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onDismiss}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing(6),
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            padding: theme.spacing(5),
            gap: theme.spacing(3),
            maxWidth: 420,
            width: '100%',
          }}
        >
          <Text variant="caption" tone="muted" overline>
            {t('ads.psa.badge')}
          </Text>
          <Text variant="heading">{t('ads.psa.title')}</Text>
          <Text variant="body" tone="muted">
            {t(`ads.psa.message${messageIndex}` as never)}
          </Text>
          <View style={{ gap: theme.spacing(2), marginTop: theme.spacing(1) }}>
            <Button
              label={t('ads.psa.helpAction')}
              variant="secondary"
              onPress={() => {
                onDismiss();
                router.push('/help');
              }}
            />
            <Button label={t('ads.psa.skipAction')} variant="ghost" haptic={false} onPress={onDismiss} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
