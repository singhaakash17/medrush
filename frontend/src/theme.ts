/**
 * MedRush Design System — Theme Tokens
 * Exported as `T` so usage stays terse: T.Colors.navyMid, T.FontSize.lg, etc.
 */

// ─── Colors ──────────────────────────────────────────────────────────────────

const Colors = {
  // Navy family (primary brand)
  navy: '#1E3A5F',
  navyMid: '#2563EB',
  navyLight: '#EFF6FF',

  // Emerald / success
  emerald: '#10B981',
  emeraldLight: '#ECFDF5',
  emeraldDark: '#065F46',

  // Amber / warning
  amber: '#F59E0B',
  amberLight: '#FEF3C7',

  // Crimson / error / danger
  crimson: '#EF4444',
  crimsonLight: '#FEF2F2',

  // Neutrals
  white: '#FFFFFF',
  surface: '#F8FAFC',
  border: '#CBD5E1',
  borderLight: '#E2E8F0',

  // Text hierarchy
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',
} as const;

// ─── Font sizes ───────────────────────────────────────────────────────────────

const FontSize = {
  '2xs': 10,
  xs: 12,
  sm: 13,
  base: 14,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

// ─── Font weights ─────────────────────────────────────────────────────────────
// React Native accepts string literals for fontWeight.

const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

// ─── Border radii ─────────────────────────────────────────────────────────────

const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardMd: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardLg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ─── Exported token namespace ─────────────────────────────────────────────────

export const T = {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  Radius,
  Shadow,
} as const;
