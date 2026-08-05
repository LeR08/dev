import React from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Row, RowDivider } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { STANDARD_DRINK_PRESETS } from '@/domain/alcohol';
import { CURRENCIES } from '@/domain/format';
import type { IntakeUnit, VolumeUnit } from '@/domain/types';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function UnitsScreen() {
  const theme = useTheme();
  const { settings, updateSettings } = useApp();

  return (
    <Screen>
      <View style={{ gap: theme.spacing(5), paddingTop: theme.spacing(4) }}>
        <Section title="Volume" caption="How serving sizes are entered and shown.">
          <Segmented<VolumeUnit>
            options={[
              { value: 'cl', label: 'Centilitres' },
              { value: 'ml', label: 'Millilitres' },
            ]}
            value={settings.volumeUnit}
            onChange={(volumeUnit) => updateSettings({ volumeUnit })}
          />
        </Section>

        <Section
          title="How intake is counted"
          caption="Standard drinks are easier to compare; grams of pure alcohol are exact."
        >
          <Segmented<IntakeUnit>
            options={[
              { value: 'standardDrinks', label: 'Standard drinks' },
              { value: 'grams', label: 'Grams' },
            ]}
            value={settings.intakeUnit}
            onChange={(intakeUnit) => updateSettings({ intakeUnit })}
          />
        </Section>

        <Section
          title="One standard drink"
          caption="Countries define this differently. Pick the one you think in."
        >
          <Card padded={false} style={{ paddingHorizontal: theme.spacing(4) }}>
            {STANDARD_DRINK_PRESETS.map((preset, index) => (
              <View key={preset.grams}>
                {index > 0 ? <RowDivider /> : null}
                <Row
                  title={preset.label}
                  subtitle={preset.detail}
                  value={settings.standardDrinkGrams === preset.grams ? '✓' : undefined}
                  onPress={() => updateSettings({ standardDrinkGrams: preset.grams })}
                />
              </View>
            ))}
          </Card>
        </Section>

        <Section title="Week starts on">
          <Segmented<'mon' | 'sun'>
            options={[
              { value: 'mon', label: 'Monday' },
              { value: 'sun', label: 'Sunday' },
            ]}
            value={settings.weekStartsOn === 1 ? 'mon' : 'sun'}
            onChange={(value) => updateSettings({ weekStartsOn: value === 'mon' ? 1 : 0 })}
          />
        </Section>

        <Section title="Currency">
          <Card padded={false} style={{ paddingHorizontal: theme.spacing(4) }}>
            {CURRENCIES.map((currency, index) => (
              <View key={currency.code}>
                {index > 0 ? <RowDivider /> : null}
                <Row
                  title={currency.label}
                  subtitle={`${currency.code} · ${currency.symbol}`}
                  value={settings.currency === currency.code ? '✓' : undefined}
                  onPress={() => updateSettings({ currency: currency.code })}
                />
              </View>
            ))}
          </Card>
        </Section>
      </View>
    </Screen>
  );
}

function Section({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(2) }}>
      <Text variant="caption" tone="muted" overline>
        {title}
      </Text>
      {caption ? (
        <Text variant="caption" tone="faint">
          {caption}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
