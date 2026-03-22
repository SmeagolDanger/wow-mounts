/**
 * Requirement databases for toys, pets, titles, and transmog.
 * Mirrors the mount requirement system in mountRequirements.ts.
 *
 * Each collection maps item ID → requirement array.
 * Shared types are re-exported from mountRequirements.ts.
 */

import type { ClassReq, ProfessionReq, ReputationReq, AchievementReq, UnobtainableReq, CovenantReq, RaceReq } from './mountRequirements';
import { meetsStandingReq } from './mountRequirements';

export type CollectionReq =
  | ClassReq | RaceReq | ProfessionReq | ReputationReq
  | AchievementReq | UnobtainableReq | CovenantReq;

export interface ReqCheck {
  met: boolean;
  unmet: CollectionReq[];
  all: CollectionReq[];
}

// ── Armor type mapping for transmog ──────────────────────────────────

export const CLASS_ARMOR_TYPE: Record<string, string> = {
  'Warrior':      'Plate',
  'Paladin':      'Plate',
  'Death Knight': 'Plate',
  'Hunter':       'Mail',
  'Shaman':       'Mail',
  'Evoker':       'Mail',
  'Rogue':        'Leather',
  'Monk':         'Leather',
  'Druid':        'Leather',
  'Demon Hunter': 'Leather',
  'Mage':         'Cloth',
  'Warlock':      'Cloth',
  'Priest':       'Cloth',
};

// ════════════════════════════════════════════════════════════════════
// TOY REQUIREMENTS
// ════════════════════════════════════════════════════════════════════

export const TOY_REQUIREMENTS: Record<number, CollectionReq[]> = {

  // ── Unobtainable (TCG / Removed / Promo) ──
  // TCG Toys
  184: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // Goblin Weather Machine
  182: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // Ethereal Portal
  180: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // Path of Cenarius
  181: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // The Flag of Ownership
  183: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // Paper Flying Machine Kit
  171: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // Carved Ogre Idol
  172: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // Perpetual Purple Firework
  185: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // Demon Hunter's Aspect
  186: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // D.I.S.C.O.
  187: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // Papa Hummel's Old-Fashioned Pet Biscuit

  // Removed from game
  544: [{ type: 'unobtainable', reason: 'Removed (MoP Challenge Mode)' }],  // Challenger's Daily Chest
  543: [{ type: 'unobtainable', reason: 'Removed (WoD Challenge Mode)' }],

  // BlizzCon / Virtual Ticket
  479: [{ type: 'unobtainable', reason: 'BlizzCon Exclusive' }],
  545: [{ type: 'unobtainable', reason: 'BlizzCon 2018' }],

  // ── Class-restricted toys ──
  297: [{ type: 'class', classes: ['Death Knight'] }],   // Runed Deathbone Chestplate
  588: [{ type: 'class', classes: ['Monk'] }],            // Zen Flight (technically a spell)
  530: [{ type: 'class', classes: ['Shaman'] }],          // Farsight

  // ── Profession-crafted toys ──
  109: [{ type: 'profession', profession: 'Engineering' }],   // World Enlarger
  110: [{ type: 'profession', profession: 'Engineering' }],   // Gnomish Gravity Well
  111: [{ type: 'profession', profession: 'Engineering' }],   // Loot-A-Rang
  112: [{ type: 'profession', profession: 'Engineering' }],   // World Shrinker

  // ── Reputation toys ──
  379: [{ type: 'reputation', factionId: 1859, factionName: 'The Nightfallen', standing: 'Exalted' }],
  380: [{ type: 'reputation', factionId: 2170, factionName: 'Argussian Reach', standing: 'Exalted' }],
  381: [{ type: 'reputation', factionId: 2165, factionName: 'Army of the Light', standing: 'Exalted' }],

  // ── Covenant toys ──
  620: [{ type: 'covenant', covenant: 'Kyrian' }],
  621: [{ type: 'covenant', covenant: 'Venthyr' }],
  622: [{ type: 'covenant', covenant: 'Night Fae' }],
  623: [{ type: 'covenant', covenant: 'Necrolord' }],
};

// ════════════════════════════════════════════════════════════════════
// PET REQUIREMENTS
// ════════════════════════════════════════════════════════════════════

