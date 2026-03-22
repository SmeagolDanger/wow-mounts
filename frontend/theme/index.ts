/**
 * Theme — WoW UI inspired: deep navy backgrounds, burnished gold chrome,
 * class/rarity color systems. Modern glassmorphism + depth.
 */

export const colors = {
  bg: {
    primary: '#06070D',
    secondary: '#0C1018',
    tertiary: '#131A28',
    elevated: '#1A2538',
    input: '#0A0E18',
    modal: 'rgba(4,5,10,0.95)',
    glass: 'rgba(14,18,32,0.72)',
    glassLight: 'rgba(22,30,52,0.55)',
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
    primary: '#F0EEF8',
    secondary: '#8E9CC2',
    tertiary: '#4E5A7A',
    gold: '#F5B800',
    inverse: '#06070D',
  },
  border: {
    default: '#1A2640',
    subtle: '#141E34',
    gold: 'rgba(245,184,0,0.32)',
    glow: 'rgba(245,184,0,0.10)',
    glass: 'rgba(255,255,255,0.06)',
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
export const radii = { sm: 6, md: 10, lg: 14, xl: 20, xxl: 24, full: 9999 };

export const typography = {
  display: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5, color: colors.text.primary },
  heading: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.2, color: colors.text.primary },
  subheading: { fontSize: 15, fontWeight: '600' as const, color: colors.text.primary },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21, color: colors.text.primary },
  caption: { fontSize: 12, fontWeight: '500' as const, color: colors.text.secondary, letterSpacing: 0.2 },
  label: { fontSize: 10, fontWeight: '700' as const, color: colors.text.tertiary, letterSpacing: 1.2, textTransform: 'uppercase' as const },
};

export const shadows = {
  card: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 5 },
  soft: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  glow: (c: string) => ({ shadowColor: c, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 }),
};

export default { colors, spacing, radii, typography, shadows };
