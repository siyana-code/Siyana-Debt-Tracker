/** Text input with an icon slot, label, error and helper text. */

import React, { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';
import { minTouchSize, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  error?: string | null;
  helper?: string;
  containerStyle?: StyleProp<ViewStyle>;
  /** Merged into the inner input's style, after the defaults. */
  inputStyle?: StyleProp<TextStyle>;
}

export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, icon, trailingIcon, error, helper, containerStyle, inputStyle, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = React.useState(false);

  const borderColor = error
    ? theme.colors.borderStrong
    : focused
      ? theme.colors.primary
      : theme.colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      ) : null}

      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.colors.surface,
            borderColor,
            borderRadius: theme.radius.md,
          },
          focused && !error ? { backgroundColor: theme.colors.primaryHover } : null,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? theme.colors.primary : theme.colors.textSecondary}
            style={styles.leading}
          />
        ) : null}

        <TextInput
          ref={ref}
          placeholderTextColor={theme.colors.textDisabled}
          selectionColor={theme.colors.primary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            { color: theme.colors.text },
            rest.multiline ? styles.multiline : null,
            inputStyle,
          ]}
          {...rest}
        />

        {trailingIcon ? (
          <Ionicons name={trailingIcon} size={18} color={theme.colors.textSecondary} />
        ) : null}
      </View>

      {error ? (
        <View style={styles.messageRow}>
          <Ionicons name="alert-circle" size={13} color={theme.colors.textSecondary} />
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{error}</Text>
        </View>
      ) : helper ? (
        <View style={styles.messageRow}>
          <Text style={[styles.message, { color: theme.colors.textDisabled }]}>{helper}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  label: {
    ...typography.captionSemiBold,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    minHeight: minTouchSize + 4,
  },
  leading: { marginRight: spacing.sm },
  input: {
    flex: 1,
    ...typography.body,
    paddingVertical: spacing.md,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  message: { ...typography.caption },
});