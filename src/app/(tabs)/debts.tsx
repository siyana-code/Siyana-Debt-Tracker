import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';
import { useDebts } from '../../hooks/useDebts';
import {
  CATEGORY_ICON,
  CATEGORY_LABEL,
  DEBT_STATE_META,
  DIRECTION_ICON,
  DIRECTION_LABEL,
  DIRECTION_PHRASE,
  debtState,
  filterDebts,
  sortDebts,
} from '../../domain/debt';
import { formatMoney, progress, remaining } from '../../domain/money';
import { formatRelativeDue } from '../../utils/date';
import {
  Badge,
  EmptyState,
  IconButton,
  ProgressBar,
  SearchBar,
  SegmentedControl,
  Sheet,
  SheetOption,
  SkeletonList,
  useRefreshControl,
} from '../../components/ui';
import { spacing } from '../../theme/spacing';
import { elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { DebtCategory, DebtDirection, DebtWithPerson } from '../../types';

type Scope = 'all' | 'open' | 'overdue' | 'settled';

export default function DebtsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { debts, loading, reload } = useDebts({ status: 'all' });
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState<DebtDirection | 'all'>('all');
  const [scope, setScope] = useState<Scope>('open');
  const [category, setCategory] = useState<DebtCategory | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const visible = useMemo(
    () =>
      sortDebts(
        filterDebts(debts, query, direction, category, scope === 'open' ? 'open' : scope),
      ),
    [debts, query, direction, category, scope],
  );

  const activeFilterCount = (category !== 'all' ? 1 : 0) + (direction !== 'all' ? 1 : 0);

  const refreshControl = useRefreshControl(reload, false);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.controls}>
        <View style={styles.searchRow}>
          <View style={styles.searchFlex}>
            <SearchBar value={query} onChange={setQuery} placeholder="Search name or note" />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Filters${activeFilterCount ? `, ${activeFilterCount} active` : ''}`}
            onPress={() => setShowFilters(true)}
            style={({ pressed }) => [
              styles.filterButton,
              {
                backgroundColor: activeFilterCount ? theme.colors.primaryHover : theme.colors.surface,
                borderColor: activeFilterCount ? theme.colors.primary : theme.colors.border,
                borderRadius: theme.radius.pill,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={activeFilterCount ? theme.colors.primary : theme.colors.textSecondary}
            />
            {activeFilterCount > 0 ? (
              <View style={[styles.filterDot, { backgroundColor: theme.colors.primary }]} />
            ) : null}
          </Pressable>
        </View>

        <SegmentedControl<Scope>
          accessibilityLabel="Debt scope"
          value={scope}
          onChange={setScope}
          segments={[
            { value: 'open', label: 'Open' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'settled', label: 'Settled' },
            { value: 'all', label: 'All' },
          ]}
        />

        {activeFilterCount > 0 ? (
          <View style={styles.chipRow}>
            {direction !== 'all' ? (
              <FilterChip label={DIRECTION_LABEL[direction]} onClear={() => setDirection('all')} />
            ) : null}
            {category !== 'all' ? (
              <FilterChip label={CATEGORY_LABEL[category]} onClear={() => setCategory('all')} />
            ) : null}
          </View>
        ) : null}
      </View>

      {loading ? (
        <SkeletonList count={6} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <EmptyState
              icon={query || activeFilterCount ? 'search-outline' : 'checkmark-circle-outline'}
              title={query || activeFilterCount ? 'Nothing matches' : 'No debts here'}
              message={
                query || activeFilterCount
                  ? 'Try clearing the search or filters.'
                  : 'Record money you lent or borrowed and it will show up here.'
              }
              actionLabel={query || activeFilterCount ? 'Clear filters' : 'Add debt'}
              actionIcon={query || activeFilterCount ? 'close' : 'add'}
              onAction={() => {
                if (query || activeFilterCount) {
                  setQuery('');
                  setDirection('all');
                  setCategory('all');
                  setScope('open');
                } else {
                  router.push('/debt/new');
                }
              }}
            />
          }
          renderItem={({ item }) => <DebtCard debt={item} />}
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a new debt"
        onPress={() => router.push('/debt/new')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Ionicons name="add" size={26} color={theme.colors.textOnPrimary} />
      </Pressable>

      <Sheet visible={showFilters} onClose={() => setShowFilters(false)} title="Filters" icon="options">
        <View style={styles.sheetBlock}>
          <Text style={[typography.label, { color: theme.colors.textSecondary, marginBottom: spacing.sm }]}>
            DIRECTION
          </Text>
          {(['all', 'lent', 'borrowed'] as const).map((key) => (
            <SheetOption
              key={key}
              icon={key === 'all' ? 'apps-outline' : DIRECTION_ICON[key]}
              label={key === 'all' ? 'All directions' : DIRECTION_LABEL[key]}
              description={key === 'all' ? undefined : DIRECTION_PHRASE[key]}
              selected={direction === key}
              onPress={() => setDirection(key)}
            />
          ))}
        </View>

        <View style={styles.sheetBlock}>
          <Text style={[typography.label, { color: theme.colors.textSecondary, marginBottom: spacing.sm }]}>
            CATEGORY
          </Text>
          <View style={styles.categoryGrid}>
            <SheetOption
              icon="apps-outline"
              label="All"
              selected={category === 'all'}
              onPress={() => setCategory('all')}
            />
            {(
              [
                'general', 'family', 'friend', 'work', 'travel', 'purchase', 'loan', 'other',
              ] as DebtCategory[]
            ).map((key) => (
              <SheetOption
                key={key}
                icon={CATEGORY_LABEL[key] ? undefined : 'pricetag-outline'}
                label={CATEGORY_LABEL[key]}
                selected={category === key}
                onPress={() => setCategory(key)}
              />
            ))}
          </View>
        </View>
      </Sheet>
    </View>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Remove ${label} filter`}
      onPress={onClear}
      style={[
        styles.chip,
        { backgroundColor: theme.colors.primaryHover, borderRadius: theme.radius.pill },
      ]}
    >
      <Text style={[typography.captionSemiBold, { color: theme.colors.primary }]}>{label}</Text>
      <Ionicons name="close" size={13} color={theme.colors.primary} />
    </Pressable>
  );
}

