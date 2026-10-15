/**
 * Type scale. Sizes are fixed (not scaled by a font-size setting) so that the
 * dense, data-heavy screens of the app stay legible and predictable.
 */

export const fontSize = {
  display: 34,
  title: 28,
  heading: 22,
  subheading: 18,
  body: 16,
  callout: 15,
  caption: 13,
  micro: 11,
} as const;

/**
 * The app leans on icons over text, so weight and letter spacing do a lot of
 * the work of creating hierarchy without adding copy.
 */
export const fontWeight = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
} as const;

export const letterSpacing = {
  tight: -0.4,
  normal: 0,
  wide: 0.6,
  caps: 1.1,
} as const;

export const typography = {
  display: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
  heading: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semiBold,
    letterSpacing: letterSpacing.tight,
  },
  subheading: {
    fontSize: fontSize.subheading,
    fontWeight: fontWeight.semiBold,
    letterSpacing: letterSpacing.normal,
  },
  body: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.regular,
    letterSpacing: letterSpacing.normal,
  },
  bodyMedium: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.normal,
  },
  caption: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.regular,
    letterSpacing: letterSpacing.normal,
  },
  captionSemiBold: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semiBold,
    letterSpacing: letterSpacing.normal,
  },
  micro: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.normal,
  },
  microCaps: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.caps,
    textTransform: 'uppercase',
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semiBold,
    letterSpacing: letterSpacing.caps,
    textTransform: 'uppercase',
  },
  mono: {
    fontSize: fontSize.callout,
    fontWeight: fontWeight.medium,
    fontFamily: undefined,
  },
} as const;

export default typography;