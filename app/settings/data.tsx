import React, { useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { backupFileName, buildBackup, ticketsFileName, ticketsToCsv, toCsv, toJson } from '@/export/backup';
import { exportText } from '@/export/share';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

const CONFIRM_WORD = 'DELETE';

export default function DataScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { entries, drinks, settings, profile, tickets, clearAllData } = useApp();
  const toast = useToast();

  const [busy, setBusy] = useState<'csv' | 'json' | 'tickets' | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const runExport = async (kind: 'csv' | 'json') => {
    if (entries.length === 0) {
      toast.show({ message: t('dataScreen.nothingToExport') });
      return;
    }
    setBusy(kind);
    try {
      const fileName = backupFileName(kind);
      const content =
        kind === 'csv'
          ? toCsv(entries, settings.currency)
          : toJson(buildBackup(entries, drinks, settings, profile, tickets));
      const result = await exportText(
        fileName,
        content,
        kind === 'csv' ? 'text/csv' : 'application/json',
        t('dataScreen.exportDialogTitle')
      );

      toast.show({
        message:
          result === 'downloaded'
            ? t('dataScreen.downloadedToast', { file: fileName })
            : result === 'shared'
              ? t('dataScreen.exportReadyToast')
              : t('dataScreen.sharingUnavailableToast'),
      });
    } catch (error) {
      toast.show({ message: error instanceof Error ? error.message : t('dataScreen.exportFailedToast') });
    } finally {
      setBusy(null);
    }
  };

  const runTicketExport = async () => {
    if (tickets.length === 0) {
      toast.show({ message: t('dataScreen.noTicketsToExport') });
      return;
    }
    setBusy('tickets');
    try {
      const fileName = ticketsFileName('csv');
      const result = await exportText(
        fileName,
        ticketsToCsv(tickets),
        'text/csv',
        t('dataScreen.exportTicketsDialogTitle')
      );
      toast.show({
        message:
          result === 'downloaded'
            ? t('dataScreen.downloadedToast', { file: fileName })
            : result === 'shared'
              ? t('dataScreen.exportReadyToast')
              : t('dataScreen.sharingUnavailableToast'),
      });
    } catch (error) {
      toast.show({ message: error instanceof Error ? error.message : t('dataScreen.exportFailedToast') });
    } finally {
      setBusy(null);
    }
  };

  const wipe = async () => {
    setDeleting(true);
    try {
      await clearAllData();
      setConfirmText('');
      toast.show({ message: t('dataScreen.allDataDeletedToast') });
    } catch {
      // clearAllData leaves the device untouched when it cannot reach the
      // cloud copy, so nothing has been deleted here — say so rather than
      // letting the screen look as though it worked.
      toast.show({ message: t('dataScreen.deleteFailedToast') });
    } finally {
      setDeleting(false);
    }
  };

  const confirmWipe = () => {
    if (confirmText.trim().toUpperCase() !== CONFIRM_WORD) return;
    if (Platform.OS === 'web') {
      void wipe();
      return;
    }
    Alert.alert(t('dataScreen.deleteConfirmTitle'), t('dataScreen.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('dataScreen.deleteAllAction'), style: 'destructive', onPress: () => void wipe() },
    ]);
  };

  const canWipe = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  return (
    <Screen>
      <View style={{ gap: theme.spacing(4), paddingTop: theme.spacing(4) }}>
        <Card style={{ gap: theme.spacing(2) }}>
          <Text variant="heading">{t('dataScreen.whereTitle')}</Text>
          <Text variant="body" tone="muted">
            {t('dataScreen.whereBody')}
          </Text>
          <Text variant="caption" tone="faint">
            {t('dataScreen.countSummary', {
              entries: entries.length,
              drinks: drinks.filter((drink) => drink.isCustom).length,
            })}
          </Text>
        </Card>

        <Card style={{ gap: theme.spacing(3) }}>
          <View style={{ gap: theme.spacing(1) }}>
            <Text variant="heading">{t('dataScreen.exportTitle')}</Text>
            <Text variant="body" tone="muted">
              {t('dataScreen.exportBody')}
            </Text>
          </View>
          <Button
            label={t('dataScreen.exportCsv')}
            variant="secondary"
            loading={busy === 'csv'}
            onPress={() => void runExport('csv')}
          />
          <Button
            label={t('dataScreen.exportJson')}
            variant="secondary"
            loading={busy === 'json'}
            onPress={() => void runExport('json')}
          />
        </Card>

        <Card style={{ gap: theme.spacing(3) }}>
          <View style={{ gap: theme.spacing(1) }}>
            <Text variant="heading">{t('dataScreen.exportTicketsTitle')}</Text>
            <Text variant="body" tone="muted">
              {t('dataScreen.exportTicketsBody')}
            </Text>
          </View>
          <Button
            label={t('dataScreen.exportTicketsCsv')}
            variant="secondary"
            loading={busy === 'tickets'}
            onPress={() => void runTicketExport()}
          />
        </Card>

        <Card style={{ gap: theme.spacing(3) }}>
          <View style={{ gap: theme.spacing(1) }}>
            <Text variant="heading">{t('dataScreen.deleteTitle')}</Text>
            <Text variant="body" tone="muted">
              {t('dataScreen.deleteBody')}
            </Text>
          </View>
          <Field
            label={t('dataScreen.confirmLabel', { word: CONFIRM_WORD })}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={CONFIRM_WORD}
          />
          <Button
            label={t('dataScreen.deleteAction')}
            variant="destructive"
            disabled={!canWipe}
            loading={deleting}
            haptic={false}
            onPress={confirmWipe}
          />
        </Card>
      </View>
    </Screen>
  );
}
