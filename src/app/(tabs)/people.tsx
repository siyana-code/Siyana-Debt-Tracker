import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';
import { formatMoney } from '../../domain/money';
import { listPeople, peopleWithBalances } from '../../db/repositories/people';
import { subscribe } from '../../hooks/useDebts';
import { loadSettings } from '../../db';
import {
  Avatar,
  Card,
  EmptyState,
  SearchBar,
  SkeletonList,
} from '../../components/ui';
import { spacing } from '../../theme/spacing';
import { elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { Person } from '../../types';

type Row = Person & { openDebts: number; outstanding: number };

export default function PeopleScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [currency, setCurrency] = useState('LKR');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [balances, settings] = await Promise.all([peopleWithBalances(), loadSettings()]);
      setCurrency(settings.currency);
      // peopleWithBalances already excludes archived; listPeople covers the
      // zero-balance remainder so nobody disappears from the list.
      const known = new Set(balances.map((b) => b.id));
      const rest = (await listPeople()).filter((p) => !known.has(p.id));
      setRows([
        ...balances,
        ...rest.map((p) => ({ ...p, openDebts: 0, outstanding: 0 })),
      ]);
      setLoading(false);
    };
    void load();
    return subscribe(() => void load());
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => !r.archived);
    if (!q) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.phone ?? '').toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.controls}>
        <SearchBar value={query} onChange={setQuery} placeholder="Search people" />
      </View>

      {loading ? (
        <SkeletonList count={5} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <EmptyState
              icon={query ? 'search-outline' : 'people-outline'}
              title={query ? 'No match' : 'No people yet'}
              message={
                query
                  ? 'Try a different name or number.'
                  : 'People are created for you when you record your first debt.'
              }
              actionLabel={query ? 'Clear' : 'Add person'}
              actionIcon={query ? 'close' : 'person-add-outline'}
              onAction={() => (query ? setQuery('') : router.push('/person/new'))}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.openDebts} open debts`}
              onPress={() => router.push(`/person/${item.id}`)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed ? theme.colors.primaryHover : theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.lg,
                },
              ]}
            >
              <Avatar id={item.id} name={item.name} size={46} />

              <View style={styles.body}>
                <Text numberOfLines={1} style={[typography.bodyMedium, { color: theme.colors.text }]}>
                  {item.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[typography.caption, { color: theme.colors.textSecondary, marginTop: 1 }]}
                >
                  {item.openDebts === 0
                    ? 'Settled'
                    : `${item.openDebts} open ${item.openDebts === 1 ? 'debt' : 'debts'}`}
                </Text>
              </View>

              {item.outstanding > 0 ? (
                <Text style={[typography.bodyMedium, { color: theme.colors.primary }]}>
                  {formatMoney(item.outstanding, currency)}
                </Text>
              ) : (
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.textDisabled} />
              )}

              <Ionicons name="chevron-forward" size={16} color={theme.colors.textDisabled} />
            </Pressable>
          )}
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a new person"
        onPress={() => router.push('/person/new')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Ionicons name="person-add" size={24} color={theme.colors.textOnPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  controls: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 96 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    minHeight: 68,
  },
  body: { flex: 1, minWidth: 0 },
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