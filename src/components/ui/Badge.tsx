/** Status pill. Colour is reinforced by an icon so it never relies on hue alone. */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';
import { status as statusColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export type BadgeTone = 'primary' | 'overdue' | 'partial' | 'muted' | 'neutral';

export function Badge({
  label,
  icon,
  tone = 'neutral',
  solid,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: BadgeTone;
  solid?: boolean;
}) {
  const theme = useTheme();

  const map: Record<BadgeTone, { fg: string; bg: string }> = {
    primary: { fg: theme.colors.primary, bg: theme.colors.primaryHover },
    overdue: { fg: statusColors.overdue, bg: statusColors.overdueSurface },
    partial: { fg: statusColors.partial, bg: statusColors.partialSurface },
    muted: { fg: theme.colors.textSecondary, bg: theme.colors.surfaceMuted },
    neutral: { fg: theme.colors.textSecondary, bg: theme.colors.surfaceMuted },
  };
  const { fg, bg } = map[tone];

  return (
    <View style={[styles.badge, { backgroundColor: solid ? fg : bg }]}>
      {icon ? (
        <Ionicons name={icon} size={11} color={solid ? theme.colors.textOnPrimary : fg} />
      ) : null}
      <Text
        numberOfLines={1}
        style={[
          typography.micro,
          { color: solid ? theme.colors.textOnPrimary : fg, fontWeight: '700', letterSpacing: 0.3 },
        ]}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
});