/**
 * Haptic feedback.
 *
 * Three rules govern this module:
 *
 *  1. **Never throw into a caller.** Haptics are a nicety. If the module is
 *     missing, the platform has no taptic engine, or the user turned them off,
 *     the tap must still work. Every call is fire-and-forget and swallowed.
 *
 *  2. **Semantic, not physical.** Callers ask for `success()` or `warning()`,
 *     never `impactLight()`. That way the pattern can change without touching
 *     twenty call sites.
 *
 *  3. **Off by default on web, and switchable by the user.** Some people find
 *     vibration irritating or distracting; some phones are silent. The setting
 *     is honoured on every call.
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** True where a taptic engine can actually be driven. */
export const hapticsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

let enabled = true;

/** Mirrors the user's Settings preference. */
export function setHapticsEnabled(next: boolean): void {
  enabled = next && hapticsSupported;
}

export function areHapticsEnabled(): boolean {
  return enabled && hapticsSupported;
}

function safe(fn: () => Promise<void>): void {
  if (!areHapticsEnabled()) return;
  // Detached on purpose: the caller must not await, and must not see a throw.
  void fn().catch(() => {});
}

/* ------------------------------------------------------------------ */
/* Semantic vocabulary                                                 */
/* ------------------------------------------------------------------ */

/** Something was selected, opened or dismissed. The most common tap. */
export function selection(): void {
  safe(() => Haptics.selectionAsync());
}

/** A committed change — saved, settled, recorded. */
export function success(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** A rejected or destructive action. Paired with a confirmation, never alone. */
export function warning(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

/** The primary action on a screen. */
export function impact(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** A lighter confirmation, for row-level changes. */
export function tap(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}