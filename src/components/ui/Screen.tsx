import React from 'react';
import {
  Platform,
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

export const CONTENT_MAX_WIDTH = 560;

export type ScreenProps = {
  children: React.ReactNode;
  /** Wraps content in a ScrollView. Off for screens with their own list. */
  scroll?: boolean;
  /** Extra bottom padding, e.g. to clear a floating action button. */
  bottomInset?: number;
  contentContainerStyle?: ViewStyle;
  scrollProps?: ScrollViewProps;
  style?: ViewStyle;
};

/**
 * Page shell: background, safe areas, and a max content width so the PWA on a
 * wide desktop window still reads as a single calm column.
 */
export function Screen({
  children,
  scroll = true,
  bottomInset = 0,
  contentContainerStyle,
  scrollProps,
  style,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const inner: ViewStyle = {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: theme.spacing(5),
  };

  if (!scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}>
        <View style={[{ flex: 1 }, inner, contentContainerStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}
      contentContainerStyle={[
        inner,
        {
          paddingTop: theme.spacing(2),
          paddingBottom: insets.bottom + theme.spacing(8) + bottomInset,
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={Platform.OS === 'web'}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  );
}
