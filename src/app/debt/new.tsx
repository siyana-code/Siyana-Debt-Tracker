import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/ThemeProvider';
import { useSettings, notifyDataChanged } from '../../hooks/useDebts';
import { listPeople, createPerson } from '../../db/repositories/people';
import { createDebt } from '../../db/repositories/debts';
import { parseAmount, minorToInput } from '../../domain/money';
import { DEBT_CATEGORIES, DIRECTION_ICON, DIRECTION_LABEL, DIRECTION_PHRASE } from '../../domain/debt';
import { todayISO, formatDate } from '../../utils/date';
import { success, tap } from '../../utils/haptics';
import { Button, Field, Sheet, SheetOption } from '../../components/ui';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { DebtCategory, DebtDirection, Person } from '../../types';

export default function NewDebtScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ personId?: string }>();
  const { settings } = useSettings();

  const currency = settings?.currency ?? 'LKR';

  const [direction, setDirection] = useState<DebtDirection>('lent');
  const [people, setPeople] = useState<Person[]>([]);
  const [personId, setPersonId] = useState<string | null>(params.personId ?? null);
  const [showPeople, setShowPeople] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');

  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<DebtCategory>('general');
  const [note, setNote] = useState('');
  const [issuedAt, setIssuedAt] = useState(todayISO());
  const [hasDueDate, setHasDueDate] = useState(false);
  const [dueAt, setDueAt] = useState(todayISO());

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    void listPeople().then(setPeople);
  }, []);

  const amount = useMemo(() => parseAmount(amountText, currency), [amountText, currency]);
  const selectedPerson = people.find((p) => p.id === personId) ?? null;

  const canSave = amount !== null && amount > 0 && personId !== null && !saving;

  async function handleCreatePerson(): Promise<void> {
    const name = newPersonName.trim();
    if (!name) return;
    const person = await createPerson({ name });
    setPeople((prev) => [...prev, person].sort((a, b) => a.name.localeCompare(b.name)));
    setPersonId(person.id);
    setNewPersonName('');
    setShowPeople(false);
  }

  async function handleSave(): Promise<void> {
    if (!canSave || amount === null) return;
    setSaving(true);
    setError(null);
    try {
      await createDebt({
        personId: personId!,
        direction,
        principal: amount,
        currency,
        category,
        note: note.trim() || null,
        issuedAt,
        dueAt: hasDueDate ? dueAt : null,
      });
      success();
      notifyDataChanged();
      router.replace('/debts');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the debt');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
        </Pressable>
        <Text style={[typography.subheading, { color: theme.colors.text }]}>New debt</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Direction — the single most important choice, so it is the biggest control. */}
        <View style={styles.directionRow}>
          <DirectionCard
            icon={DIRECTION_ICON.lent}
            title={DIRECTION_LABEL.lent}
            subtitle={DIRECTION_PHRASE.lent}
            active={direction === 'lent'}
            onPress={() => setDirection('lent')}
          />
          <View style={{ width: spacing.sm }} />
          <DirectionCard
            icon={DIRECTION_ICON.borrowed}
            title={DIRECTION_LABEL.borrowed}
            subtitle={DIRECTION_PHRASE.borrowed}
            active={direction === 'borrowed'}
            onPress={() => setDirection('borrowed')}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={selectedPerson ? `Person: ${selectedPerson.name}` : 'Choose person'}
          onPress={() => setShowPeople(true)}
          style={({ pressed }) => [
            styles.personPicker,
            {
              backgroundColor: theme.colors.surface,
              borderColor: personId ? theme.colors.primary : theme.colors.border,
              borderRadius: theme.radius.lg,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
          <View style={styles.personText}>
            <Text style={[typography.micro, { color: theme.colors.textSecondary, letterSpacing: 0.5 }]}>
              PERSON
            </Text>
            <Text
              style={[
                typography.bodyMedium,
                { color: selectedPerson ? theme.colors.text : theme.colors.textDisabled },
              ]}
            >
              {selectedPerson?.name ?? 'Choose someone'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textDisabled} />
        </Pressable>

        <Text style={[typography.label, { color: theme.colors.textSecondary, marginBottom: spacing.sm }]}>
          AMOUNT
        </Text>
        <View
          style={[
            styles.amountBox,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg },
          ]}
        >
          <Text style={[typography.title, { color: theme.colors.textSecondary }]}>{currency}</Text>
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            placeholder="0.00"
            placeholderTextColor={theme.colors.textDisabled}
            keyboardType="decimal-pad"
            selectionColor={theme.colors.primary}
            autoFocus
            style={[
              typography.title,
              {
                flex: 1,
                color: amount !== null && amount <= 0 ? theme.colors.textSecondary : theme.colors.text,
                textAlign: 'right',
                paddingVertical: spacing.md,
              },
            ]}
          />
        </View>
        {amount !== null && amount > 0 ? (
          <View style={styles.quickRow}>
            {[1000, 5000, 10000, 50000].map((v) => {
              const label = minorToInput(v * 100, currency).replace(/\.00$/, '');
              return (
                <Pressable
                  key={v}
                  accessibilityRole="button"
                  accessibilityLabel={`Set amount to ${label}`}
                  onPress={() => setAmountText(label)}
                  style={({ pressed }) => [
                    styles.quickChip,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderRadius: theme.radius.pill,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={[typography.captionSemiBold, { color: theme.colors.textSecondary }]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <Text style={[typography.label, { color: theme.colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.lg }]}>
          CATEGORY
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {DEBT_CATEGORIES.map((c) => {
            const active = category === c.key;
            return (
              <Pressable
                key={c.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={c.label}
                onPress={() => setCategory(c.key)}
                style={({ pressed }) => [
                  styles.categoryChip,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                    borderRadius: theme.radius.pill,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={c.icon as keyof typeof Ionicons.glyphMap}
                  size={15}
                  color={active ? theme.colors.textOnPrimary : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    typography.captionSemiBold,
                    { color: active ? theme.colors.textOnPrimary : theme.colors.textSecondary },
                  ]}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Field
          label="Note"
          icon="document-text-outline"
          placeholder="What was it for?"
          value={note}
          onChangeText={setNote}
          multiline
          containerStyle={{ marginTop: spacing.xl }}
        />

        <View style={styles.dueBlock}>
          <View style={styles.dueHeader}>
            <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={[typography.body, { color: theme.colors.text, flex: 1 }]}>Due date</Text>
            <Switch
              value={hasDueDate}
              onValueChange={setHasDueDate}
              trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
              thumbColor={theme.colors.textOnPrimary}
            />
          </View>

          {hasDueDate ? (
            <View style={styles.dateRow}>
              <QuickDate label="Today" value={todayISO()} onSelect={setDueAt} current={dueAt} />
              <QuickDate
                label="7 days"
                value={shift(todayISO(), 7)}
                onSelect={setDueAt}
                current={dueAt}
              />
              <QuickDate
                label="30 days"
                value={shift(todayISO(), 30)}
                onSelect={setDueAt}
                current={dueAt}
              />
              <View style={[styles.dateChip, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.pill }]}>
                <Text style={[typography.captionSemiBold, { color: theme.colors.textSecondary }]}>
                  {formatDate(dueAt).slice(0, 6)}
                </Text>
              </View>
            </View>
          ) : null}
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
          label="Save"
          icon="checkmark"
          size="lg"
          fullWidth
          loading={saving}
          disabled={!canSave}
          onPress={handleSave}
        />
      </View>

      <Sheet visible={showPeople} onClose={() => setShowPeople(false)} title="Choose person" icon="person-outline">
        <View style={styles.newPersonRow}>
          <Field
            icon="person-add-outline"
            placeholder="New person name"
            value={newPersonName}
            onChangeText={setNewPersonName}
            containerStyle={{ flex: 1, marginBottom: 0 }}
            autoCapitalize="words"
          />
          <Button
            icon="add"
            accessibilityLabel="Create person"
            disabled={!newPersonName.trim()}
            onPress={handleCreatePerson}
          />
        </View>

        <ScrollView style={{ maxHeight: 340 }}>
          {people.map((p) => (
            <SheetOption
              key={p.id}
              icon="person-outline"
              label={p.name}
              selected={personId === p.id}
              onPress={() => {
                setPersonId(p.id);
                setShowPeople(false);
                tap();
              }}
            />
          ))}
        </ScrollView>
      </Sheet>
    </SafeAreaView>
  );
}

function DirectionCard({
  icon,
  title,
  subtitle,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${title}, ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.directionCard,
        {
          backgroundColor: active ? theme.colors.primary : theme.colors.surface,
          borderColor: active ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radius.lg,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={26} color={active ? theme.colors.textOnPrimary : theme.colors.primary} />
      <Text
        style={[
          typography.bodyMedium,
          { color: active ? theme.colors.textOnPrimary : theme.colors.text, marginTop: spacing.sm },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          typography.caption,
          { color: active ? theme.colors.tintWhite : theme.colors.textSecondary },
        ]}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

function QuickDate({
  label,
  value,
  current,
  onSelect,
}: {
  label: string;
  value: string;
  current: string;
  onSelect: (next: string) => void;
}) {
  const theme = useTheme();
  const active = current === value;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Due ${label}`}
      onPress={() => onSelect(value)}
      style={({ pressed }) => [
        styles.dateChip,
        {
          backgroundColor: active ? theme.colors.primary : theme.colors.surfaceMuted,
          borderRadius: theme.radius.pill,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text
        style={[
          typography.captionSemiBold,
          { color: active ? theme.colors.textOnPrimary : theme.colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function shift(value: string, days: number): string {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, (d ?? 1) + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
  content: { padding: spacing.lg, paddingBottom: spacing.huge },
  directionRow: { flexDirection: 'row', marginBottom: spacing.lg },
  directionCard: {
    flex: 1,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'flex-start',
  },
  personPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.xl,
    minHeight: 62,
  },
  personText: { flex: 1 },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
  },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  quickChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  categoryRow: { gap: spacing.sm, paddingRight: spacing.lg },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
  },
  dueBlock: { marginTop: spacing.sm },
  dueHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  dateRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  dateChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  errorBox: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginTop: spacing.lg },
  footer: { padding: spacing.lg, borderTopWidth: 1 },
  newPersonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
});