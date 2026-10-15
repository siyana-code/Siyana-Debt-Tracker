/** Bottom sheet — used for direction pickers, date pickers and confirmations. */

import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export function Sheet({
  visible,
  onClose,
  title,
  icon,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        accessibilityLabel="Close"
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
        onPress={onClose}
      />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.surface,
            paddingBottom: insets.bottom + spacing.xl,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: theme.colors.borderStrong }]} />

        <View style={styles.header}>
          {icon ? (
            <Ionicons name={icon} size={17} color={theme.colors.primary} />
          ) : null}
          <Text style={[typography.subheading, { color: theme.colors.text, flex: 1 }]}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        {children}
      </View>
    </Modal>
  );
}

/** Large tappable option row inside a Sheet. */
export function SheetOption({
  icon,
  label,
  description,
  selected,
  onPress,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected ? theme.colors.primaryHover : pressed ? theme.colors.surfaceMuted : 'transparent',
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderRadius: radius.md,
        },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={20} color={selected ? theme.colors.primary : theme.colors.textSecondary} />
      ) : null}
      <View style={styles.optionBody}>
        <Text style={[typography.bodyMedium, { color: theme.colors.text }]}>{label}</Text>
        {description ? (
          <Text style={[typography.caption, { color: theme.colors.textSecondary }]}>{description}</Text>
        ) : null}
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    minHeight: 56,
  },
  optionBody: { flex: 1 },
});

export default Sheet;