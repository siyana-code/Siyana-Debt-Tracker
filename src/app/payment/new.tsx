import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/ThemeProvider';
import { useSettings, notifyDataChanged } from '../../hooks/useDebts';
import { getDebt } from '../../db/repositories/debts';
import { recordPayment } from '../../db/repositories/payments';
import { formatMoney, minorToInput, parseAmount, remaining } from '../../domain/money';
import { todayISO } from '../../utils/date';
import { Button } from '../../components/ui';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { Debt, Person, SettlementMethod } from '../../types';

const METHODS: Array<{ key: SettlementMethod; icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { key: 'cash', icon: 'cash-outline', label: 'Cash' },
  { key: 'bank', icon: 'business-outline', label: 'Bank' },
  { key: 'card', icon: 'card-outline', label: 'Card' },
  { key: 'cheque', icon: 'document-text-outline', label: 'Cheque' },
  { key: 'other', icon: 'ellipsis-horizontal', label: 'Other' },
];

export default function RecordPaymentScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ debtId?: string }>();
  const { settings } = useSettings();

  const [debt, setDebt] = useState<(Debt & { person: Person }) | null>(null);
  const [amountText, setAmountText] = useState('');
  const [method, setMethod] = useState<SettlementMethod>(settings?.defaultMethod ?? 'cash');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) setMethod(settings.defaultMethod);
  }, [settings]);

  useEffect(() => {
    if (params.debtId) void getDebt(params.debtId).then(setDebt);
  }, [params.debtId]);

  const amount = useMemo(
    () => (debt ? parseAmount(amountText, debt.currency) : null),
    [amountText, debt],
  );

  const outstanding = debt ? remaining(debt.principal, debt.paid) : 0;
  const canSave = amount !== null && amount > 0 && debt !== null && !saving;

  const handleSave = async () => {
    if (!debt || amount === null || amount <= 0) return;
    setSaving(true);
    setError(null);
    try {
      await recordPayment({
        debtId: debt.id,
        amount,
        currency: debt.currency,
        method,
        note: note.trim() || null,
        paidAt: todayISO(),
      });
      notifyDataChanged();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record the payment');
      setSaving(false);
    }
  };

  if (!debt) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <Text style={[typography.subheading, { color: theme.colors.text }]}>Record payment</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={10}
      >
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </Pressable>
          <Text style={[typography.subheading, { color: theme.colors.text }]}>Payment</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.context}>
            <Text style={[typography.bodyMedium, { color: theme.colors.text }]}>{debt.person.name}</Text>
            <Text style={[typography.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}>
              {formatMoney(outstanding, debt.currency)} outstanding
            </Text>
          </View>

          <View
            style={[
              styles.amountBox,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg },
            ]}
          >
            <Text style={[typography.title, { color: theme.colors.textSecondary }]}>{debt.currency}</Text>
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textDisabled}
              keyboardType="decimal-pad"
              selectionColor={theme.colors.primary}
              autoFocus
              style={[typography.title, { flex: 1, color: theme.colors.text, textAlign: 'right', paddingVertical: spacing.md }]}
            />
          </View>

          <View style={styles.quickRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pay the full outstanding amount"
              onPress={() => setAmountText(minorToInput(outstanding, debt.currency))}
              style={({ pressed }) => [
                styles.quickChip,
                { backgroundColor: theme.colors.primaryHover, borderRadius: theme.radius.pill, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="flash" size={13} color={theme.colors.primary} />
              <Text style={[typography.captionSemiBold, { color: theme.colors.primary, marginLeft: 4 }]}>
                Pay all
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pay half the outstanding amount"
              onPress={() => setAmountText(minorToInput(Math.floor(outstanding / 2), debt.currency))}
              style={({ pressed }) => [
                styles.quickChip,
                { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.pill, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[typography.captionSemiBold, { color: theme.colors.textSecondary }]}>Half</Text>
            </Pressable>
          </View>

          <Text
            style={[typography.label, { color: theme.colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.sm }]}
          >
            METHOD
          </Text>
          <View style={styles.methodRow}>
            {METHODS.map((m) => {
              const active = method === m.key;
              return (
                <Pressable
                  key={m.key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={m.label}
                  onPress={() => setMethod(m.key)}
                  style={({ pressed }) => [
                    styles.methodChip,
                    {
                      backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                      borderRadius: theme.radius.pill,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Ionicons name={m.icon} size={14} color={active ? theme.colors.textOnPrimary : theme.colors.textSecondary} />
                  <Text
                    style={[
                      typography.captionSemiBold,
                      { color: active ? theme.colors.textOnPrimary : theme.colors.textSecondary, marginLeft: 5 },
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: spacing.xl }}>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Note (optional)"
              placeholderTextColor={theme.colors.textDisabled}
              selectionColor={theme.colors.primary}
              style={[
                typography.body,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  borderRadius: theme.radius.md,
                  color: theme.colors.text,
                  padding: spacing.md,
                  minHeight: 48,
                },
              ]}
            />
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.md }]}>
              <Ionicons name="alert-circle" size={16} color={theme.colors.textSecondary} />
              <Text style={[typography.caption, { color: theme.colors.textSecondary, marginLeft: spacing.sm, flex: 1 }]}>
                {error}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.divider, backgroundColor: theme.colors.surface }]}>
          <Button
            label="Record payment"
            icon="checkmark"
            size="lg"
            fullWidth
            loading={saving}
            disabled={!canSave}
            onPress={handleSave}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  context: { marginBottom: spacing.lg },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
  },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  methodRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
  },
  errorBox: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginTop: spacing.lg },
  footer: { padding: spacing.lg, borderTopWidth: 1 },
});