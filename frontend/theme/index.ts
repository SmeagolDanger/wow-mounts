/**
 * WoW Mount Tracker — Theme System
 *
 * Dark, immersive palette inspired by WoW's UI chrome.
 * Gold highlights for legendary/collected, arcane purple for accents,
 * deep slate backgrounds with subtle warmth.
 */

export const colors = {
  // ── Backgrounds ───────────────────────────────────────────
  bg: {
    primary: '#0A0C10',      // Near-black with blue undertone
    secondary: '#12151C',    // Card backgrounds
    tertiary: '#1A1E28',     // Elevated surfaces
    overlay: '#222738',      // Modals, tooltips
    input: '#161A24',        // Input fields
  },

  // ── WoW-Inspired Accents ──────────────────────────────────
  gold: {
    primary: '#F8B700',      // Legendary gold
    light: '#FFD54F',        // Hover/active state
    dim: '#A67C00',          // Subtle gold for borders
    muted: '#5C4A1E',        // Background tint
  },
  arcane: {
    primary: '#9B59E8',      // Arcane purple
    light: '#C084FC',        // Light purple
    dim: '#6B3FA0',          // Dark purple
    muted: '#2D1B4E',        // Background tint
  },
  fel: {
    primary: '#4ADE80',      // Fel green (collected/success)
    dim: '#166534',          // Dark green
    muted: '#0D3B20',        // Background tint
  },
  fire: {
    primary: '#EF4444',      // Red for uncollected/danger
    dim: '#991B1B',
    muted: '#3B1111',
  },
  frost: {
    primary: '#38BDF8',      // Frost blue for info
    dim: '#0369A1',
    muted: '#0C2D48',
  },

  // ── Text ──────────────────────────────────────────────────
  text: {
    primary: '#E8E6E3',      // Warm off-white
    secondary: '#9CA3AF',    // Muted descriptions
    tertiary: '#6B7280',     // Hints, timestamps
    inverse: '#0A0C10',      // Text on light backgrounds
  },

  // ── Borders & Dividers ────────────────────────────────────
  border: {
    default: '#2A2F3C',
    light: '#363D4E',
    gold: 'rgba(248, 183, 0, 0.3)',
    arcane: 'rgba(155, 89, 232, 0.3)',
  },

  // ── Rarity Colors (WoW item quality) ─────────────────────
  rarity: {
    poor: '#9D9D9D',
    common: '#FFFFFF',
    uncommon: '#1EFF00',
    rare: '#0070DD',
    epic: '#A335EE',
    legendary: '#FF8000',
  },

  // ── Source Type Colors ────────────────────────────────────
  source: {
    raid: '#A335EE',
    dungeon: '#0070DD',
    world_boss: '#FF8000',
    reputation: '#1EFF00',
    achievement: '#F8B700',
    vendor: '#FFFFFF',
    promotion: '#00CCFF',
    quest: '#FFD100',
    drop: '#9D9D9D',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};

export const typography = {
  // Display — screen titles
  display: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: colors.text.primary,
  },
  // Heading — section headers
  heading: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    color: colors.text.primary,
  },
  // Subheading
  subheading: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  // Body
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: colors.text.primary,
  },
  // Caption
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.text.secondary,
    letterSpacing: 0.2,
  },
  // Label
  label: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.text.tertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  }),
};

const theme = { colors, spacing, radii, typography, shadows };
export default theme;
