/**
 * Offline export.
 *
 * The database is the only place data lives, so an export file is the user's
 * safety net. JSON round-trips through the import path; CSV is for spreadsheets.
 */

import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { listDebts } from '../db/repositories/debts';
import { listPeople } from '../db/repositories/people';
import { buildExport, exportToCsv } from '../db/export';
import { Button, Card, Screen, SectionHeader, StatTile } from '../components/ui';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function ExportScreen() {
  const theme = useTheme();
  const [busy, setBusy] = useState<'json' | 'csv' | null>(null);
  const [counts, setCounts] = useState<{ people: number; debts: number; payments: number } | null>(null);

  React.useEffect(() => {
    void (async () => {
      const [people, debts] = await Promise.all([listPeople(true), listDebts()]);
      setCounts({
        people: people.length,
        debts: debts.length,
        payments: debts.reduce((n, d) => n + (d.paid > 0 ? 1 : 0), 0),
      });
    })();
  }, []);

  const stamp = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const share = async (format: 'json' | 'csv') => {
    setBusy(format);
    try {
      const people = await listPeople(true);
      const debts = await listDebts();
      const content = format === 'json' ? buildExport(people, debts) : exportToCsv(debts);
      const filename = `siyana-debts-${stamp}.${format}`;

      // Cache, not documents: exports are transient and the user can delete
      // them from the share sheet. Nothing important is written here.
      const target = new File(Paths.cache, filename);
      if (target.exists) target.delete();
      target.create();
      target.write(content);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(target.uri, {
          mimeType: format === 'json' ? 'application/json' : 'text/csv',
          dialogTitle: 'Export your debts',
          UTI: format === 'json' ? 'public.json' : 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Export ready', `Saved to ${target.uri}`);
      }
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.row}>
        <StatTile icon="people-outline" label="People" value={String(counts?.people ?? '--')} />
        <View style={{ width: spacing.sm }} />
        <StatTile icon="swap-horizontal-outline" label="Debts" value={String(counts?.debts ?? '--')} />
      </View>

      <SectionHeader title="Export" icon="download-outline" />
      <Card padded={false}>
        <Text style={[typography.caption, { color: theme.colors.textSecondary, padding: spacing.lg, lineHeight: 19 }]}>
          Everything stays on this device. Exporting writes a plain file you control, and nothing is
          uploaded anywhere.
        </Text>

        <View style={styles.actions}>
          <Button
            label="Export as JSON"
            icon="code-slash-outline"
            fullWidth
            loading={busy === 'json'}
            onPress={() => void share('json')}
          />
          <View style={{ height: spacing.sm }} />
          <Button
            label="Export as CSV"
            icon="grid-outline"
            variant="secondary"
            fullWidth
            loading={busy === 'csv'}
            onPress={() => void share('csv')}
          />
        </View>
      </Card>

      <SectionHeader title="Format" icon="help-circle-outline" />
      <Card padded={false}>
        <FormatRow
          icon="code-slash-outline"
          title="JSON"
          body="Complete backup. People, debts and payment history. Use this to move to a new phone."
        />
        <FormatRow
          icon="grid-outline"
          title="CSV"
          body="One row per debt with totals. Opens in Excel, Google Sheets or Numbers."
        />
      </Card>

      <View style={{ height: spacing.huge }} />
    </Screen>
  );
}

function FormatRow({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.formatRow}>
      <View style={[styles.formatIcon, { backgroundColor: theme.colors.primaryHover }]}>
        <Ionicons name={icon} size={16} color={theme.colors.primary} />
      </View>
      <View style={styles.formatBody}>
        <Text style={[typography.bodyMedium, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[typography.caption, { color: theme.colors.textSecondary, marginTop: 2, lineHeight: 18 }]}>
          {body}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  actions: { padding: spacing.lg, paddingTop: 0 },
  formatRow: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  formatIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  formatBody: { flex: 1 },
});