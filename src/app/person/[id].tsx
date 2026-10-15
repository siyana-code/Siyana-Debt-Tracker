import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';
import { notifyDataChanged, useSettings } from '../../hooks/useDebts';
import { getPerson, setArchived, deletePerson } from '../../db/repositories/people';
import { listDebts } from '../../db/repositories/debts';
import { formatMoney, remaining } from '../../domain/money';
import { debtState, sortDebts } from '../../domain/debt';
import { Badge, Card, EmptyState, Screen, SectionHeader, SkeletonList } from '../../components/ui';
import { DebtCard } from '../(tabs)/debts';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { Debt, Person } from '../../types';

export default function PersonDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings } = useSettings();

  const [person, setPerson] = useState<Person | null>(null);
  const [debts, setDebts] = useState<Array<Debt & { person: Person }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    const [p, rows] = await Promise.all([getPerson(id), listDebts({ personId: id })]);
    setPerson(p);
    setDebts(sortDebts(rows));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleArchive = async () => {
    if (!person) return;
    await setArchived(person.id, !person.archived);
    notifyDataChanged();
    await load();
  };

  const handleDelete = () => {
    if (!person) return;
    Alert.alert(
      'Delete this person?',
      'This also deletes every debt and payment linked to them.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deletePerson(person.id);
            if (!result.deleted) {
              Alert.alert(
                'Cannot delete yet',
                `${result.openDebts} open debt${result.openDebts === 1 ? '' : 's'} still outstanding. Settle or delete them first.`,
              );
              return;
            }
            notifyDataChanged();
            router.replace('/people');
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <SkeletonList count={4} />
      </View>
    );
  }

  if (!person) {
    return (
      <Screen>
        <EmptyState
          icon="person-outline"
          title="Person not found"
          message="It may have been deleted."
          actionLabel="Back"
          actionIcon="arrow-back"
          onAction={() => router.replace('/people')}
        />
      </Screen>
    );
  }

  const openDebts = debts.filter((d) => debtState(d) !== 'settled');
  const outstanding = openDebts.reduce((sum, d) => sum + remaining(d.principal, d.paid), 0);

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <Text style={[typography.title, { color: theme.colors.text, textAlign: 'center' }]}>
          {person.name}
        </Text>
        {person.location ? (
          <View style={styles.subRow}>
            <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={[typography.caption, { color: theme.colors.textSecondary, marginLeft: 4 }]}>
              {person.location}
            </Text>
          </View>
        ) : null}
        {person.phone ? (
          <View style={styles.subRow}>
            <Ionicons name="call-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={[typography.caption, { color: theme.colors.textSecondary, marginLeft: 4 }]}>
              {person.phone}
            </Text>
          </View>
        ) : null}
        {person.email ? (
          <View style={styles.subRow}>
            <Ionicons name="mail-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={[typography.caption, { color: theme.colors.textSecondary, marginLeft: 4 }]}>
              {person.email}
            </Text>
          </View>
        ) : null}

        <View style={styles.badgeRow}>
          {person.archived ? <Badge label="Archived" icon="archive-outline" tone="muted" /> : null}
          <Badge
            label={`${openDebts.length} open`}
            icon="swap-horizontal-outline"
            tone={openDebts.length > 0 ? 'primary' : 'muted'}
          />
          {outstanding > 0 ? (
            <Badge
              label={formatMoney(outstanding, settings?.currency ?? 'LKR')}
              icon="cash-outline"
              tone="primary"
            />
          ) : null}
        </View>
      </View>

      <SectionHeader
        title={`Debts (${debts.length})`}
        icon="swap-horizontal-outline"
        action="Add"
        onActionPress={() => router.push(`/debt/new?personId=${person.id}`)}
      />

      {debts.length === 0 ? (
        <Card>
          <EmptyState
            compact
            icon="receipt-outline"
            title="No debts recorded"
            message={`Nothing lent or borrowed with ${person.name} yet.`}
            actionLabel="Add debt"
            actionIcon="add"
            onAction={() => router.push(`/debt/new?personId=${person.id}`)}
          />
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {debts.map((debt) => (
            <DebtCard key={debt.id} debt={debt} showPerson={false} />
          ))}
        </View>
      )}

      <SectionHeader title="Manage" icon="options-outline" />
      <Card padded={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={person.archived ? 'Unarchive person' : 'Archive person'}
          onPress={handleArchive}
          style={({ pressed }) => [styles.actionRow, { backgroundColor: pressed ? theme.colors.primaryHover : 'transparent' }]}
        >
          <Ionicons
            name={person.archived ? 'refresh-outline' : 'archive-outline'}
            size={18}
            color={theme.colors.textSecondary}
          />
          <Text style={[typography.body, { color: theme.colors.text, marginLeft: spacing.md, flex: 1 }]}>
            {person.archived ? 'Unarchive' : 'Archive'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete person"
          onPress={handleDelete}
          style={({ pressed }) => [styles.actionRow, { backgroundColor: pressed ? theme.colors.primaryHover : 'transparent' }]}
        >
          <Ionicons name="trash-outline" size={18} color={theme.colors.textSecondary} />
          <Text style={[typography.body, { color: theme.colors.text, marginLeft: spacing.md, flex: 1 }]}>
            Delete person
          </Text>
        </Pressable>
      </Card>

      <View style={{ height: spacing.huge }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.sm },
  subRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
});