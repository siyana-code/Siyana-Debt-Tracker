import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';
import { notifyDataChanged } from '../../hooks/useDebts';
import { getDebt, setDebtStatus, deleteDebt } from '../../db/repositories/debts';
import { listPayments, deletePayment } from '../../db/repositories/payments';
import { formatMoney, progress, remaining } from '../../domain/money';
import { CATEGORY_ICON, CATEGORY_LABEL, DEBT_STATE_META, DIRECTION_ICON, DIRECTION_PHRASE, debtState } from '../../domain/debt';
import { formatDate, formatRelativeDue, formatFriendlyDate } from '../../utils/date';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ProgressBar,
  Screen,
  SectionHeader,
  SkeletonList,
} from '../../components/ui';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { Debt, Payment, Person } from '../../types';

type Loaded = { debt: Debt; person: Person; payments: Payment[] };

export default function DebtDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [data, setData] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    const debt = await getDebt(id);
    if (!debt) {
      setLoading(false);
      return;
    }
    const payments = await listPayments(debt.id);
    setData({ debt, person: debt.person, payments });
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggleSettled = async () => {
    if (!data) return;
    const next = data.debt.status === 'settled' ? 'open' : 'settled';
    await setDebtStatus(data.debt.id, next);
    notifyDataChanged();
    await load();
  };

  const handleDelete = () => {
    if (!data) return;
    Alert.alert('Delete this debt?', 'Its payment history will be removed too.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDebt(data.debt.id);
          notifyDataChanged();
          router.replace('/debts');
        },
      },
    ]);
  };

  const handleDeletePayment = (payment: Payment) => {
    Alert.alert('Delete this payment?', formatMoney(payment.amount, payment.currency), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePayment(payment.id);
          notifyDataChanged();
          await load();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <SkeletonList count={4} />
      </View>
    );
  }

  if (!data) {
    return (
      <Screen>
        <EmptyState
          icon="alert-circle-outline"
          title="Debt not found"
          message="It may have been deleted."
          actionLabel="Back to list"
          actionIcon="arrow-back"
          onAction={() => router.replace('/debts')}
        />
      </Screen>
    );
  }

  const { debt, person, payments } = data;
  const state = debtState(debt);
  const meta = DEBT_STATE_META[state];
  const outstanding = remaining(debt.principal, debt.paid);
  const settled = state === 'settled';

  return (
    <Screen scroll footer={<Footer onSettle={handleToggleSettled} settled={settled} />}>
      <View style={styles.hero}>
        <Avatar id={person.id} name={person.name} size={58} />

        <Text style={[typography.title, { color: theme.colors.text, marginTop: spacing.md }]}>
          {person.name}
        </Text>

        <View style={styles.heroBadges}>
          <Badge
            label={DIRECTION_PHRASE[debt.direction]}
            icon={DIRECTION_ICON[debt.direction]}
            tone="primary"
          />
          <Badge label={meta.label} icon={meta.icon} tone={meta.tone === 'primary' ? 'primary' : meta.tone} />
        </View>

        <Text style={[styles.amount, { color: theme.colors.text }]}>
          {formatMoney(outstanding, debt.currency)}
        </Text>
        <Text style={[typography.caption, { color: theme.colors.textSecondary }]}>
          {settled ? 'Fully settled' : `of ${formatMoney(debt.principal, debt.currency)} remaining`}
        </Text>

        {!settled ? (
          <View style={styles.progressWrap}>
            <ProgressBar value={progress(debt.principal, debt.paid)} height={8} />
            <View style={styles.progressLabels}>
              <Text style={[typography.micro, { color: theme.colors.textSecondary }]}>
                {formatMoney(debt.paid, debt.currency)} paid
              </Text>
              <Text style={[typography.micro, { color: theme.colors.textSecondary }]}>
                {Math.round(progress(debt.principal, debt.paid) * 100)}%
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <SectionHeader title="Details" icon="information-circle-outline" />
      <Card padded={false}>
        <DetailRow icon={CATEGORY_ICON[debt.category]} label="Category" value={CATEGORY_LABEL[debt.category]} />
        <DetailRow icon="calendar-outline" label="Issued" value={formatDate(debt.issuedAt)} />
        <DetailRow
          icon="time-outline"
          label="Due"
          value={debt.dueAt ? formatRelativeDue(debt.dueAt) : 'No due date'}
          iconColor={state === 'overdue' ? theme.colors.textSecondary : undefined}
          strong={state === 'overdue'}
        />
        {debt.interestRate ? (
          <DetailRow icon="trending-up-outline" label="Interest" value={`${debt.interestRate}%`} />
        ) : null}
        {debt.note ? <DetailRow icon="document-text-outline" label="Note" value={debt.note} /> : null}
      </Card>

      <SectionHeader
        title={`Payments (${payments.length})`}
        icon="cash-outline"
        action="Add"
        onActionPress={() => router.push(`/payment/new?debtId=${debt.id}`)}
      />

      {payments.length === 0 ? (
        <Card>
          <EmptyState
            compact
            icon="receipt-outline"
            title="No payments yet"
            message="Record a payment to track progress."
            actionLabel="Record payment"
            actionIcon="add"
            onAction={() => router.push(`/payment/new?debtId=${debt.id}`)}
          />
        </Card>
      ) : (
        <Card padded={false}>
          {payments.map((payment, index) => (
            <Pressable
              key={payment.id}
              accessibilityRole="button"
              accessibilityLabel={`Delete payment of ${formatMoney(payment.amount, payment.currency)}`}
              onLongPress={() => handleDeletePayment(payment)}
              style={({ pressed }) => [
                styles.paymentRow,
                {
                  borderBottomWidth: index === payments.length - 1 ? 0 : 1,
                  borderBottomColor: theme.colors.divider,
                  backgroundColor: pressed ? theme.colors.primaryHover : 'transparent',
                },
              ]}
            >
              <View style={[styles.paymentIcon, { backgroundColor: theme.colors.primaryHover }]}>
                <Ionicons name="arrow-down" size={14} color={theme.colors.primary} />
              </View>
              <View style={styles.paymentBody}>
                <Text style={[typography.bodyMedium, { color: theme.colors.text }]}>
                  {formatMoney(payment.amount, payment.currency)}
                </Text>
                <Text style={[typography.caption, { color: theme.colors.textSecondary }]}>
                  {formatFriendlyDate(payment.paidAt)} · {payment.method}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete payment"
                hitSlop={8}
                onPress={() => handleDeletePayment(payment)}
              >
                <Ionicons name="trash-outline" size={17} color={theme.colors.textDisabled} />
              </Pressable>
            </Pressable>
          ))}
        </Card>
      )}

      <SectionHeader title="Danger zone" icon="warning-outline" />
      <Card>
        <Button
          label="Delete debt"
          icon="trash-outline"
          variant="danger"
          fullWidth
          onPress={handleDelete}
        />
      </Card>

      <View style={{ height: spacing.xxl }} />
    </Screen>
  );
}

function Footer({ onSettle, settled }: { onSettle: () => void; settled: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.footer,
        { borderTopColor: theme.colors.divider, backgroundColor: theme.colors.surface },
      ]}
    >
      <Button
        label={settled ? 'Reopen debt' : 'Mark as settled'}
        icon={settled ? 'refresh-outline' : 'checkmark-done'}
        variant={settled ? 'secondary' : 'primary'}
        size="lg"
        fullWidth
        onPress={onSettle}
      />
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  iconColor,
  strong,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  iconColor?: string;
  strong?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={17} color={iconColor ?? theme.colors.textSecondary} />
      <Text style={[typography.body, { color: theme.colors.textSecondary, width: 96 }]}>{label}</Text>
      <Text
        numberOfLines={2}
        style={[
          typography.bodyMedium,
          { color: strong ? theme.colors.text : theme.colors.text, flex: 1, textAlign: 'right' },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { alignItems: 'center', paddingTop: spacing.lg },
  heroBadges: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  amount: { ...typography.display, marginTop: spacing.lg },
  progressWrap: { width: '100%', marginTop: spacing.lg },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 50,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 60,
  },
  paymentIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  paymentBody: { flex: 1, minWidth: 0 },
  footer: { padding: spacing.lg, borderTopWidth: 1 },
});