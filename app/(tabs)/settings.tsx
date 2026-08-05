import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Row, RowDivider } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { CURRENCIES } from '@/domain/format';
import { ACCENTS } from '@/theme/palette';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { settings, drinks, entries } = useApp();

  const customCount = drinks.filter((drink) => drink.isCustom).length;
  const currencyLabel =
    CURRENCIES.find((currency) => currency.code === settings.currency)?.label ?? settings.currency;

  const goalSummary = () => {
    const parts: string[] = [];
    if (settings.goals.weeklyIntake !== null) parts.push(`${settings.goals.weeklyIntake}/week`);
    if (settings.goals.alcoholFreeDaysPerWeek !== null) {
      parts.push(`${settings.goals.alcoholFreeDaysPerWeek} free days`);
    }
    return parts.length > 0 ? parts.join(' · ') : 'None set';
  };

  return (
    <Screen>
      <View style={{ paddingTop: theme.spacing(8), paddingBottom: theme.spacing(4) }}>
        <Text variant="title">Settings</Text>
      </View>

      <View style={{ gap: theme.spacing(4) }}>
        <Card padded={false} style={{ paddingHorizontal: theme.spacing(4) }}>
          <Row
            title="Units"
            subtitle="Volume, standard drinks, currency"
            value={settings.volumeUnit}
            onPress={() => router.push('/settings/units')}
          />
          <RowDivider />
          <Row
            title="Currency"
            value={currencyLabel}
            onPress={() => router.push('/settings/units')}
          />
          <RowDivider />
          <Row
            title="Personal goals"
            subtitle="Optional, and only yours"
            value={goalSummary()}
            onPress={() => router.push('/settings/goals')}
          />
        </Card>

        <Card padded={false} style={{ paddingHorizontal: theme.spacing(4) }}>
          <Row
            title="Appearance"
            subtitle="Theme and accent colour"
            value={ACCENTS[settings.accent].label}
            onPress={() => router.push('/settings/appearance')}
          />
          <RowDivider />
          <Row
            title="My drinks"
            subtitle="Your own presets"
            value={`${customCount}`}
            onPress={() => router.push('/drinks')}
          />
          <RowDivider />
          <Row
            title="Default prices"
            subtitle="Price templates per drink"
            onPress={() => router.push('/settings/prices')}
          />
        </Card>

        <Card padded={false} style={{ paddingHorizontal: theme.spacing(4) }}>
          <Row
            title="Data & privacy"
            subtitle={`${entries.length} entries, stored on this device only`}
            onPress={() => router.push('/settings/data')}
          />
        </Card>

        <View style={{ gap: theme.spacing(1), paddingHorizontal: theme.spacing(2) }}>
          <Text variant="caption" tone="faint">
            Tally keeps everything locally. No account, no server, no analytics — nothing leaves this
            device unless you export it yourself.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
