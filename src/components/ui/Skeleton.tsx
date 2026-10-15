/** Loading placeholder blocks — keeps layout stable while queries resolve. */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/spacing';

function SkeletonRow() {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.row,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: pulse },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceMuted }]} />
      <View style={styles.body}>
        <View style={[styles.bar, { width: '55%', backgroundColor: theme.colors.surfaceMuted }]} />
        <View style={[styles.bar, { width: '35%', height: 10, backgroundColor: theme.colors.surfaceMuted }]} />
      </View>
      <View style={[styles.bar, { width: 54, height: 14, backgroundColor: theme.colors.surfaceMuted }]} />
    </Animated.View>
  );
}

export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, paddingVertical: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    minHeight: 62,
  },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  body: { flex: 1, gap: spacing.sm },
  bar: { height: 14, borderRadius: 7 },
});

export default SkeletonList;