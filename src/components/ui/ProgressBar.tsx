/** Progress bar for partial settlement, with an accessible value. */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { radius } from '../../theme/spacing';

export function ProgressBar({
  value,
  tone = 'primary',
  height = 6,
}: {
  /** 0..1 */
  value: number;
  tone?: 'primary' | 'success' | 'muted';
  height?: number;
}) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

  const fill =
    tone === 'muted' ? theme.colors.textSecondary : tone === 'success' ? theme.colors.primary : theme.colors.primary;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: theme.colors.surfaceSunken },
      ]}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: fill,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden', borderRadius: radius.pill },
});

export default ProgressBar;