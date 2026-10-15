/** Screen scaffold: safe-area aware, themed background, consistent padding. */

import React, { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';

export function Screen({
  children,
  scroll = false,
  padded = true,
  refreshControl,
  footer,
  style,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const body = (
    <View
      style={[
        padded && styles.padded,
        { paddingBottom: insets.bottom + spacing.xxl },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  const inner = scroll ? (
    <ScrollView
      style={styles.flex}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      contentContainerStyle={styles.scrollContent}
    >
      {body}
    </ScrollView>
  ) : (
    body
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }, style]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {inner}
        {footer}
      </KeyboardAvoidingView>
    </View>
  );
}

/** Build a themed pull-to-refresh control to pass to Screen's `refreshControl`. */
export function useRefreshControl(onRefresh: () => void, refreshing: boolean) {
  const theme = useTheme();
  return React.useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={theme.colors.primary}
        colors={[theme.colors.primary]}
        progressBackgroundColor={theme.colors.surface}
      />
    ),
    [onRefresh, refreshing, theme.colors.primary, theme.colors.surface],
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});

export default Screen;