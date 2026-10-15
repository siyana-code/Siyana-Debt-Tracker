import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, useThemePreference } from '../../theme/ThemeProvider';
import { useSettings } from '../../hooks/useDebts';
import { CURRENCIES } from '../../domain/money';
import { databaseStats, eraseAllData } from '../../db';
import { Screen, Card, SectionHeader, SegmentedControl, Sheet, SheetOption } from '../../components/ui';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { settings, update } = useSettings();
  const [pref, setPref] = useThemePreference();
  const [stats, setStats] = useState<{ people: number; debts: number; payments: number; schemaVersion: number } | null>(null);
  const [showCurrency, setShowCurrency] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    void databaseStats().then(setStats);
  }, []);

  if (!settings) return <View style={[styles.root, { backgroundColor: theme.colors.background }]} />;

  return (
    <Screen scroll>
      <SectionHeader title="Appearance" icon="color-palette-outline" />
      <Card padded={false}>
        <View style={styles.block}>
          <SegmentedControl<'system' | 'light' | 'dark'>
            accessibilityLabel="Theme"
            value={pref}
            onChange={(mode) => {
              setPref(mode);
              void update({ themeMode: mode });
            }}
            segments={[
              { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
              { value: 'light', label: 'Light', icon: 'sunny-outline' },
              { value: 'dark', label: 'Dark', icon: 'moon-outline' },
            ]}
          />
        </View>
      </Card>

      <SectionHeader title="Money" icon="cash-outline" />
      <Card padded={false}>
        <SettingRow
          icon="cash-outline"
          label="Currency"
          value={`${settings.currency} · ${CURRENCIES[settings.currency]?.symbol ?? ''}`}
          onPress={() => setShowCurrency(true)}
        />
        <SettingRow
          icon="calendar-outline"
          label="Remind me before due"
          value={`${settings.dueSoonDays} days`}
          trailing={
            <Switch
              value={settings.remindersEnabled}
              onValueChange={(v) => void update({ remindersEnabled: v })}
              trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
              thumbColor={theme.colors.textOnPrimary}
            />
          }
        />
        <StepperRow
          icon="time-outline"
          label="Due-soon window"
          value={settings.dueSoonDays}
          min={1}
          max={30}
          onChange={(v) => void update({ dueSoonDays: v })}
        />
      </Card>

      <SectionHeader title="Data" icon="server-outline" />
      <Card padded={false}>
        <SettingRow
          icon="download-outline"
          label="Export as JSON"
          onPress={() => router.push('/export')}
        />
        <SettingRow
          icon="cloud-offline-outline"
          label="Storage"
          value="On this device only"
          icon2="lock-closed-outline"
        />
        {stats ? (
          <SettingRow
            icon="pulse-outline"
            label="Records"
            value={`${stats.debts} debts · ${stats.people} people · ${stats.payments} payments`}
          />
        ) : null}
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Erase all data"
          onPress={() =>
            Alert.alert(
              'Erase everything?',
              'This permanently deletes every person, debt and payment on this device. There is no cloud backup.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Erase',
                  style: 'destructive',
                  onPress: async () => {
                    await eraseAllData();
                    setStats(await databaseStats());
                  },
                },
              ],
            )
          }
          style={({ pressed }) => [styles.dangerRow, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="trash-outline" size={18} color={theme.colors.textSecondary} />
          <Text style={[typography.bodyMedium, { color: theme.colors.textSecondary, marginLeft: spacing.sm }]}>
            Erase all data
          </Text>
        </Pressable>
      </Card>

      <SectionHeader title="About" icon="information-circle-outline" />
      <Card padded={false}>
        <SettingRow
          icon="apps-outline"
          label="About Siyana Debt Tracker"
          onPress={() => setShowAbout(true)}
        />
        <SettingRow
          icon="git-branch-outline"
          label="Version"
          value={Constants.expoConfig?.version ?? '1.0.0'}
        />
        <SettingRow
          icon="color-palette-outline"
          label="Built by"
          value="Siyana Code"
        />
      </Card>

      <View style={{ height: spacing.huge }} />

      <Sheet visible={showCurrency} onClose={() => setShowCurrency(false)} title="Currency" icon="cash-outline">
        {Object.values(CURRENCIES).map((c) => (
          <SheetOption
            key={c.code}
            label={`${c.code} — ${c.label}`}
            description={`${c.symbol}${c.decimals === 0 ? '' : '.00'}`}
            selected={settings.currency === c.code}
            onPress={() => {
              void update({ currency: c.code });
              setShowCurrency(false);
            }}
          />
        ))}
      </Sheet>

      <Sheet visible={showAbout} onClose={() => setShowAbout(false)} title="About" icon="information-circle-outline">
        <View style={{ paddingBottom: spacing.xl }}>
          <Text style={[typography.body, { color: theme.colors.textSecondary, lineHeight: 22 }]}>
            Siyana Debt Tracker keeps every record on this device. No account, no server, no telemetry.
          </Text>
          <Text
            style={[typography.body, { color: theme.colors.textSecondary, lineHeight: 22, marginTop: spacing.md }]}
          >
            Open source, MIT licensed, built by Rasindu Appuhami for the Siyana Code open source programme.
          </Text>
        </View>
      </Sheet>
    </Screen>
  );
}

function SettingRow({
  icon,
  label,
  value,
  onPress,
  trailing,
  icon2,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  icon2?: keyof typeof Ionicons.glyphMap;
}) {
  const theme = useTheme();
  const content = (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: theme.colors.primaryHover }]}>
        <Ionicons name={icon} size={16} color={theme.colors.primary} />
      </View>
      <Text style={[typography.body, { color: theme.colors.text, flex: 1 }]}>{label}</Text>
      {value ? (
        <Text numberOfLines={1} style={[typography.caption, { color: theme.colors.textSecondary, maxWidth: 160 }]}>
          {value}
        </Text>
      ) : null}
      {icon2 ? <Ionicons name={icon2} size={14} color={theme.colors.textDisabled} /> : null}
      {trailing}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.colors.textDisabled} /> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [pressed && { backgroundColor: theme.colors.primaryHover }]}
    >
      {content}
    </Pressable>
  );
}

function StepperRow({
  icon,
  label,
  value,
  min,
  max,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: theme.colors.primaryHover }]}>
        <Ionicons name={icon} size={16} color={theme.colors.primary} />
      </View>
      <Text style={[typography.body, { color: theme.colors.text, flex: 1 }]}>{label}</Text>
      <Pressable
        accessibilityLabel={`Decrease ${label}`}
        accessibilityRole="button"
        hitSlop={8}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
        style={[styles.stepperBtn, { borderColor: theme.colors.border, opacity: value <= min ? 0.4 : 1 }]}
      >
        <Ionicons name="remove" size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Text style={[typography.bodyMedium, { color: theme.colors.text, minWidth: 34, textAlign: 'center' }]}>
        {value}
      </Text>
      <Pressable
        accessibilityLabel={`Increase ${label}`}
        accessibilityRole="button"
        hitSlop={8}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + 1))}
        style={[styles.stepperBtn, { borderColor: theme.colors.border, opacity: value >= max ? 0.4 : 1 }]}
      >
        <Ionicons name="add" size={16} color={theme.colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  block: { padding: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  rowIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});