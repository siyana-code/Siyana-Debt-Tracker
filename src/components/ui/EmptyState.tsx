/**
 * Empty state.
 *
 * Deliberately icon-led: a large glyph carries the message, with a short
 * supporting line and at most one action. No paragraphs.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Button } from './Button';

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  actionIcon,
  onAction,
  compact,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
  compact?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View
        style={[
          styles.iconRing,
          {
            backgroundColor: theme.colors.primaryHover,
            borderColor: theme.colors.primaryContainer,
          },
        ]}
      >
        <Ionicons name={icon} size={compact ? 28 : 40} color={theme.colors.primary} />
      </View>

      <Text style={[typography.subheading, { color: theme.colors.text, marginTop: spacing.lg }]}>
        {title}
      </Text>

      {message ? (
        <Text
          style={[
            typography.caption,
            { color: theme.colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, maxWidth: 280 },
          ]}
        >
          {message}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          icon={actionIcon}
          onPress={onAction}
          style={{ marginTop: spacing.xl }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
  },
  compact: { paddingVertical: spacing.xxl },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default EmptyState;