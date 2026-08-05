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
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

const CONFIRM_WORD = 'DELETE';

export default function DataScreen() {
  const theme = useTheme();
  const { entries, drinks, settings, profile, tickets, clearAllData } = useApp();
  const toast = useToast();

  const [busy, setBusy] = useState<'csv' | 'json' | 'tickets' | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const runExport = async (kind: 'csv' | 'json') => {
    if (entries.length === 0) {
      toast.show({ message: 'Nothing to export yet' });
      return;
    }
    setBusy(kind);
    try {
      const fileName = backupFileName(kind);
      const content =
        kind === 'csv'
          ? toCsv(entries, settings.currency)
          : toJson(buildBackup(entries, drinks, settings, profile, tickets));
      const result = await exportText(fileName, content, kind === 'csv' ? 'text/csv' : 'application/json');

      toast.show({
        message:
          result === 'downloaded'
            ? `${fileName} downloaded`
            : result === 'shared'
              ? 'Export ready'
              : 'Sharing is not available on this device',
      });
    } catch (error) {
      toast.show({ message: error instanceof Error ? error.message : 'Export failed' });
    } finally {
      setBusy(null);
    }
  };

  const runTicketExport = async () => {
    if (tickets.length === 0) {
      toast.show({ message: 'No tickets to export yet' });
      return;
    }
    setBusy('tickets');
    try {
      const fileName = ticketsFileName('csv');
      const result = await exportText(fileName, ticketsToCsv(tickets), 'text/csv');
      toast.show({
        message:
          result === 'downloaded'
            ? `${fileName} downloaded`
            : result === 'shared'
              ? 'Export ready'
              : 'Sharing is not available on this device',
      });
    } catch (error) {
      toast.show({ message: error instanceof Error ? error.message : 'Export failed' });
    } finally {
      setBusy(null);
    }
  };

  const wipe = async () => {
    setDeleting(true);
    try {
      await clearAllData();
      setConfirmText('');
      toast.show({ message: 'All data deleted' });
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
    Alert.alert(
      'Delete everything?',
      'Your entries, custom drinks and settings will be removed from this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete all', style: 'destructive', onPress: () => void wipe() },
      ]
    );
  };

  const canWipe = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  return (
    <Screen>
      <View style={{ gap: theme.spacing(4), paddingTop: theme.spacing(4) }}>
        <Card style={{ gap: theme.spacing(2) }}>
          <Text variant="heading">Where your data lives</Text>
          <Text variant="body" tone="muted">
            Everything is stored in a local database on this device. There is no account, no sync and
            no analytics. Nothing is sent anywhere unless you export it yourself.
          </Text>
          <Text variant="caption" tone="faint">
            {entries.length} entries · {drinks.filter((drink) => drink.isCustom).length} custom drinks
          </Text>
        </Card>

        <Card style={{ gap: theme.spacing(3) }}>
          <View style={{ gap: theme.spacing(1) }}>
            <Text variant="heading">Export a backup</Text>
            <Text variant="body" tone="muted">
              CSV opens in any spreadsheet. JSON keeps everything, including your custom drinks and
              settings.
            </Text>
          </View>
          <Button
            label="Export CSV"
            variant="secondary"
            loading={busy === 'csv'}
            onPress={() => void runExport('csv')}
          />
          <Button
            label="Export JSON"
            variant="secondary"
            loading={busy === 'json'}
            onPress={() => void runExport('json')}
          />
        </Card>

        <Card style={{ gap: theme.spacing(3) }}>
          <View style={{ gap: theme.spacing(1) }}>
            <Text variant="heading">Export tickets</Text>
            <Text variant="body" tone="muted">
              Bug reports and suggestions you logged from Settings → Report a problem. Nothing is
              sent anywhere automatically in this version — export is how you get them off the
              device.
            </Text>
          </View>
          <Button
            label="Export tickets CSV"
            variant="secondary"
            loading={busy === 'tickets'}
            onPress={() => void runTicketExport()}
          />
        </Card>

        <Card style={{ gap: theme.spacing(3) }}>
          <View style={{ gap: theme.spacing(1) }}>
            <Text variant="heading">Delete all my data</Text>
            <Text variant="body" tone="muted">
              Removes every entry, custom drink, your profile, tickets and settings from this
              device, and brings back onboarding. The built-in drink catalog is restored so the app
              still works afterwards.
            </Text>
          </View>
          <Field
            label={`Type ${CONFIRM_WORD} to confirm`}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={CONFIRM_WORD}
          />
          <Button
            label="Delete everything"
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
