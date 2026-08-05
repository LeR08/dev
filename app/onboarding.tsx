import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileFields } from '@/components/ProfileFields';
import { Button } from '@/components/ui/Button';
import { USE_NATIVE_DRIVER } from '@/components/ui/animation';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { FadeInView } from '@/components/ui/FadeInView';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { buildProfile, emptyProfileDraft, isValidEmail, type ProfileDraft } from '@/domain/profile';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

const STEP_COUNT = 3;

/**
 * First-run flow: sign in (local-only, sets the tone) → profile → done.
 *
 * Units, currency and a weekly goal used to be separate mandatory steps here;
 * currency now comes from the device locale (§21) and the rest are reasonable
 * defaults the user can revisit in Settings whenever they like, so the wizard
 * stays to the one thing spec asked to happen "at app opening": who you are
 * and the identified profile fields (v1.2 §4) — still never leaving the
 * device, still optional wherever a field can't be guessed.
 */
export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { profile, saveProfile, updateSettings } = useApp();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(emptyProfileDraft());
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: USE_NATIVE_DRIVER }).start();
  }, [fade, step]);

  const emailInvalid = email.trim() !== '' && !isValidEmail(email);

  const finish = async () => {
    const now = Date.now();
    const draft: ProfileDraft = {
      ...profileDraft,
      name: name.trim() === '' ? null : name.trim(),
      email: email.trim() === '' || emailInvalid ? null : email.trim(),
    };
    await saveProfile(buildProfile(draft, profile, now));
    await updateSettings({ onboardingCompletedAt: now });
    router.replace('/');
  };

  const next = () => {
    if (step < STEP_COUNT - 1) setStep((current) => current + 1);
    else void finish();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <Screen scrollProps={{ contentInsetAdjustmentBehavior: 'automatic' }}>
        <Animated.View style={{ opacity: fade, gap: theme.spacing(5), paddingTop: theme.spacing(10) }}>
          {step === 0 ? (
            <SignInStep name={name} onName={setName} email={email} onEmail={setEmail} emailInvalid={emailInvalid} />
          ) : null}
          {step === 1 ? <ProfileStep value={profileDraft} onChange={setProfileDraft} /> : null}
          {step === 2 ? <DoneStep name={name} /> : null}
        </Animated.View>
      </Screen>

      <View
        style={{
          paddingHorizontal: theme.spacing(5),
          paddingBottom: insets.bottom + theme.spacing(5),
          gap: theme.spacing(3),
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', gap: theme.spacing(1.5), justifyContent: 'center' }}>
          {Array.from({ length: STEP_COUNT }, (_, index) => (
            <View
              key={index}
              style={{
                width: index === step ? 20 : 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: index === step ? theme.accent.base : theme.colors.trackEmpty,
              }}
            />
          ))}
        </View>

        <Button
          label={step === STEP_COUNT - 1 ? t('onboarding.startTracking') : t('signIn.continueAction')}
          size="lg"
          onPress={next}
        />

        {step < STEP_COUNT - 1 ? (
          <Button label={t('onboarding.skipSetup')} variant="ghost" haptic={false} onPress={() => void finish()} />
        ) : null}
      </View>
    </View>
  );
}

type SignInStepProps = {
  name: string;
  onName: (value: string) => void;
  email: string;
  onEmail: (value: string) => void;
  emailInvalid: boolean;
};

function SignInStep({ name, onName, email, onEmail, emailInvalid }: SignInStepProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{ gap: theme.spacing(5) }}>
      <FadeInView delay={0}>
        <View style={{ gap: theme.spacing(3), alignItems: 'flex-start' }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: theme.accent.soft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="user" size={26} color={theme.accent.base} strokeWidth={2} />
          </View>
          <Text variant="display">{t('signIn.title')}</Text>
          <Text variant="body" tone="muted">
            {t('signIn.subtitle')}
          </Text>
        </View>
      </FadeInView>

      <FadeInView delay={80}>
        <View style={{ gap: theme.spacing(4) }}>
          <Field
            label={t('signIn.nameLabel')}
            value={name}
            onChangeText={onName}
            placeholder={t('signIn.namePlaceholder')}
            autoCapitalize="words"
          />
          <View>
            <Field
              label={t('signIn.emailLabel')}
              value={email}
              onChangeText={onEmail}
              placeholder={t('signIn.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              hint={emailInvalid ? undefined : t('signIn.emailHint')}
            />
            {emailInvalid ? (
              <Text variant="caption" tone="muted" style={{ marginTop: theme.spacing(1) }}>
                {t('signIn.emailHint')}
              </Text>
            ) : null}
          </View>
        </View>
      </FadeInView>

      <FadeInView delay={140}>
        <Card tone="muted">
          <Text variant="caption" tone="muted">
            {t('signIn.testModeNotice')}
          </Text>
        </Card>
      </FadeInView>
    </View>
  );
}

function ProfileStep({ value, onChange }: { value: ProfileDraft; onChange: (next: ProfileDraft) => void }) {
  const theme = useTheme();
  const { settings } = useApp();
  const { t } = useTranslation();

  return (
    <View style={{ gap: theme.spacing(4) }}>
      <FadeInView delay={0}>
        <View style={{ gap: theme.spacing(2) }}>
          <Text variant="title">{t('onboarding.profile.title')}</Text>
          <Text variant="body" tone="muted">
            {t('onboarding.profile.subtitle')}
          </Text>
        </View>
      </FadeInView>
      <FadeInView delay={60}>
        <ProfileFields value={value} onChange={onChange} settings={settings} section="all" />
      </FadeInView>
    </View>
  );
}

function DoneStep({ name }: { name: string }) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <FadeInView delay={0}>
      <View style={{ gap: theme.spacing(4) }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: theme.accent.soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="check" size={26} color={theme.accent.base} strokeWidth={2.4} />
        </View>
        <Text variant="display">
          {name.trim() !== '' ? `${t('onboarding.profile.doneTitle')}, ${name.trim()}` : t('onboarding.profile.doneTitle')}
        </Text>
        <Card tone="accent" style={{ gap: theme.spacing(2) }}>
          <Text variant="body">{t('onboarding.profile.doneSubtitle')}</Text>
        </Card>
      </View>
    </FadeInView>
  );
}
