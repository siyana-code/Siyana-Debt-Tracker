import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme, useThemePreference } from '../theme/ThemeProvider';
import { loadSettings, getDatabase } from '../db';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* already hidden — safe to ignore */
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [initialMode, setInitialMode] = useState<'system' | 'light' | 'dark'>('system');

  useEffect(() => {
    (async () => {
      try {
        // Opening the database runs migrations before the first screen paints.
        await getDatabase();
        const settings = await loadSettings();
        setInitialMode(settings.themeMode);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[boot] database warm-up failed', error);
      } finally {
        setReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    })();
  }, []);

  if (!ready) return <View style={{ flex: 1 }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider initialMode={initialMode}>
          <ThemedStack />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedStack() {
  const theme = useTheme();
  const [preference] = useThemePreference();

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: { color: theme.colors.text, fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="debt/new"
          options={{ title: 'New Debt', presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="debt/[id]"
          options={{ title: 'Debt', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="person/new"
          options={{ title: 'New Person', presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen name="person/[id]" options={{ title: 'Person' }} />
        <Stack.Screen
          name="payment/new"
          options={{ title: 'Record Payment', presentation: 'modal', headerShown: false }}
        />
      </Stack>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
    </>
  );
}