import React, { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { FadeInView } from '@/components/ui/FadeInView';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { approachesFor, nonMedicalFor, seekHelpFor } from '@/data/harm-reduction/content';
import { resourcesFor } from '@/data/resources';
import { RESOURCE_COUNTRIES, type ResourceCountry } from '@/domain/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

const COUNTRY_LABEL_KEY: Record<ResourceCountry, string> = {
  FR: 'help.countryFR',
  US: 'help.countryUS',
  GB: 'help.countryGB',
  CA: 'help.countryCA',
  CN: 'help.countryCN',
  SA: 'help.countrySA',
  AE: 'help.countryAE',
  OTHER: 'help.countryOTHER',
};

/** Only phone-number-shaped contacts are worth dialling from a tap. */
function isDialable(contact: string): boolean {
  return /^[\d\s+().-]+$/.test(contact.trim()) && /\d/.test(contact);
}

export default function HelpScreen() {
  const theme = useTheme();
  const { t, language } = useTranslation();
  const { settings, updateSettings } = useApp();
  const [country, setCountry] = useState<ResourceCountry>(settings.resourceCountry);

  const resources = useMemo(() => resourcesFor(country), [country]);
  const approaches = useMemo(() => approachesFor(language), [language]);
  const seekHelp = useMemo(() => seekHelpFor(language), [language]);
  const nonMedical = useMemo(() => nonMedicalFor(language), [language]);

  const selectCountry = (next: ResourceCountry) => {
    setCountry(next);
    void updateSettings({ resourceCountry: next });
  };

  return (
    <Screen>
      <View style={{ paddingTop: theme.spacing(8), paddingBottom: theme.spacing(4) }}>
        <Text variant="title">{t('help.title')}</Text>
      </View>

      <View style={{ gap: theme.spacing(4) }}>
        <FadeInView delay={0}>
          <Card tone="muted" style={{ gap: theme.spacing(1) }}>
            <Text variant="caption" tone="muted">
              {t('help.disclaimer')}
            </Text>
          </Card>
        </FadeInView>

        <FadeInView delay={60}>
          <View style={{ gap: theme.spacing(2) }}>
            <Text variant="caption" tone="muted" overline>
              {t('help.countryLabel')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2) }}>
              {RESOURCE_COUNTRIES.map((item) => (
                <Chip
                  key={item}
                  label={t(COUNTRY_LABEL_KEY[item] as never)}
                  selected={country === item}
                  onPress={() => selectCountry(item)}
                />
              ))}
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={120}>
          <Card style={{ gap: theme.spacing(3) }}>
            <Text variant="heading">{t('help.resourcesTitle')}</Text>
            {resources.entries.length === 0 ? (
              <Text variant="body" tone="muted">
                {t('help.noResourcesForCountry')}
              </Text>
            ) : (
              resources.entries.map((entry, index) => (
                <View key={entry.name} style={{ gap: 2 }}>
                  {index > 0 ? (
                    <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing(2) }} />
                  ) : null}
                  <Text variant="body">{entry.name}</Text>
                  {isDialable(entry.contact) ? (
                    <Pressable
                      accessibilityRole="link"
                      onPress={() => {
                        if (Platform.OS !== 'web') {
                          Linking.openURL(`tel:${entry.contact.replace(/[^\d+]/g, '')}`).catch(() => {});
                        }
                      }}
                    >
                      <Text variant="label" tone="accent">
                        {entry.contact}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text variant="label" tone="muted">
                      {entry.contact}
                    </Text>
                  )}
                  <Text variant="caption" tone="faint">
                    {entry.notes}
                  </Text>
                </View>
              ))
            )}
            <Text variant="caption" tone="faint">
              {t('help.verifyContacts')}
            </Text>
          </Card>
        </FadeInView>

        <FadeInView delay={180}>
          <Card style={{ gap: theme.spacing(3) }}>
            <Text variant="heading">{t('help.harmReductionTitle')}</Text>
            {approaches.map((approach) => (
              <View key={approach.title} style={{ gap: 2 }}>
                <Text variant="label">{approach.title}</Text>
                <Text variant="body" tone="muted">
                  {approach.body}
                </Text>
              </View>
            ))}
          </Card>
        </FadeInView>

        <FadeInView delay={210}>
          <Card style={{ gap: theme.spacing(3) }}>
            <Text variant="heading">{nonMedical.title}</Text>
            <Text variant="body" tone="muted">
              {nonMedical.intro}
            </Text>
            {nonMedical.items.map((item) => (
              <View key={item.title} style={{ gap: 2 }}>
                <Text variant="label">{item.title}</Text>
                <Text variant="body" tone="muted">
                  {item.body}
                </Text>
              </View>
            ))}
            <Text variant="caption" tone="faint">
              {nonMedical.caution}
            </Text>
          </Card>
        </FadeInView>

        <FadeInView delay={270}>
          <Card style={{ gap: theme.spacing(3) }}>
            <Text variant="heading">{t('help.seekHelpTitle')}</Text>
            <Text variant="body" tone="muted">
              {seekHelp.intro}
            </Text>
            <View style={{ gap: theme.spacing(1.5) }}>
              {seekHelp.signals.map((signal) => (
                <View key={signal} style={{ flexDirection: 'row', gap: theme.spacing(2) }}>
                  <Text variant="body" tone="muted">
                    ·
                  </Text>
                  <Text variant="body" tone="muted" style={{ flex: 1 }}>
                    {signal}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </FadeInView>
      </View>
    </Screen>
  );
}