export const PET_REQUIREMENTS: Record<number, CollectionReq[]> = {

  // ── Unobtainable (TCG / CE / Removed) ──
  // TCG Pets
  85:  [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // Bananas
  34:  [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // Ethereal Soul-Trader
  153: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // Tuskarr Kite
  180: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // Eye of the Legion
  160: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // Sand Scarab
  156: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // Dragon Kite
  155: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // Hippogryph Hatchling
  154: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // Spectral Tiger Cub
  157: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // Rocket Chicken
  158: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // Nightsaber Cub
  159: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],   // Purple Puffer

  // Collector's Edition / Promo
  40:  [{ type: 'unobtainable', reason: "Collector's Edition (Vanilla)" }],   // Mini Diablo
  41:  [{ type: 'unobtainable', reason: "Collector's Edition (Vanilla)" }],   // Panda Cub
  42:  [{ type: 'unobtainable', reason: "Collector's Edition (Vanilla)" }],   // Zergling
  45:  [{ type: 'unobtainable', reason: "Collector's Edition (BC)" }],        // Netherwhelp
  84:  [{ type: 'unobtainable', reason: "Collector's Edition (WotLK)" }],     // Frosty
  229: [{ type: 'unobtainable', reason: "Collector's Edition (MoP)" }],       // Lucky Quilen Cub
  212: [{ type: 'unobtainable', reason: "Collector's Edition (Cata)" }],      // Lil' Deathwing

  // Removed / BlizzCon
  92:  [{ type: 'unobtainable', reason: 'BlizzCon 2005' }],    // Murky
  115: [{ type: 'unobtainable', reason: 'BlizzCon 2008' }],    // Mini Tyrael
  191: [{ type: 'unobtainable', reason: 'BlizzCon 2013' }],    // Murkalot
  207: [{ type: 'unobtainable', reason: 'BlizzCon 2014' }],    // Grommloc

  // ── Profession pets ──
  67:  [{ type: 'profession', profession: 'Engineering' }],     // Mechanical Squirrel
  96:  [{ type: 'profession', profession: 'Engineering' }],     // Lil' Smoky
  97:  [{ type: 'profession', profession: 'Engineering' }],     // Pet Bombling
  274: [{ type: 'profession', profession: 'Engineering' }],     // Mechanical Axebeak
  200: [{ type: 'profession', profession: 'Jewelcrafting' }],   // Jade Owl
  201: [{ type: 'profession', profession: 'Jewelcrafting' }],   // Sapphire Cub

  // ── Class-restricted pets ──
  138: [{ type: 'class', classes: ['Death Knight'] }],  // Mr. Bigglesworth (DK quest)

  // ── Reputation pets ──
  114: [{ type: 'reputation', factionId: 1015, factionName: 'Netherwing', standing: 'Exalted' }],
  128: [{ type: 'reputation', factionId: 1271, factionName: 'Order of the Cloud Serpent', standing: 'Exalted' }],
};

// ════════════════════════════════════════════════════════════════════
// TITLE REQUIREMENTS
// ════════════════════════════════════════════════════════════════════

export const TITLE_REQUIREMENTS: Record<number, CollectionReq[]> = {

  // ── Unobtainable PvP Titles (Legacy Ranking System) ──
  1:   [{ type: 'unobtainable', reason: 'Removed (Legacy PvP Rank 14)' }],  // Private / Scout
  2:   [{ type: 'unobtainable', reason: 'Removed (Legacy PvP Rank 14)' }],  // Corporal / Grunt
  3:   [{ type: 'unobtainable', reason: 'Removed (Legacy PvP Rank 14)' }],  // Sergeant
  4:   [{ type: 'unobtainable', reason: 'Removed (Legacy PvP Rank 14)' }],  // Master Sergeant / Senior Sergeant
  5:   [{ type: 'unobtainable', reason: 'Removed (Legacy PvP Rank 14)' }],  // Sergeant Major / First Sergeant
  6:   [{ type: 'unobtainable', reason: 'Removed (Legacy PvP Rank 14)' }],  // Knight / Stone Guard
  7:   [{ type: 'unobtainable', reason: 'Removed (Legacy PvP Rank 14)' }],  // Knight-Lieutenant / Blood Guard
  8:   [{ type: 'unobtainable', reason: 'Removed (Legacy PvP Rank 14)' }],  // Knight-Captain / Legionnaire
  9:   [{ type: 'unobtainable', reason: 'Removed (Legacy PvP Rank 14)' }],  // Knight-Champion / Centurion
  10:  [{ type: 'unobtainable', reason: 'Removed (Legacy PvP Rank 14)' }],  // Lieutenant Commander / Champion
  11:  [{ type: 'unobtainable', reason: 'Removed (Legacy PvP Rank 14)' }],  // Commander / Lieutenant General
  12:  [{ type: 'unobtainable', reason: 'Removed (Legacy PvP Rank 14)' }],  // Marshal / General
  13:  [{ type: 'unobtainable', reason: 'Removed (Legacy PvP Rank 14)' }],  // Field Marshal / Warlord
  14:  [{ type: 'unobtainable', reason: 'Removed (Legacy PvP Rank 14)' }],  // Grand Marshal / High Warlord

  // ── Removed Gladiator Titles ──
  42:  [{ type: 'unobtainable', reason: 'Gladiator Season 1' }],
  43:  [{ type: 'unobtainable', reason: 'Gladiator Season 2' }],
  44:  [{ type: 'unobtainable', reason: 'Gladiator Season 3' }],
  45:  [{ type: 'unobtainable', reason: 'Gladiator Season 4' }],
  62:  [{ type: 'unobtainable', reason: 'Gladiator Season 5' }],
  71:  [{ type: 'unobtainable', reason: 'Gladiator Season 6' }],
  72:  [{ type: 'unobtainable', reason: 'Gladiator Season 7' }],
  73:  [{ type: 'unobtainable', reason: 'Gladiator Season 8' }],

  // ── Removed raid titles ──
  122: [{ type: 'unobtainable', reason: 'Removed (Ahead of the Curve)' }],  // Cutting Edge titles rotate

  // ── Faction-specific titles ──
  15:  [{ type: 'unobtainable', reason: 'Removed (Scarab Lord — AQ Event)' }],  // Scarab Lord

  // ── Class-specific titles ──
  139: [{ type: 'class', classes: ['Death Knight'] }],   // Deathlord
  140: [{ type: 'class', classes: ['Demon Hunter'] }],   // Slayer
  141: [{ type: 'class', classes: ['Druid'] }],           // Archdruid
  142: [{ type: 'class', classes: ['Hunter'] }],          // Huntmaster
  143: [{ type: 'class', classes: ['Mage'] }],            // Archmage
  144: [{ type: 'class', classes: ['Monk'] }],            // Grandmaster
  145: [{ type: 'class', classes: ['Paladin'] }],         // Highlord
  146: [{ type: 'class', classes: ['Priest'] }],          // High Priest
  147: [{ type: 'class', classes: ['Rogue'] }],           // Shadowblade
  148: [{ type: 'class', classes: ['Shaman'] }],          // Farseer
  149: [{ type: 'class', classes: ['Warlock'] }],         // Netherlord
  150: [{ type: 'class', classes: ['Warrior'] }],         // Battlelord

  // ── Reputation titles ──
  47:  [{ type: 'reputation', factionId: 1119, factionName: 'The Sons of Hodir', standing: 'Exalted' }],  // might be wrong ID
  48:  [{ type: 'reputation', factionId: 978, factionName: 'Kurenai', standing: 'Exalted' }],  // of the Kurenai

  // ── Achievement titles ──
  74:  [{ type: 'achievement', achievementId: 2186, name: 'The Loremaster' }],   // Loremaster
  79:  [{ type: 'achievement', achievementId: 2798, name: 'Noble Gardener' }],   // The Noble
  130: [{ type: 'achievement', achievementId: 7520, name: 'The Undaunted' }],    // The Undaunted
};

// ════════════════════════════════════════════════════════════════════
// Shared check function
// ════════════════════════════════════════════════════════════════════

export function checkCollectionReqs(
  reqs: CollectionReq[] | undefined,
  charData: {
    className?: string | null;
    raceName?: string | null;
    faction?: string | null;
    reputations: Map<number, { name: string; standing: string }>;
    achievementIds: Set<number>;
    professions: Set<string>;
  },
): ReqCheck {
  if (!reqs) return { met: true, unmet: [], all: [] };

  const unmet: CollectionReq[] = [];

  for (const req of reqs) {
    switch (req.type) {
      case 'class':
        if (charData.className && !req.classes.includes(charData.className)) unmet.push(req);
        break;
      case 'race':
        if (charData.raceName && !req.races.includes(charData.raceName)) unmet.push(req);
        break;
      case 'profession': {
        if (!charData.professions.has(req.profession.toLowerCase())) unmet.push(req);
        break;
      }
      case 'reputation': {
        const rep = charData.reputations.get(req.factionId);
        if (!rep || !meetsStandingReq(rep.standing, req.standing)) unmet.push(req);
        break;
      }
      case 'achievement':
        if (!charData.achievementIds.has(req.achievementId)) unmet.push(req);
        break;
      case 'unobtainable':
        unmet.push(req);
        break;
      case 'covenant':
        break; // can't easily check
    }
  }

  return { met: unmet.length === 0, unmet, all: reqs };
}

export function describeReq(req: CollectionReq): string {
  switch (req.type) {
    case 'class':       return `${req.classes.join(' / ')} only`;
    case 'race':        return `${req.races.join(' / ')} only`;
    case 'profession':  return req.skill ? `${req.profession} (${req.skill})` : req.profession;
    case 'reputation':  return `${req.standing} — ${req.factionName}`;
    case 'achievement': return req.name;
    case 'unobtainable': return req.reason;
    case 'covenant':    return `${req.covenant} Covenant`;
    default:            return 'Unknown';
  }
}
