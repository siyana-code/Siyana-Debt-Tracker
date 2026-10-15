/** Buttons. Icon-first by default — text is optional and secondary. */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';
import { onPrimary } from '../../theme/colors';
import { minTouchSize, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({
  label,
  icon,
  trailingIcon,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth,
  onPress,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const palette = resolveVariant(theme, variant, Boolean(isDisabled));

  const height = size === 'lg' ? 54 : size === 'sm' ? minTouchSize - 6 : minTouchSize + 4;
  const iconSize = size === 'lg' ? 21 : size === 'sm' ? 16 : 19;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          paddingHorizontal: label ? spacing.xl : spacing.lg,
          borderRadius: theme.radius.md,
          backgroundColor: palette.background,
          borderColor: palette.border,
          opacity: pressed && !isDisabled ? 0.82 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.foreground} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={iconSize} color={palette.foreground} /> : null}
          {label ? (
            <Text
              numberOfLines={1}
              style={[
                size === 'sm' ? typography.captionSemiBold : typography.bodyMedium,
                { color: palette.foreground },
              ]}
            >
              {label}
            </Text>
          ) : null}
          {trailingIcon ? (
            <Ionicons name={trailingIcon} size={iconSize} color={palette.foreground} />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

function resolveVariant(
  theme: ReturnType<typeof useTheme>,
  variant: ButtonVariant,
  isDisabled: boolean,
): { background: string; foreground: string; border: string } {
  if (isDisabled) {
    return {
      background: theme.colors.disabled,
      foreground: theme.colors.disabledText,
      border: 'transparent',
    };
  }
  switch (variant) {
    case 'primary':
      return {
        background: theme.colors.primary,
        foreground: theme.colors.textOnPrimary,
        border: 'transparent',
      };
    case 'secondary':
      return {
        background: theme.colors.primaryContainer,
        foreground: theme.colors.textOnPrimaryContainer,
        border: 'transparent',
      };
    case 'ghost':
      return {
        background: 'transparent',
        foreground: theme.colors.textSecondary,
        border: theme.colors.border,
      };
    case 'danger':
      return {
        background: 'transparent',
        foreground: theme.colors.textSecondary,
        border: theme.colors.borderStrong,
      };
    default:
      return { background: 'transparent', foreground: theme.colors.text, border: 'transparent' };
  }
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fullWidth: { alignSelf: 'stretch' },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { ...typography.micro, color: onPrimary, fontWeight: '700' },
});

/** Circular icon-only button used in headers and list rows. */
export function IconButton({
  icon,
  onPress,
  size = 40,
  tone = 'default',
  disabled,
  accessibilityLabel,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  tone?: 'default' | 'primary' | 'plain';
  disabled?: boolean;
  accessibilityLabel: string;
  badge?: number;
}) {
  const theme = useTheme();
  const color =
    tone === 'primary'
      ? theme.colors.primary
      : tone === 'plain'
        ? theme.colors.textSecondary
        : theme.colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor:
            tone === 'primary' ? theme.colors.primaryHover : 'transparent',
          opacity: pressed ? 0.6 : disabled ? 0.4 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={size * 0.52} color={color} />
      {badge && badge > 0 ? (
        <View
          style={[
            styles.badge,
            { backgroundColor: theme.colors.primary, borderColor: theme.colors.background },
          ]}
        >
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default Button;