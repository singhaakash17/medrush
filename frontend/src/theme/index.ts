/**
 * MedRush Design System — mobile token file.
 * Import { T } from '@/theme' in every screen.
 */

export const Colors = {
  // ── Brand ────────────────────────────────
  navy:       '#0F172A',
  navyMid:    '#1E40AF',
  navyLight:  '#EFF6FF',

  emerald:    '#10B981',
  emeraldDark:'#047857',
  emeraldLight:'#ECFDF5',

  amber:      '#F59E0B',
  amberLight: '#FFF8E7',

  crimson:    '#EF4444',
  crimsonLight:'#FFF1F2',

  // ── Surface ──────────────────────────────
  white:      '#FFFFFF',
  surface:    '#F8FAFC',
  surfaceCard:'#FFFFFF',
  border:     '#E2E8F0',
  borderLight:'#F1F5F9',

  // ── Text ─────────────────────────────────
  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textTertiary:  '#94A3B8',
  textInverse:   '#FFFFFF',
} as const;

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
} as const;

export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  full: 9999,
} as const;

export const FontSize = {
  '2xs': 10,
  xs:    12,
  sm:    13,
  base:  14,
  md:    15,
  lg:    16,
  xl:    18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,
  '5xl': 32,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium:  '500' as const,
  semibold:'600' as const,
  bold:    '700' as const,
  black:   '800' as const,
} as const;

export const Shadow = {
  card: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius:  3,
    elevation:     2,
  },
  cardMd: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius:  8,
    elevation:     4,
  },
  cardLg: {
    shadowColor:   '#0F172A',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius:  16,
    elevation:     8,
  },
} as const;

// ── Convenience object ────────────────────
export const T = { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } as const;
export default T;
