import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';
import { useDashboard } from '../../hooks/useDebts';
import { formatMoney } from '../../domain/money';
import {
  CATEGORY_ICON,
  DEBT_STATE_META,
  DIRECTION_ICON,
  debtState,
} from '../../domain/debt';
import { formatRelativeDue } from '../../utils/date';
import { Badge, Card, IconButton, SectionHeader, SkeletonList, StatTile } from '../../components/ui';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { summary, overdue, dueSoon, recent, loading } = useDashboard();

  const currency = summary.currency;

  const netLabel = useMemo(() => {
    const sign = summary.net > 0 ? '+' : summary.net < 0 ? '-' : '';
    return formatMoney(Math.abs(summary.net), currency, { showSign: false });
  }, [summary.net, currency]);

  const netPositive = summary.net >= 0;

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <SkeletonList count={5} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[typography.label, { color: theme.colors.textSecondary }]}>NET BALANCE</Text>
          <View style={styles.netRow}>
            <Ionicons
              name={netPositive ? 'trending-up' : 'trending-down'}
              size={26}
              color={netPositive ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text style={[typography.title, { color: theme.colors.text, marginLeft: spacing.sm }]}>
              {netLabel}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <IconButton
            icon="search"
            accessibilityLabel="Search debts"
            tone="primary"
            onPress={() => router.push('/debts')}
          />
          <IconButton
            icon="add"
            accessibilityLabel="Add a new debt"
            tone="primary"
            onPress={() => router.push('/debt/new')}
          />
        </View>
      </View>

      <View style={styles.statRow}>
        <StatTile
          icon={DIRECTION_ICON.lent}
          label="Lent out"
          value={formatMoney(summary.lentTotal, currency, { compact: true })}
          caption={`${summary.openCount} open`}
          tone="primary"
        />
        <View style={{ width: spacing.sm }} />
        <StatTile
          icon={DIRECTION_ICON.borrowed}
          label="Borrowed"
          value={formatMoney(summary.borrowedTotal, currency, { compact: true })}
          tone="muted"
        />
      </View>

      <View style={[styles.statRow, { marginTop: spacing.sm }]}>
        <StatTile
          icon="alert-circle"
          label="Overdue"
          value={String(summary.overdueCount)}
          caption={summary.overdueCount > 0 ? formatMoney(summary.overdueTotal, currency, { compact: true }) : 'All clear'}
          tone={summary.overdueCount > 0 ? 'overdue' : 'muted'}
        />
        <View style={{ width: spacing.sm }} />
        <StatTile
          icon="checkmark-done"
          label="Settled"
          value={String(summary.settledCount)}
          caption="All time"
          tone="muted"
        />
      </View>

      {overdue.length > 0 ? (
        <>
          <SectionHeader title="Overdue" icon="alert-circle" />
          <Card padded={false} style={styles.stack}>
            {overdue.map((debt, index) => (
              <AlertRow
                key={debt.id}
                name={debt.person.name}
                amount={formatMoney(debt.principal - debt.paid, debt.currency)}
                due={formatRelativeDue(debt.dueAt)}
                overdue
                last={index === overdue.length - 1}
                onPress={() => router.push(`/debt/${debt.id}`)}
              />
            ))}
          </Card>
        </>
      ) : null}

      {dueSoon.length > 0 ? (
        <>
          <SectionHeader
            title="Due soon"
            icon="time"
            action="See all"
            onActionPress={() => router.push('/debts')}
          />
          <Card padded={false} style={styles.stack}>
            {dueSoon.map((debt, index) => (
              <AlertRow
                key={debt.id}
                name={debt.person.name}
                amount={formatMoney(debt.principal - debt.paid, debt.currency)}
                due={formatRelativeDue(debt.dueAt)}
                last={index === dueSoon.length - 1}
                onPress={() => router.push(`/debt/${debt.id}`)}
              />
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeader
        title="Recent"
        icon="time-outline"
        action="See all"
        onActionPress={() => router.push('/debts')}
      />

      {recent.length === 0 ? (
        <Pressable onPress={() => router.push('/debt/new')}>
          <Card style={styles.emptyCard}>
            <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
            <Text style={[typography.bodyMedium, { color: theme.colors.text, marginTop: spacing.sm }]}>
              Record your first debt
            </Text>
          </Card>
        </Pressable>
      ) : (
        <Card padded={false} style={styles.stack}>
          {recent.map((debt, index) => {
            const state = debtState(debt);
            const meta = DEBT_STATE_META[state];
            const outstanding = debt.principal - debt.paid;
            return (
              <Pressable
                key={debt.id}
                accessibilityRole="button"
                accessibilityLabel={`${debt.person.name}, ${meta.label}`}
                onPress={() => router.push(`/debt/${debt.id}`)}
                style={({ pressed }) => [
                  styles.alertRow,
                  {
                    borderBottomWidth: index === recent.length - 1 ? 0 : 1,
                    borderBottomColor: theme.colors.divider,
                    backgroundColor: pressed ? theme.colors.primaryHover : 'transparent',
                  },
                ]}
              >
                <View
                  style={[
                    styles.alertIcon,
                    {
                      backgroundColor: theme.colors.primaryHover,
                    },
                  ]}
                >
                  <Ionicons
                    name={DIRECTION_ICON[debt.direction]}
                    size={16}
                    color={theme.colors.primary}
                  />
                </View>

                <View style={styles.alertBody}>
                  <Text numberOfLines={1} style={[typography.bodyMedium, { color: theme.colors.text }]}>
                    {debt.person.name}
                  </Text>
                  <Text style={[typography.caption, { color: theme.colors.textSecondary }]}>
                    {formatMoney(outstanding, debt.currency)}
                  </Text>
                </View>

                <Badge
                  label={meta.label}
                  icon={meta.icon}
                  tone={meta.tone === 'primary' ? 'primary' : meta.tone}
                />
              </Pressable>
            );
          })}
        </Card>
      )}

      <View style={{ height: spacing.xxl }} />
    </View>
  );
}

function AlertRow({
  name,
  amount,
  due,
  overdue,
  last,
  onPress,
}: {
  name: string;
  amount: string;
  due: string;
  overdue?: boolean;
  last: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${amount}, ${due}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.alertRow,
        {
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: theme.colors.divider,
          backgroundColor: pressed ? theme.colors.primaryHover : 'transparent',
        },
      ]}
    >
      <View
        style={[
          styles.alertIcon,
          { backgroundColor: overdue ? theme.colors.surfaceMuted : theme.colors.primaryHover },
        ]}
      >
        <Ionicons
          name={overdue ? 'alert' : 'time'}
          size={16}
          color={overdue ? theme.colors.textSecondary : theme.colors.primary}
        />
      </View>

      <View style={styles.alertBody}>
        <Text numberOfLines={1} style={[typography.bodyMedium, { color: theme.colors.text }]}>
          {name}
        </Text>
        <Text numberOfLines={1} style={[typography.caption, { color: theme.colors.textSecondary }]}>
          {amount}
        </Text>
      </View>

      <Text
        style={[
          typography.caption,
          { color: overdue ? theme.colors.text : theme.colors.textSecondary },
        ]}
      >
        {due}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  netRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  headerActions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  statRow: { flexDirection: 'row' },
  stack: { overflow: 'hidden' },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 60,
  },
  alertIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  alertBody: { flex: 1, minWidth: 0 },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xxl },
});