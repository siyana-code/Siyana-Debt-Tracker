/** Search field with a live-clear affordance. */

import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';
import { minTouchSize, radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { IconButton } from './Button';

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search',
  autoFocus,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textDisabled}
        selectionColor={theme.colors.primary}
        autoCorrect={false}
        autoCapitalize="none"
        autoFocus={autoFocus}
        returnKeyType="search"
        style={[styles.input, { color: theme.colors.text }]}
        accessibilityLabel={placeholder}
      />
      {value.length > 0 ? (
        <IconButton icon="close-circle" size={24} tone="plain" accessibilityLabel="Clear search" onPress={() => onChange('')} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    minHeight: minTouchSize,
  },
  input: { flex: 1, ...typography.body, paddingVertical: spacing.sm },
});

export default SearchBar;