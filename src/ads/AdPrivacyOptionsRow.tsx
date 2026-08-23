import React, { useEffect, useState } from 'react';
import {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
} from 'react-native-google-mobile-ads';

import { Row, RowDivider } from '@/components/ui/Row';
import { useTranslation } from '@/i18n/I18nProvider';

/**
 * Reopens Google's advertising consent form.
 *
 * Google's UMP rules are explicit: where a privacy options form is required —
 * the EEA and the UK — the app has to give people a way back to it, not just
 * the one-off prompt they saw before the first ad. This is that way back.
 *
 * The row hides itself everywhere else, including before consent has ever been
 * gathered, because `getConsentInfo` reads what UMP has already stored rather
 * than asking the network. Someone who has never opened the supporter screen
 * has no ad consent to revisit, and offering them the option would be noise.
 */
export function AdPrivacyOptionsRow() {
  const { t } = useTranslation();
  const [required, setRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const info = await AdsConsent.getConsentInfo();
        if (cancelled) return;
        setRequired(
          info.privacyOptionsRequirementStatus ===
            AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
        );
      } catch {
        // Leaves the row hidden.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!required) return null;

  return (
    <>
      <RowDivider />
      <Row
        title={t('settings.adPrivacyRow')}
        subtitle={t('settings.adPrivacyRowSubtitle')}
        onPress={() => void AdsConsent.showPrivacyOptionsForm().catch(() => {})}
      />
    </>
  );
}
