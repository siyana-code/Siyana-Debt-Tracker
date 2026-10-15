import {
  dark,
  light,
  palettes,
  status,
  type ColorScheme,
  type ResolvedThemeMode,
  type ThemeMode,
} from './colors';
import { radius, spacing } from './spacing';
import { typography } from './typography';

export * from './colors';
export * from './spacing';
export * from './typography';

export interface Theme {
  /** The user's preference, which may be `system`. */
  mode: ThemeMode;
  /** The palette actually in use. */
  resolvedMode: ResolvedThemeMode;
  scheme: ColorScheme;
  /** True when the palette in use is the dark set. */
  dark: boolean;
  colors: ColorScheme;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

/**
 * Resolve the user's preference into a concrete palette.
 *
 * `system` follows the OS setting, defaulting to light when the platform
 * reports nothing (which is what happens on some web browsers).
 */
export function createTheme(mode: ThemeMode, systemScheme?: ResolvedThemeMode | null): Theme {
  const resolvedMode: ResolvedThemeMode =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const scheme = palettes[resolvedMode];
  return {
    mode,
    resolvedMode,
    scheme,
    dark: resolvedMode === 'dark',
    colors: scheme,
    spacing,
    radius,
    typography,
  };
}

export const defaultTheme = createTheme('light');

/** Direction glyphs carry lent/borrowed meaning instead of colour. */
export const debtDirection = {
  /** They owe you. Arrow points up out of your account toward them. */
  lent: {
    key: 'lent' as const,
    icon: 'arrow-up' as const,
    tint: palettes.light.primary,
    label: 'Lent',
  },
  /** You owe them. Arrow points down into your account from them. */
  borrowed: {
    key: 'borrowed' as const,
    icon: 'arrow-down' as const,
    tint: palettes.light.textSecondary,
    label: 'Borrowed',
  },
} as const;

export { status, light, dark };
export default defaultTheme;