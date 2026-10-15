/**
 * Horizontal stat tile.
 *
 * Icon + value + short label. The label is deliberately terse — the screen
 * title carries the context.
 */

import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';
import { status as statusColors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export type StatTone = 'primary' | 'muted' | 'overdue' | 'inverse';

export function StatTile({
  icon,
  label,
  value,
  caption,
  tone = 'primary',
  style,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  caption?: string;
  tone?: StatTone;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const theme = useTheme();

  const inverse = tone === 'inverse';
  const accent =
    tone === 'overdue'
      ? statusColors.overdue
      : tone === 'muted'
        ? theme.colors.textSecondary
        : inverse
          ? theme.colors.textOnPrimary
          : theme.colors.primary;

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: inverse ? theme.colors.primary : theme.colors.surface,
          borderColor: inverse ? theme.colors.primary : theme.colors.border,
          borderRadius: radius.lg,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.iconChip,
          { backgroundColor: inverse ? theme.colors.tintBleuStrong : theme.colors.primaryHover },
        ]}
      >
        <Ionicons name={icon} size={15} color={accent} />
      </View>

      <Text
        numberOfLines={1}
        style={[
          typography.heading,
          {
            color: inverse ? theme.colors.textOnPrimary : theme.colors.text,
            marginTop: spacing.sm,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        numberOfLines={1}
        style={[
          typography.micro,
          {
            color: inverse ? theme.colors.tintWhite : theme.colors.textSecondary,
            fontWeight: '700',
            letterSpacing: 0.5,
            marginTop: 2,
            textTransform: 'uppercase',
          },
        ]}
      >
        {label}
      </Text>

      {caption ? (
        <Text
          numberOfLines={1}
          style={[
            typography.micro,
            { color: inverse ? theme.colors.tintWhite : theme.colors.textDisabled, marginTop: 2 },
          ]}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 96,
    borderWidth: 1,
    padding: spacing.md,
  },
  iconChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default StatTile;