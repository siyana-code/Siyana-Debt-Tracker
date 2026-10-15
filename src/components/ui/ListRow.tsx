/** Icon-driven list row used by debts, people and payments. */

import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Avatar } from './Avatar';

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  accessibilityLabel,
  showChevron = true,
  style,
}: {
  title: string;
  subtitle?: string | null;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  showChevron?: boolean;
  style?: object;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed && onPress ? theme.colors.primaryHover : theme.colors.surface,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      {leading}

      <View style={styles.body}>
        <Text numberOfLines={1} style={[typography.bodyMedium, { color: theme.colors.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[typography.caption, { color: theme.colors.textSecondary, marginTop: 1 }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailing}

      {onPress && showChevron ? (
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textDisabled} />
      ) : null}
    </Pressable>
  );
}

/** Avatar + name + amount row — the primary debt/people list presentation. */
export function PersonRow({
  personId,
  name,
  subtitle,
  amount,
  directionIcon,
  directionTint,
  onPress,
  archived,
}: {
  personId: string;
  name: string;
  subtitle?: string | null;
  amount?: string;
  directionIcon?: keyof typeof Ionicons.glyphMap;
  directionTint?: string;
  onPress?: () => void;
  archived?: boolean;
}) {
  const theme = useTheme();

  return (
    <ListRow
      onPress={onPress}
      accessibilityLabel={`${name}${amount ? `, ${amount}` : ''}`}
      title={name}
      subtitle={subtitle}
      leading={
        <View>
          <Avatar id={personId} name={name} size={42} archived={archived} />
          {directionIcon ? (
            <View
              style={[
                styles.directionDot,
                {
                  backgroundColor: directionTint ?? theme.colors.surface,
                  borderColor: theme.colors.background,
                },
              ]}
            >
              <Ionicons
                name={directionIcon}
                size={10}
                color={theme.colors.textOnPrimary}
              />
            </View>
          ) : null}
        </View>
      }
      trailing={
        amount ? (
          <Text style={[typography.bodyMedium, { color: theme.colors.text }]}>{amount}</Text>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 62,
  },
  body: { flex: 1, minWidth: 0 },
  directionDot: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ListRow;