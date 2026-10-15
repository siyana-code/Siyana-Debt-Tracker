import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/ThemeProvider';
import { createPerson } from '../../db/repositories/people';
import { Button, Field } from '../../components/ui';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function NewPersonScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const person = await createPerson({
      name,
      phone: phone.trim() || null,
      email: email.trim() || null,
      location: location.trim() || null,
      note: note.trim() || null,
    });
    setSaving(false);
    router.replace(`/person/${person.id}`);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </Pressable>
          <Text style={[typography.subheading, { color: theme.colors.text }]}>New person</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <Field
            label="Name"
            icon="person-outline"
            placeholder="Full name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoFocus
          />
          <Field
            label="Phone"
            icon="call-outline"
            placeholder="Optional"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Field
            label="Email"
            icon="mail-outline"
            placeholder="Optional"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Location"
            icon="location-outline"
            placeholder="Optional"
            value={location}
            onChangeText={setLocation}
          />
          <Field
            label="Note"
            icon="document-text-outline"
            placeholder="Optional"
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>

        <View style={[styles.footer, { borderTopColor: theme.colors.divider, backgroundColor: theme.colors.surface }]}>
          <Button
            label="Create person"
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
  content: { flex: 1, padding: spacing.lg },
  footer: { padding: spacing.lg, borderTopWidth: 1 },
});