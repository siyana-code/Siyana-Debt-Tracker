import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { Button, Screen } from '../components/ui';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function NotFoundScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.container}>
        <Ionicons name="compass-outline" size={56} color={theme.colors.primary} />
        <Text style={[typography.heading, { color: theme.colors.text, marginTop: spacing.lg }]}>
          Page not found
        </Text>
        <Text
          style={[
            typography.caption,
            { color: theme.colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
          ]}
        >
          That screen does not exist.
        </Text>
        <Button
          label="Go home"
          icon="home-outline"
          onPress={() => router.replace('/')}
          style={{ marginTop: spacing.xl }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});