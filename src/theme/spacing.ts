/** 4pt spacing scale. */

import { shadowColor } from './colors';

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

/** Minimum touch target — accessibility requirement (see NFR-A11Y-01). */
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const minTouchSize = 44;

export const elevation = {
  none: {},
  card: {
    shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sheet: {
    shadowColor,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  /** Floating action buttons — the strongest shadow in the app. */
  fab: {
    shadowColor,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
} as const;

export default spacing;