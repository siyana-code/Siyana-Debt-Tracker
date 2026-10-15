/**
 * Siyana Code — Design Tokens / Colour Palette
 * ----------------------------------------------------
 * The four core brand colours are taken verbatim from the
 * Siyana Code standard web UI palette. Nothing else may be
 * introduced as a "brand" colour without a change to this file
 * and an update to docs/06-design-system.md.
 *
 * | Colour name            | Hex       | Role                                   |
 * |------------------------|-----------|----------------------------------------|
 * | Bleu de France         | #3484F0   | Primary accent, links, primary actions |
 * | Light Tropical Blue    | #C4DBFA   | Soft backgrounds, secondary containers |
 * | Beautiful White        | #F7F7F7   | Core layout background / card backing  |
 * | Solid Matte Gray       | #757575   | Secondary text, borders, disabled      |
 */

export const brand = {
  /** Bleu de France — primary accent, links, major action buttons. */
  bleu: '#3484F0',
  /** Light Tropical Blue — soft backgrounds, hover highlights, secondary containers. */
  tropical: '#C4DBFA',
  /** Beautiful White — core layout background and card structural backing. */
  white: '#F7F7F7',
  /** Solid Matte Gray — secondary text, borders, dividers, disabled states. */
  matteGray: '#757575',
} as const;

/**
 * Neutral ramp derived from Solid Matte Gray and Beautiful White by mixing
 * toward white / black. Used for surfaces, dividers and text hierarchy so that
 * no raw hex value is hard-coded in a component.
 */
export const neutral = {
  0: '#FFFFFF',
  50: '#FAFAFA',
  100: brand.white, // #F7F7F7
  200: '#EBEBEB',
  300: '#DDDDDD',
  400: '#B9B9B9',
  500: brand.matteGray, // #757575
  600: '#616161',
  700: '#4D4D4D',
  800: '#333333',
  900: '#1A1A1A',
} as const;

/**
 * Text and glyphs drawn on top of a Bleu de France fill.
 *
 * This is a brand constant, not a theme choice — it is the same in light and
 * dark — so it is available at module scope for static StyleSheet blocks as
 * well as via `theme.colors.textOnPrimary`.
 */
export const onPrimary = '#FFFFFF';

/** Base colour for every elevation shadow. */
export const shadowColor = '#1A1A1A';

/** Alpha helpers — keep tinting in one place. */
export const alpha = {
  bleu08: 'rgba(52, 132, 240, 0.08)',
  bleu12: 'rgba(52, 132, 240, 0.12)',
  bleu16: 'rgba(52, 132, 240, 0.16)',
  bleu24: 'rgba(52, 132, 240, 0.24)',
  gray08: 'rgba(117, 117, 117, 0.08)',
  gray16: 'rgba(117, 117, 117, 0.16)',
  gray24: 'rgba(117, 117, 117, 0.24)',
  white16: 'rgba(255, 255, 255, 0.16)',
  white24: 'rgba(255, 255, 255, 0.24)',
  overlay: 'rgba(26, 26, 26, 0.55)',
} as const;

/**
 * Semantic status colours.
 *
 * Direction of a debt (lent vs borrowed) is deliberately NOT colour-coded —
 * it is carried by icon shape and arrow direction instead, so the UI stays
 * readable for colour-blind users and consistent with the four-colour palette.
 *
 * Only genuinely exceptional states (overdue, partially paid) need a hue that
 * the four brand colours cannot express. These come from the standard Material
 * red / amber ramp and are documented as extensions in docs/06-design-system.md.
 */
export const status = {
  /** Overdue — past its due date and still outstanding. Material error red. */
  overdue: '#B3261E',
  overdueSurface: '#FCEEEC',
  /** Partially settled — some progress but money still owed. Material dark amber. */
  partial: '#B26A00',
  partialSurface: '#FDF3E3',
  /** Fully settled — reuses Solid Matte Gray, no new colour needed. */
  settled: brand.matteGray,
  settledSurface: '#F2F2F2',
} as const;

/** Semantic aliases used by components. */
export const light = {
  background: brand.white, // Beautiful White
  surface: neutral[0],
  surfaceMuted: neutral[100],
  surfaceSunken: '#F1F3F5',
  primaryContainer: brand.tropical,
  border: neutral[300],
  borderStrong: neutral[400],
  divider: neutral[200],

  text: neutral[900],
  textSecondary: brand.matteGray,
  textDisabled: neutral[400],
  textOnPrimary: onPrimary,
  textOnPrimaryContainer: neutral[800],

  primary: brand.bleu,
  primaryPressed: '#2A6FD1',
  primaryHover: alpha.bleu08,

  disabled: neutral[200],
  disabledText: neutral[400],

  overlay: alpha.overlay,
  shadow: 'rgba(26, 26, 26, 0.12)',

  /** Tints, exposed on the scheme so components never import `alpha` directly. */
  tintBleu: alpha.bleu08,
  tintBleuStrong: alpha.bleu24,
  tintWhite: alpha.white16,
  tintWhiteStrong: alpha.white24,
} as const;

export const dark = {
  background: '#101418',
  surface: '#171C22',
  surfaceMuted: '#1F252D',
  surfaceSunken: '#0B0E12',
  primaryContainer: '#1B3A63',
  border: '#2C343E',
  borderStrong: '#3A444F',
  divider: '#232A33',

  text: '#F2F4F7',
  textSecondary: '#A9B2BD',
  textDisabled: '#5C6570',
  textOnPrimary: onPrimary,
  textOnPrimaryContainer: '#C4DBFA',

  primary: brand.bleu,
  primaryPressed: '#5AA0F4',
  primaryHover: alpha.bleu16,

  disabled: '#232A33',
  disabledText: '#5C6570',

  overlay: 'rgba(0, 0, 0, 0.65)',
  shadow: 'rgba(0, 0, 0, 0.5)',

  tintBleu: alpha.bleu16,
  tintBleuStrong: alpha.bleu24,
  tintWhite: 'rgba(255, 255, 255, 0.16)',
  tintWhiteStrong: 'rgba(255, 255, 255, 0.24)',
} as const;

/**
 * Structural shape shared by both palettes. Values are widened to `string` so
 * the light and dark sets are interchangeable, while every *key* stays checked
 * — a token that exists in one theme but not the other is a compile error.
 */
export type ColorScheme = { readonly [K in keyof typeof light]: string };

export const palettes = { light, dark } as const;

/**
 * What the user can choose. `system` is a preference, not a palette — it
 * resolves to one of the two concrete schemes at render time.
 */
export type ThemeMode = 'system' | 'light' | 'dark';

/** A palette that actually exists in `palettes`. */
export type ResolvedThemeMode = keyof typeof palettes;

export const colors = {
  brand,
  neutral,
  alpha,
  status,
  light,
  dark,
} as const;

export default colors;