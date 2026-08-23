import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import type { Account } from '@/domain/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The account entry in Settings.
 *
 * A plain <Row> can't carry this one well: the email is the longest value
 * in the whole screen, and as a right-hand value it either overruns or has
 * to be truncated so hard it stops being readable. Here it gets the full
 * width of its own line instead, under the title, with the avatar and the
 * sync state doing the work of showing account status at a glance.
 */
export function AccountRow({ account }: { account: Account | null }) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const email = account?.email ?? null;
  const signedIn = account !== null;
  const synced = account?.lastSyncedAt != null;
  const initial = email ? email.trim().charAt(0).toUpperCase() : null;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/settings/account')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing(3),
        paddingVertical: theme.spacing(3.5),
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: signedIn ? theme.accent.soft : theme.colors.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {initial ? (
          <Text variant="heading" style={{ color: theme.accent.strong }}>
            {initial}
          </Text>
        ) : (
          <Icon name="user" size={20} color={theme.colors.textFaint} strokeWidth={2} />
        )}
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <Text variant="body">{t('settings.accountRow')}</Text>
        {email ? (
          <Text variant="label" tone="muted" numberOfLines={1} ellipsizeMode="middle">
            {email}
          </Text>
        ) : (
          <Text variant="caption" tone="muted">
            {t('settings.accountRowSubtitle')}
          </Text>
        )}
        {signedIn ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.5), marginTop: 1 }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: synced ? theme.colors.positive : theme.colors.textFaint,
              }}
            />
            <Text variant="caption" tone="faint">
              {synced ? t('settings.accountSynced') : t('account.neverSyncedLabel')}
            </Text>
          </View>
        ) : null}
      </View>

      <Text variant="body" tone="faint">
        ›
      </Text>
    </Pressable>
  );
}