export function DebtCard({ debt, showPerson = true }: { debt: DebtWithPerson; showPerson?: boolean }) {
  const theme = useTheme();
  const router = useRouter();

  const state = debtState(debt);
  const meta = DEBT_STATE_META[state];
  const outstanding = remaining(debt.principal, debt.paid);
  const settled = state === 'settled';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${debt.person.name}, ${formatMoney(outstanding, debt.currency)}, ${meta.label}`}
      onPress={() => router.push(`/debt/${debt.id}`)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? theme.colors.primaryHover : theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.dirIcon, { backgroundColor: theme.colors.primaryHover }]}>
          <Ionicons
            name={DIRECTION_ICON[debt.direction]}
            size={16}
            color={theme.colors.primary}
          />
        </View>

        <View style={styles.cardBody}>
          <Text numberOfLines={1} style={[typography.bodyMedium, { color: theme.colors.text }]}>
            {showPerson ? debt.person.name : CATEGORY_LABEL[debt.category]}
          </Text>
          <Text
            numberOfLines={1}
            style={[typography.caption, { color: theme.colors.textSecondary, marginTop: 1 }]}
          >
            {settled ? 'Settled' : formatRelativeDue(debt.dueAt)}
          </Text>
        </View>

        <View style={styles.cardRight}>
          <Text style={[typography.bodyMedium, { color: theme.colors.text }]}>
            {formatMoney(outstanding, debt.currency)}
          </Text>
          <Text style={[typography.micro, { color: theme.colors.textDisabled, marginTop: 1 }]}>
            of {formatMoney(debt.principal, debt.currency, { showSymbol: false })}
          </Text>
        </View>
      </View>

      {!settled && debt.paid > 0 ? (
        <View style={styles.progressWrap}>
          <ProgressBar value={progress(debt.principal, debt.paid)} height={5} />
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <Badge label={meta.label} icon={meta.icon} tone={meta.tone === 'primary' ? 'primary' : meta.tone} />
        <View style={styles.footerIcons}>
          <Ionicons
            name={CATEGORY_ICON[debt.category]}
            size={14}
            color={theme.colors.textDisabled}
          />
          <Text style={[typography.micro, { color: theme.colors.textDisabled, marginLeft: 4 }]}>
            {CATEGORY_LABEL[debt.category]}
          </Text>
          <IconButton
            icon="chevron-forward"
            size={22}
            tone="plain"
            accessibilityLabel="Open debt"
            onPress={() => router.push(`/debt/${debt.id}`)}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  controls: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  searchFlex: { flex: 1 },
  filterButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 96 },
  card: { borderWidth: 1, padding: spacing.md, marginBottom: 0 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dirIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, minWidth: 0 },
  cardRight: { alignItems: 'flex-end' },
  progressWrap: { marginTop: spacing.md },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  footerIcons: { flexDirection: 'row', alignItems: 'center' },
  sheetBlock: { marginBottom: spacing.lg },
  categoryGrid: {},
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.fab,
  },
});