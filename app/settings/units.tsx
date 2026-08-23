import React from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Row, RowDivider } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { STANDARD_DRINK_PRESETS } from '@/domain/alcohol';
import { CURRENCIES } from '@/domain/format';
import type { HeightUnit, IntakeUnit, VolumeUnit, WeightUnit } from '@/domain/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

const PRESET_LABEL_KEY: Record<number, string> = {
  8: 'unitsScreen.presetUK',
  10: 'unitsScreen.presetFR',
  12: 'unitsScreen.presetDE',
  14: 'unitsScreen.presetUS',
};

const PRESET_DETAIL_KEY: Record<number, string> = {
  8: 'unitsScreen.presetUKDetail',
  10: 'unitsScreen.presetFRDetail',
  12: 'unitsScreen.presetDEDetail',
  14: 'unitsScreen.presetUSDetail',
};

export default function UnitsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, updateSettings } = useApp();

  return (
    <Screen>
      <View style={{ gap: theme.spacing(5), paddingTop: theme.spacing(4) }}>
        <Section title={t('unitsScreen.volumeTitle')} caption={t('unitsScreen.volumeCaption')}>
          <Segmented<VolumeUnit>
            options={[
              { value: 'cl', label: t('unitsScreen.centilitres') },
              { value: 'ml', label: t('unitsScreen.millilitres') },
            ]}
            value={settings.volumeUnit}
            onChange={(volumeUnit) => updateSettings({ volumeUnit })}
          />
        </Section>

        <Section title={t('unitsScreen.intakeTitle')} caption={t('unitsScreen.intakeCaption')}>
          <Segmented<IntakeUnit>
            options={[
              { value: 'standardDrinks', label: t('unitsScreen.standardDrinksOption') },
              { value: 'grams', label: t('unitsScreen.gramsOption') },
            ]}
            value={settings.intakeUnit}
            onChange={(intakeUnit) => updateSettings({ intakeUnit })}
          />
        </Section>

        <Section title={t('unitsScreen.oneServingTitle')} caption={t('unitsScreen.oneServingCaption')}>
          <Card padded={false} style={{ paddingHorizontal: theme.spacing(4) }}>
            {STANDARD_DRINK_PRESETS.map((preset, index) => (
              <View key={preset.grams}>
                {index > 0 ? <RowDivider /> : null}
                <Row
                  title={t(PRESET_LABEL_KEY[preset.grams] as never)}
                  subtitle={t(PRESET_DETAIL_KEY[preset.grams] as never)}
                  value={settings.standardDrinkGrams === preset.grams ? '✓' : undefined}
                  onPress={() => updateSettings({ standardDrinkGrams: preset.grams })}
                />
              </View>
            ))}
          </Card>
        </Section>

        <Section title={t('unitsScreen.weightTitle')} caption={t('unitsScreen.weightCaption')}>
          <Segmented<WeightUnit>
            options={[
              { value: 'kg', label: t('unitsScreen.kilograms') },
              { value: 'lb', label: t('unitsScreen.pounds') },
            ]}
            value={settings.weightUnit}
            onChange={(weightUnit) => updateSettings({ weightUnit })}
          />
        </Section>

        <Section title={t('unitsScreen.heightTitle')}>
          <Segmented<HeightUnit>
            options={[
              { value: 'cm', label: t('unitsScreen.centimetres') },
              { value: 'in', label: t('unitsScreen.inches') },
            ]}
            value={settings.heightUnit}
            onChange={(heightUnit) => updateSettings({ heightUnit })}
          />
        </Section>

        <Section title={t('unitsScreen.weekStartsTitle')}>
          <Segmented<'mon' | 'sun'>
            options={[
              { value: 'mon', label: t('unitsScreen.monday') },
              { value: 'sun', label: t('unitsScreen.sunday') },
            ]}
            value={settings.weekStartsOn === 1 ? 'mon' : 'sun'}
            onChange={(value) => updateSettings({ weekStartsOn: value === 'mon' ? 1 : 0 })}
          />
        </Section>

        <Section title={t('unitsScreen.currencyTitle')}>
          <Card padded={false} style={{ paddingHorizontal: theme.spacing(4) }}>
            {CURRENCIES.map((currency, index) => (
              <View key={currency.code}>
                {index > 0 ? <RowDivider /> : null}
                <Row
                  title={t(`currencies.${currency.code}` as never)}
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
