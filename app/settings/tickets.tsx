import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { formatDateTime } from '@/domain/format';
import type { Ticket } from '@/domain/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function MyTicketsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { tickets, setTicketStatus } = useApp();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={tickets}
        keyExtractor={(ticket) => ticket.id}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing(5),
          paddingTop: theme.spacing(4),
          paddingBottom: theme.spacing(12),
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
        }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.colors.border }} />}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing(3), paddingBottom: theme.spacing(3) }}>
            <Text variant="body" tone="muted">
              {t('tickets.myTicketsIntro')}
            </Text>
            <Button label={t('tickets.reportTitle')} onPress={() => router.push('/settings/report')} />
          </View>
        }
        ListEmptyComponent={<EmptyState title={t('tickets.myTicketsEmpty')} glyph="✎" />}
        renderItem={({ item }) => (
          <TicketRow
            ticket={item}
            onToggleStatus={() =>
              setTicketStatus(item.id, item.status === 'open' ? 'closed' : 'open')
            }
          />
        )}
      />
    </View>
  );
}

function TicketRow({ ticket, onToggleStatus }: { ticket: Ticket; onToggleStatus: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const closed = ticket.status === 'closed';

  return (
    <View style={{ paddingVertical: theme.spacing(3), gap: theme.spacing(1.5) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) }}>
        <View
          style={{
            paddingVertical: 2,
            paddingHorizontal: theme.spacing(2),
            borderRadius: theme.radius.pill,
            backgroundColor: ticket.type === 'bug' ? theme.categoryColor('other') + '33' : theme.accent.soft,
          }}
        >
          <Text variant="caption" tone="muted">
            {ticket.type === 'bug' ? t('tickets.typeBug') : t('tickets.typeSuggestion')}
          </Text>
        </View>
        <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
          {ticket.title}
        </Text>
      </View>

      {ticket.description ? (
        <Text variant="caption" tone="muted" numberOfLines={2}>
          {ticket.description}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="caption" tone="faint">
          {formatDateTime(ticket.createdAt)} · {ticket.appVersion} · {ticket.platform}
        </Text>
        <Pressable accessibilityRole="button" onPress={onToggleStatus}>
          <Text variant="caption" tone={closed ? 'faint' : 'accent'}>
            {closed ? t('tickets.markOpen') : t('tickets.markClosed')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
