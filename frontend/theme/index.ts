/**
 * WoW Mount Tracker — Theme System
 * Dark, immersive palette inspired by WoW's UI chrome.
 */

export const colors = {
  bg: {
    primary: '#0A0C10',
    secondary: '#12151C',
    tertiary: '#1A1E28',
    overlay: '#222738',
    input: '#161A24',
    modal: 'rgba(0,0,0,0.75)',
  },
  gold: {
    primary: '#F8B700',
    light: '#FFD54F',
    dim: '#A67C00',
    muted: '#5C4A1E',
  },
  arcane: {
    primary: '#9B59E8',
    light: '#C084FC',
    dim: '#6B3FA0',
    muted: '#2D1B4E',
  },
  fel: {
    primary: '#4ADE80',
    dim: '#166534',
    muted: '#0D3B20',
  },
  fire: {
    primary: '#EF4444',
    dim: '#991B1B',
    muted: '#3B1111',
  },
  frost: {
    primary: '#38BDF8',
    dim: '#0369A1',
    muted: '#0C2D48',
  },
  text: {
    primary: '#E8E6E3',
    secondary: '#9CA3AF',
    tertiary: '#6B7280',
    inverse: '#0A0C10',
  },
  border: {
    default: '#2A2F3C',
    light: '#363D4E',
    gold: 'rgba(248, 183, 0, 0.3)',
  },
  rarity: {
    poor: '#9D9D9D',
    common: '#FFFFFF',
    uncommon: '#1EFF00',
    rare: '#0070DD',
    epic: '#A335EE',
    legendary: '#FF8000',
  },
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
  } as Record<string, string>,
  classColor: {
    Warrior: '#C79C6E',
    Paladin: '#F58CBA',
    Hunter: '#ABD473',
    Rogue: '#FFF569',
    Priest: '#FFFFFF',
    'Death Knight': '#C41F3B',
    Shaman: '#0070DE',
    Mage: '#69CCF0',
    Warlock: '#9482C9',
    Monk: '#00FF96',
    Druid: '#FF7D0A',
    'Demon Hunter': '#A330C9',
    Evoker: '#33937F',
  } as Record<string, string>,
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 };

export const radii = { sm: 6, md: 10, lg: 14, xl: 20, full: 9999 };

export const typography = {
  display: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5, color: colors.text.primary },
  heading: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.3, color: colors.text.primary },
  subheading: { fontSize: 16, fontWeight: '600' as const, color: colors.text.primary },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22, color: colors.text.primary },
  caption: { fontSize: 12, fontWeight: '500' as const, color: colors.text.secondary, letterSpacing: 0.2 },
  label: { fontSize: 11, fontWeight: '600' as const, color: colors.text.tertiary, letterSpacing: 0.8, textTransform: 'uppercase' as const },
};

export const shadows = {
  card: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  glow: (color: string) => ({ shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 }),
};

const theme = { colors, spacing, radii, typography, shadows };
export default theme;
