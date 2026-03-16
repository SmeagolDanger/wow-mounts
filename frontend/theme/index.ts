/**
 * Theme — WoW UI inspired: obsidian backgrounds, burnished gold chrome,
 * parchment text tones, and class/rarity color systems.
 */

export const colors = {
  bg: {
    primary: '#08090D',
    secondary: '#0F1117',
    tertiary: '#171B24',
    elevated: '#1E2230',
    input: '#13161E',
    modal: 'rgba(4,5,8,0.88)',
  },
  gold: {
    primary: '#E8A931',
    bright: '#FFD04A',
    dim: '#8B6914',
    muted: '#3D2E0A',
    glow: 'rgba(232,169,49,0.15)',
  },
  arcane: {
    primary: '#8B5CF6',
    light: '#A78BFA',
    dim: '#5B21B6',
    muted: '#1E0A4E',
  },
  fel: {
    primary: '#22C55E',
    bright: '#4ADE80',
    dim: '#15803D',
    muted: '#052E16',
  },
  fire: {
    primary: '#EF4444',
    dim: '#991B1B',
    muted: '#2D0A0A',
  },
  frost: {
    primary: '#38BDF8',
    dim: '#0369A1',
    muted: '#082F49',
  },
  text: {
    primary: '#E2DDD5',
    secondary: '#8E8B83',
    tertiary: '#5C5A55',
    gold: '#D4A843',
    inverse: '#08090D',
  },
  border: {
    default: '#1F232E',
    subtle: '#292E3B',
    gold: 'rgba(232,169,49,0.25)',
    glow: 'rgba(232,169,49,0.08)',
  },
  rarity: {
    poor: '#9D9D9D', common: '#FFFFFF', uncommon: '#1EFF00',
    rare: '#0070DD', epic: '#A335EE', legendary: '#FF8000',
  },
  source: {
    raid: '#A335EE', dungeon: '#0070DD', world_boss: '#FF8000',
    reputation: '#1EFF00', achievement: '#E8A931', vendor: '#FFFFFF',
    promotion: '#00CCFF', quest: '#FFD100', drop: '#9D9D9D',
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
  card: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
  glow: (c: string) => ({ shadowColor: c, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 }),
};

export default { colors, spacing, radii, typography, shadows };
