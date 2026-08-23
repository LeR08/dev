import React from 'react';
import { TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export type FieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  /** Unit or currency shown inside the field, e.g. "cl" or "€". */
  suffix?: string;
  prefix?: string;
  containerStyle?: ViewStyle;
};

export function Field({ label, hint, suffix, prefix, containerStyle, style, ...rest }: FieldProps) {
  const theme = useTheme();

  return (
    <View style={[{ gap: theme.spacing(1.5) }, containerStyle]}>
      {label ? (
        <Text variant="caption" tone="muted" overline>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing(2),
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: theme.spacing(3.5),
        }}
      >
        {prefix ? (
          <Text variant="body" tone="muted">
            {prefix}
          </Text>
        ) : null}
        <TextInput
          placeholderTextColor={theme.colors.textFaint}
          style={[
            {
              flex: 1,
              paddingVertical: theme.spacing(3.5),
              color: theme.colors.text,
              fontSize: theme.type.body.fontSize,
              // Web focus rings are handled by the container border.
              ...(({ outlineStyle: 'none' } as unknown) as object),
            },
            style,
          ]}
          {...rest}
        />
        {suffix ? (
          <Text variant="label" tone="muted">
            {suffix}
          </Text>
        ) : null}
      </View>
      {hint ? (
        <Text variant="caption" tone="faint">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
