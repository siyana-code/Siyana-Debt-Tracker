/**
 * Backup screen.
 *
 * Because the database on the device is the only copy, this screen is the
 * user's escape hatch. Export and import live together because they are two
 * halves of the same action, and the language deliberately mirrors that:
 * nothing here uploads anything.
 */

import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { listDebts } from '../db/repositories/debts';
import { listPeople } from '../db/repositories/people';
import { listAllPayments } from '../db/repositories/payments';
import { buildExport, exportToCsv, parseBackup, type ImportPreview } from '../db/backup';
import { currentCounts, importBackup, type ImportMode } from '../db/import';
import { Button, Card, Screen, SectionHeader, StatTile } from '../components/ui';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function BackupScreen() {
  const theme = useTheme();

  const [busy, setBusy] = useState<'json' | 'csv' | null>(null);
  const [counts, setCounts] = useState<{ people: number; debts: number; payments: number } | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  React.useEffect(() => {
    void currentCounts().then(setCounts);
  }, []);

  const stamp = new Date().toISOString().slice(0, 10);

  /**
   * File I/O is native only. `expo-file-system` has no web implementation, so
   * the web build can show the ledger but cannot read or write a backup file.
   * Say so plainly rather than letting an opaque error surface.
   */
  const fileIoSupported = Platform.OS !== 'web';

  /* ---------------------------------------------------------------- */
  /* Export                                                            */
  /* ---------------------------------------------------------------- */

  const share = async (format: 'json' | 'csv') => {
    if (!fileIoSupported) {
      Alert.alert(
        'Not available in the browser',
        'Backups use the device file system, which the web build does not have. Open the app on Android or iOS to export or restore.',
      );
      return;
    }
    setBusy(format);
    try {
      const people = await listPeople(true);
      const debts = await listDebts();
      const payments = await listAllPayments();

      const content =
        format === 'json' ? buildExport(people, debts, payments) : exportToCsv(debts);
      const filename = `siyana-debts-${stamp}.${format}`;

      // Cache, not documents: exports are transient and the user can discard
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
      setCounts(await currentCounts());
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Import                                                            */
  /* ---------------------------------------------------------------- */

  /**
   * Android has no document picker wired up in this build, so the user points
   * at a file the app can already see. The candidates are exports this app
   * wrote earlier, which is the realistic restore path: export, then import.
   */
  const findBackupFile = async (): Promise<File | null> => {
    if (!fileIoSupported) return null;
    const dir = Paths.cache;
    let names: string[] = [];
    try {
      names = dir.list().map((entry) => entry.name);
    } catch {
      return null;
    }
    const candidates = names
      .filter((name) => name.endsWith('.json'))
      .sort((a, b) => b.localeCompare(a));
    return candidates.length > 0 ? new File(dir, candidates[0]) : null;
  };

  const runImport = async (mode: ImportMode) => {
    try {
      const file = await findBackupFile();
      if (!file) {
        Alert.alert(
          'No backup found',
          'Export a backup first, then come back to restore it. Backups are written to this app’s cache when you export.',
        );
        return;
      }

      const result = await importBackup(file.textSync(), mode);
      setPreview(null);
      setCounts(await currentCounts());

      const parts = [
        `${result.peopleAdded} people added`,
        `${result.debtsAdded} debts added`,
        `${result.paymentsAdded} payments added`,
      ];
      if (result.peopleUpdated) parts.push(`${result.peopleUpdated} people updated`);
      if (result.debtsUpdated) parts.push(`${result.debtsUpdated} debts updated`);
      if (result.removed) parts.push(`${result.removed} records removed`);

      Alert.alert('Backup restored', parts.join('\n'));
    } catch (error) {
      Alert.alert('Restore failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const chooseFile = async () => {
    const file = await findBackupFile();
    if (!file) {
      Alert.alert(
        'No backup found',
        'Export a backup first, then come back to restore it. Backups are written to this app’s cache when you export.',
      );
      return;
    }
    const parsed = parseBackup(file.textSync());
    setPreview({ ...parsed, exportedAt: parsed.exportedAt });
  };

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <Screen scroll>
      <View style={styles.row}>
        <StatTile icon="people-outline" label="People" value={String(counts?.people ?? '--')} />
        <View style={{ width: spacing.sm }} />
        <StatTile icon="swap-horizontal-outline" label="Debts" value={String(counts?.debts ?? '--')} />
      </View>
      <View style={[styles.row, { marginTop: spacing.sm }]}>
        <StatTile icon="receipt-outline" label="Payments" value={String(counts?.payments ?? '--')} />
        <View style={{ width: spacing.sm }} />
        <StatTile
          icon="cloud-offline-outline"
          label="Storage"
          value="Local"
          caption="Nothing uploaded"
          tone="muted"
        />
      </View>

      <SectionHeader title="Export" icon="download-outline" />
      <Card padded={false}>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          Everything stays on this device. Exporting writes a plain file you control, and
          nothing is sent anywhere.
        </Text>

        {!fileIoSupported ? (
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={15} color={theme.colors.textSecondary} />
            <Text style={[styles.noticeText, { color: theme.colors.textSecondary }]}>
              The browser preview cannot read or write files. Export and restore work on
              Android and iOS.
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            label="Export as JSON"
            icon="code-slash-outline"
            fullWidth
            disabled={!fileIoSupported}
            loading={busy === 'json'}
            onPress={() => void share('json')}
          />
          <View style={{ height: spacing.sm }} />
          <Button
            label="Export as CSV"
            icon="grid-outline"
            variant="secondary"
            fullWidth
            disabled={!fileIoSupported}
            loading={busy === 'csv'}
            onPress={() => void share('csv')}
          />
        </View>
      </Card>

      <SectionHeader title="Restore" icon="cloud-upload-outline" />
      <Card padded={false}>
        {preview === null ? (
          <View style={styles.actions}>
            <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
              Bring a previous backup back onto this device. Merging keeps what is already here
              and adds anything new.
            </Text>
            <View style={{ height: spacing.md }} />
            <Button
              label="Choose a backup"
              icon="folder-open-outline"
              variant="secondary"
              fullWidth
              disabled={!fileIoSupported}
              onPress={() => void chooseFile()}
            />
          </View>
        ) : preview.ok ? (
          <View style={styles.actions}>
            <FormatRow
              icon="checkmark-circle"
              title={`Backup from ${(preview.exportedAt ?? '').slice(0, 10) || 'this device'}`}
              body={`Version ${preview.version ?? '?'} · ${preview.people} people · ${preview.debts} debts · ${preview.payments} payments`}
            />
            <View style={{ height: spacing.md }} />
            <Button
              label="Merge into this device"
              icon="git-merge-outline"
              fullWidth
              onPress={() => void runImport('merge')}
            />
            <View style={{ height: spacing.sm }} />
            <Button
              label="Replace everything"
              icon="refresh-outline"
              variant="danger"
              fullWidth
              onPress={() =>
                Alert.alert(
                  'Replace everything?',
                  `This permanently deletes all ${counts?.people ?? 0} people, ${
                    counts?.debts ?? 0
                  } debts and ${counts?.payments ?? 0} payments on this device, then restores the backup. There is no undo.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Replace',
                      style: 'destructive',
                      onPress: () => void runImport('replace'),
                    },
                  ],
                )
              }
            />
            <View style={{ height: spacing.sm }} />
            <Button label="Cancel" variant="ghost" fullWidth onPress={() => setPreview(null)} />
          </View>
        ) : (
          <View style={styles.actions}>
            <FormatRow icon="alert-circle" title="That file cannot be used" body={preview.error ?? ''} />
            <View style={{ height: spacing.md }} />
            <Button label="Try another file" variant="ghost" fullWidth onPress={() => void chooseFile()} />
          </View>
        )}
      </Card>

      <SectionHeader title="What each format is for" icon="help-circle-outline" />
      <Card padded={false}>
        <FormatRow
          icon="code-slash-outline"
          title="JSON — backup"
          body="Everything, including payment history and raw amounts. Use this to move to a new phone or to recover from a lost one."
        />
        <FormatRow
          icon="grid-outline"
          title="CSV — spreadsheets"
          body="One row per debt with formatted amounts. Opens in Excel, Google Sheets or Numbers. Read-only; import reads JSON."
        />
      </Card>

      <View style={{ height: spacing.huge }} />
    </Screen>
  );
}

function FormatRow({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
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
  body: { ...typography.caption, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, lineHeight: 19 },
notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    alignItems: 'flex-start',
  },
noticeText: { ...typography.caption, flex: 1, lineHeight: 18 },
  formatRow: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  formatIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  formatBody: { flex: 1 },
});