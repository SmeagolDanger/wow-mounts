/**
 * Theme — WoW UI inspired: deep navy backgrounds, burnished gold chrome,
 * class/rarity color systems. Brighter and more modern than pitch-black.
 */

export const colors = {
  bg: {
    primary: '#07080F',
    secondary: '#0D1220',
    tertiary: '#152030',
    elevated: '#1C2B40',
    input: '#0B101C',
    modal: 'rgba(5,7,14,0.93)',
  },
  gold: {
    primary: '#F5B800',
    bright: '#FFD43B',
    dim: '#9B7320',
    muted: '#2D2005',
    glow: 'rgba(245,184,0,0.18)',
  },
  arcane: {
    primary: '#9B6FFF',
    light: '#C4A8FF',
    dim: '#6B3FD6',
    muted: '#170A40',
  },
  fel: {
    primary: '#22C55E',
    bright: '#4ADE80',
    dim: '#15803D',
    muted: '#052E16',
  },
  fire: {
    primary: '#F87171',
    dim: '#B91C1C',
    muted: '#2D0A0A',
  },
  frost: {
    primary: '#22D3EE',
    dim: '#0891B2',
    muted: '#082030',
  },
  text: {
    primary: '#EEECf8',
    secondary: '#8E9CC2',
    tertiary: '#4E5A7A',
    gold: '#F5B800',
    inverse: '#07080F',
  },
  border: {
    default: '#1E2D46',
    subtle: '#162338',
    gold: 'rgba(245,184,0,0.32)',
    glow: 'rgba(245,184,0,0.10)',
  },
  rarity: {
    poor: '#9D9D9D', common: '#FFFFFF', uncommon: '#1EFF00',
    rare: '#0070DD', epic: '#A335EE', legendary: '#FF8000',
  },
  source: {
    raid: '#C084FC', dungeon: '#38BDF8', world_boss: '#FB923C',
    reputation: '#4ADE80', achievement: '#F5B800', vendor: '#E2E8F0',
    promotion: '#22D3EE', quest: '#FDE047', drop: '#94A3B8',
  } as Record<string, string>,
  classColor: {
    Warrior: '#C79C6E', Paladin: '#F58CBA', Hunter: '#ABD473',
    Rogue: '#FFF569', Priest: '#FFFFFF', 'Death Knight': '#C41F3B',
    Shaman: '#0070DE', Mage: '#69CCF0', Warlock: '#9482C9',
    Monk: '#00FF96', Druid: '#FF7D0A', 'Demon Hunter': '#A330C9',
    Evoker: '#33937F',
  } as Record<string, string>,
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 };
export const radii = { sm: 6, md: 10, lg: 14, xl: 20, full: 9999 };

export const typography = {
  display: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.3, color: colors.text.primary },
  heading: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.2, color: colors.text.primary },
  subheading: { fontSize: 15, fontWeight: '600' as const, color: colors.text.primary },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21, color: colors.text.primary },
  caption: { fontSize: 12, fontWeight: '500' as const, color: colors.text.secondary, letterSpacing: 0.2 },
  label: { fontSize: 10, fontWeight: '700' as const, color: colors.text.tertiary, letterSpacing: 1.2, textTransform: 'uppercase' as const },
};

export const shadows = {
  card: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 6 },
  glow: (c: string) => ({ shadowColor: c, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 18, elevation: 10 }),
};

export default { colors, spacing, radii, typography, shadows };
