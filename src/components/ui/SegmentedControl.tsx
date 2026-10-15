/**
 * Segmented control.
 *
 * Used for the small, high-frequency filters (All / Lent / Borrowed) where a
 * dropdown would be too heavy. Each segment may carry an icon instead of, or
 * alongside, a label.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export interface Segment<T extends string> {
  value: T;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  badge?: number;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  accessibilityLabel,
}: {
  segments: ReadonlyArray<Segment<T>>;
  value: T;
  onChange: (next: T) => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.track,
        { backgroundColor: theme.colors.surfaceSunken, borderRadius: radius.pill },
      ]}
    >
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={segment.label ?? segment.value}
            onPress={() => onChange(segment.value)}
            style={({ pressed }) => [
              styles.segment,
              {
                backgroundColor: active ? theme.colors.surface : 'transparent',
                borderRadius: radius.pill,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            {segment.icon ? (
              <Ionicons
                name={segment.icon}
                size={15}
                color={active ? theme.colors.primary : theme.colors.textSecondary}
              />
            ) : null}
            {segment.label ? (
              <Text
                numberOfLines={1}
                style={[
                  typography.captionSemiBold,
                  { color: active ? theme.colors.text : theme.colors.textSecondary },
                ]}
              >
                {segment.label}
              </Text>
            ) : null}
            {segment.badge !== undefined && segment.badge > 0 ? (
              <View style={[styles.count, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text style={[typography.micro, { color: theme.colors.textOnPrimaryContainer, fontWeight: '700' }]}>
                  {segment.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 3, gap: 2 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    minHeight: 36,
  },
  count: {
    minWidth: 18,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 9,
    alignItems: 'center',
  },
});

export default SegmentedControl;