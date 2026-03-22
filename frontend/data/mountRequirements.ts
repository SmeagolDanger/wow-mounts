/**
 * Mount requirement database — maps Blizzard mount IDs to their acquisition
 * requirements so Quick Wins can filter out mounts the player can't yet obtain.
 *
 * Categories:
 *  - class:        Only obtainable by specific classes
 *  - race:         Only obtainable by specific races (racial mounts)
 *  - profession:   Requires a specific profession (and optionally a skill level)
 *  - reputation:   Requires a specific faction standing
 *  - achievement:  Requires a specific achievement
 *  - unobtainable: No longer obtainable (removed, TCG, past promotions)
 *  - covenant:     Shadowlands covenant-specific
 *
 * This file can be extended over time. Run the app's mount index to find IDs.
 */

// ── Requirement types ────────────────────────────────────────────────

export interface ClassReq       { type: 'class';        classes: string[]; }
export interface RaceReq        { type: 'race';         races: string[]; }
export interface ProfessionReq  { type: 'profession';   profession: string; skill?: number; }
export interface ReputationReq  { type: 'reputation';   factionId: number; factionName: string; standing: string; }
export interface AchievementReq { type: 'achievement';  achievementId: number; name: string; }
export interface UnobtainableReq{ type: 'unobtainable'; reason: string; }
export interface CovenantReq    { type: 'covenant';     covenant: string; }

export type MountReq =
  | ClassReq | RaceReq | ProfessionReq | ReputationReq
  | AchievementReq | UnobtainableReq | CovenantReq;

// Standing hierarchy for comparison
export const STANDING_RANK: Record<string, number> = {
  'Hated': 0, 'Hostile': 1, 'Unfriendly': 2, 'Neutral': 3,
  'Friendly': 4, 'Honored': 5, 'Revered': 6, 'Exalted': 7,
};

export function meetsStandingReq(current: string | undefined, required: string): boolean {
  const cur = STANDING_RANK[current ?? ''] ?? -1;
  const req = STANDING_RANK[required] ?? 99;
  return cur >= req;
}

// ── Requirements database ────────────────────────────────────────────
// Key = Blizzard mount journal ID

export const MOUNT_REQUIREMENTS: Record<number, MountReq[]> = {

  // ════════════════════════════════════════════════════════════════════
  // CLASS-RESTRICTED MOUNTS
  // ════════════════════════════════════════════════════════════════════

  // ── Paladin ──
  84:  [{ type: 'class', classes: ['Paladin'] }],  // Warhorse
  149: [{ type: 'class', classes: ['Paladin'] }],  // Charger
  66:  [{ type: 'class', classes: ['Paladin'] }],  // White Ram (Dwarf Paladin)
  350: [{ type: 'class', classes: ['Paladin'] }],  // Sunwalker Kodo
  351: [{ type: 'class', classes: ['Paladin'] }],  // Great Sunwalker Kodo
  352: [{ type: 'class', classes: ['Paladin'] }],  // Exarch's Elekk
  353: [{ type: 'class', classes: ['Paladin'] }],  // Great Exarch's Elekk
  764: [{ type: 'class', classes: ['Paladin'] }],  // Thalassian Charger
  882: [{ type: 'class', classes: ['Paladin'] }],  // Highlord's Golden Charger (Legion class mount)
  883: [{ type: 'class', classes: ['Paladin'] }],  // Highlord's Vigilant Charger
  884: [{ type: 'class', classes: ['Paladin'] }],  // Highlord's Vengeful Charger

  // ── Warlock ──
  83:  [{ type: 'class', classes: ['Warlock'] }],  // Felsteed
  148: [{ type: 'class', classes: ['Warlock'] }],  // Dreadsteed
  898: [{ type: 'class', classes: ['Warlock'] }],  // Netherlord's Chaotic Wrathsteed (Legion)
  930: [{ type: 'class', classes: ['Warlock'] }],  // Netherlord's Brimstone Wrathsteed
  931: [{ type: 'class', classes: ['Warlock'] }],  // Netherlord's Accursed Wrathsteed

  // ── Death Knight ──
  221: [{ type: 'class', classes: ['Death Knight'] }],  // Acherus Deathcharger
  236: [{ type: 'class', classes: ['Death Knight'] }],  // Winged Steed of the Ebon Blade
  899: [{ type: 'class', classes: ['Death Knight'] }],  // Deathlord's Vilebrood Vanquisher (Legion)

  // ── Demon Hunter ──
  780: [{ type: 'class', classes: ['Demon Hunter'] }],  // Felsaber
  900: [{ type: 'class', classes: ['Demon Hunter'] }],  // Slayer's Felbroken Shrieker (Legion)

  // ── Mage ──
  885: [{ type: 'class', classes: ['Mage'] }],  // Archmage's Prismatic Disc (Legion)

  // ── Warrior ──
  886: [{ type: 'class', classes: ['Warrior'] }],  // Battlelord's Bloodthirsty War Wyrm (Legion)

  // ── Hunter ──
  887: [{ type: 'class', classes: ['Hunter'] }],  // Huntmaster's Loyal Wolfhawk (Legion)
  888: [{ type: 'class', classes: ['Hunter'] }],  // Huntmaster's Fierce Wolfhawk
  889: [{ type: 'class', classes: ['Hunter'] }],  // Huntmaster's Dire Wolfhawk

  // ── Monk ──
  890: [{ type: 'class', classes: ['Monk'] }],  // Ban-Lu, Grandmaster's Companion (Legion)

  // ── Priest ──
  891: [{ type: 'class', classes: ['Priest'] }],  // High Priest's Lightsworn Seeker (Legion)

  // ── Rogue ──
  892: [{ type: 'class', classes: ['Rogue'] }],  // Shadowblade's Murderous Omen (Legion)
  893: [{ type: 'class', classes: ['Rogue'] }],  // Shadowblade's Baneful Omen
  894: [{ type: 'class', classes: ['Rogue'] }],  // Shadowblade's Lethal Omen
  895: [{ type: 'class', classes: ['Rogue'] }],  // Shadowblade's Crimson Omen

  // ── Shaman ──
  896: [{ type: 'class', classes: ['Shaman'] }],  // Farseer's Raging Tempest (Legion)

  // ── Druid ──
  897: [{ type: 'class', classes: ['Druid'] }],  // Archdruid's Lunarwing Form (Legion)

  // ── Evoker ──
  1545: [{ type: 'class', classes: ['Evoker'] }],  // Winding Slitherdrake (DF — Evoker starting)

  // ════════════════════════════════════════════════════════════════════
  // PROFESSION-REQUIRED MOUNTS
  // ════════════════════════════════════════════════════════════════════

  // ── Engineering ──
  153: [{ type: 'profession', profession: 'Engineering', skill: 300 }],  // Flying Machine
  154: [{ type: 'profession', profession: 'Engineering', skill: 375 }],  // Turbo-Charged Flying Machine
  286: [{ type: 'profession', profession: 'Engineering' }],  // Mechano-Hog
  287: [{ type: 'profession', profession: 'Engineering' }],  // Mekgineer's Chopper
  522: [{ type: 'profession', profession: 'Engineering' }],  // Sky Golem
  772: [{ type: 'profession', profession: 'Engineering' }],  // Depleted-Kyparium Rocket
  773: [{ type: 'profession', profession: 'Engineering' }],  // Geosynchronous World Spinner

  // ── Tailoring ──
  155: [{ type: 'profession', profession: 'Tailoring', skill: 300 }],   // Flying Carpet
  213: [{ type: 'profession', profession: 'Tailoring', skill: 425 }],   // Magnificent Flying Carpet
  214: [{ type: 'profession', profession: 'Tailoring', skill: 425 }],   // Frosty Flying Carpet
  521: [{ type: 'profession', profession: 'Tailoring' }],               // Creeping Carpet

  // ── Alchemy ──
  407: [{ type: 'profession', profession: 'Alchemy', skill: 525 }],  // Sandstone Drake (Vial of the Sands)

  // ── Jewelcrafting ──
  517: [{ type: 'profession', profession: 'Jewelcrafting' }],  // Jeweled Onyx Panther
  518: [{ type: 'profession', profession: 'Jewelcrafting' }],  // Sapphire Panther
  519: [{ type: 'profession', profession: 'Jewelcrafting' }],  // Ruby Panther
  520: [{ type: 'profession', profession: 'Jewelcrafting' }],  // Sunstone Panther
  516: [{ type: 'profession', profession: 'Jewelcrafting' }],  // Jade Panther

  // ── Leatherworking ──
  614: [{ type: 'profession', profession: 'Leatherworking' }],  // Dustmane Direwolf (WoD)
  842: [{ type: 'profession', profession: 'Leatherworking' }],  // Elderhorn Riding Moose (Legion)

  // ── Blacksmithing ──
  615: [{ type: 'profession', profession: 'Blacksmithing' }],  // Steelbound Devourer (Legion)

  // ════════════════════════════════════════════════════════════════════
  // REPUTATION MOUNTS
  // ════════════════════════════════════════════════════════════════════

  // ── Burning Crusade ──
  185: [{ type: 'reputation', factionId: 1015, factionName: 'Netherwing', standing: 'Exalted' }],  // Netherwing Drake (Azure)
  186: [{ type: 'reputation', factionId: 1015, factionName: 'Netherwing', standing: 'Exalted' }],  // Netherwing Drake (Cobalt)
  187: [{ type: 'reputation', factionId: 1015, factionName: 'Netherwing', standing: 'Exalted' }],  // Netherwing Drake (Onyx)
  188: [{ type: 'reputation', factionId: 1015, factionName: 'Netherwing', standing: 'Exalted' }],  // Netherwing Drake (Purple)
  189: [{ type: 'reputation', factionId: 1015, factionName: 'Netherwing', standing: 'Exalted' }],  // Netherwing Drake (Veridian)
  190: [{ type: 'reputation', factionId: 1015, factionName: 'Netherwing', standing: 'Exalted' }],  // Netherwing Drake (Violet)
  191: [{ type: 'reputation', factionId: 1031, factionName: "Sha'tari Skyguard", standing: 'Exalted' }],  // Blue Riding Nether Ray
  192: [{ type: 'reputation', factionId: 1031, factionName: "Sha'tari Skyguard", standing: 'Exalted' }],  // Green Riding Nether Ray
  193: [{ type: 'reputation', factionId: 1031, factionName: "Sha'tari Skyguard", standing: 'Exalted' }],  // Purple Riding Nether Ray
  194: [{ type: 'reputation', factionId: 1031, factionName: "Sha'tari Skyguard", standing: 'Exalted' }],  // Red Riding Nether Ray
  195: [{ type: 'reputation', factionId: 1031, factionName: "Sha'tari Skyguard", standing: 'Exalted' }],  // Silver Riding Nether Ray
  196: [{ type: 'reputation', factionId: 942, factionName: 'Cenarion Expedition', standing: 'Exalted' }],  // Cenarion War Hippogryph
  // Kurenai / Mag'har talbuks
  179: [{ type: 'reputation', factionId: 978, factionName: 'Kurenai', standing: 'Exalted' }],  // Cobalt Riding Talbuk (Alliance)
  180: [{ type: 'reputation', factionId: 978, factionName: 'Kurenai', standing: 'Exalted' }],  // Silver Riding Talbuk (Alliance)
  181: [{ type: 'reputation', factionId: 978, factionName: 'Kurenai', standing: 'Exalted' }],  // Tan Riding Talbuk (Alliance)
  182: [{ type: 'reputation', factionId: 978, factionName: 'Kurenai', standing: 'Exalted' }],  // White Riding Talbuk (Alliance)
  183: [{ type: 'reputation', factionId: 941, factionName: "The Mag'har", standing: 'Exalted' }],  // Cobalt Riding Talbuk (Horde)
  184: [{ type: 'reputation', factionId: 941, factionName: "The Mag'har", standing: 'Exalted' }],  // Dark Riding Talbuk (Horde)

  // ── Wrath of the Lich King ──
  265: [{ type: 'reputation', factionId: 1119, factionName: 'The Sons of Hodir', standing: 'Revered' }],  // Ice Mammoth
  268: [{ type: 'reputation', factionId: 1119, factionName: 'The Sons of Hodir', standing: 'Exalted' }],  // Grand Ice Mammoth
  248: [{ type: 'reputation', factionId: 1091, factionName: 'The Wyrmrest Accord', standing: 'Exalted' }],  // Red Drake

  // ── Cataclysm ──
  401: [{ type: 'reputation', factionId: 1173, factionName: 'Ramkahen', standing: 'Exalted' }],  // Brown Riding Camel
  402: [{ type: 'reputation', factionId: 1173, factionName: 'Ramkahen', standing: 'Exalted' }],  // Tan Riding Camel
  388: [{ type: 'reputation', factionId: 1172, factionName: 'Dragonmaw Clan', standing: 'Exalted' }],  // Bloodbathed Frostbrood Vanquisher — err, Vicious War Wolf? Check IDs
  389: [{ type: 'reputation', factionId: 1174, factionName: 'Wildhammer Clan', standing: 'Exalted' }],  // Drake of the West Wind-ish

  // ── Mists of Pandaria ──
  466: [{ type: 'reputation', factionId: 1269, factionName: 'Golden Lotus', standing: 'Exalted' }],  // Azure Riding Crane
  467: [{ type: 'reputation', factionId: 1269, factionName: 'Golden Lotus', standing: 'Exalted' }],  // Golden Riding Crane
  468: [{ type: 'reputation', factionId: 1269, factionName: 'Golden Lotus', standing: 'Exalted' }],  // Regal Riding Crane
  471: [{ type: 'reputation', factionId: 1337, factionName: 'The Klaxxi', standing: 'Exalted' }],  // Amber Scorpion
  469: [{ type: 'reputation', factionId: 1270, factionName: 'Shado-Pan', standing: 'Exalted' }],  // Blue Shado-Pan Riding Tiger
  470: [{ type: 'reputation', factionId: 1270, factionName: 'Shado-Pan', standing: 'Exalted' }],  // Green Shado-Pan Riding Tiger
  472: [{ type: 'reputation', factionId: 1270, factionName: 'Shado-Pan', standing: 'Exalted' }],  // Red Shado-Pan Riding Tiger
  473: [{ type: 'reputation', factionId: 1341, factionName: 'The August Celestials', standing: 'Exalted' }],  // Thundering August Cloud Serpent
  439: [{ type: 'reputation', factionId: 1271, factionName: 'Order of the Cloud Serpent', standing: 'Exalted' }],  // Azure Cloud Serpent
  440: [{ type: 'reputation', factionId: 1271, factionName: 'Order of the Cloud Serpent', standing: 'Exalted' }],  // Golden Cloud Serpent
  441: [{ type: 'reputation', factionId: 1271, factionName: 'Order of the Cloud Serpent', standing: 'Exalted' }],  // Jade Cloud Serpent

  // ── Legion ──
  839: [{ type: 'reputation', factionId: 1859, factionName: 'The Nightfallen', standing: 'Exalted' }],  // Arcanist's Manasaber
  905: [{ type: 'reputation', factionId: 2170, factionName: 'Argussian Reach', standing: 'Exalted' }],  // Darkforged Raven
  906: [{ type: 'reputation', factionId: 2165, factionName: 'Army of the Light', standing: 'Exalted' }],  // Lightforged Warframe

  // ── Battle for Azeroth ──
  960: [{ type: 'reputation', factionId: 2159, factionName: 'Proudmoore Admiralty', standing: 'Exalted' }],  // Proudmoore Sea Scout
  963: [{ type: 'reputation', factionId: 2162, factionName: "Storm's Wake", standing: 'Exalted' }],  // Storm's Wake Coastwatcher
  966: [{ type: 'reputation', factionId: 2160, factionName: 'Order of Embers', standing: 'Exalted' }],  // Smoky Charger
  955: [{ type: 'reputation', factionId: 2157, factionName: 'The Honorbound', standing: 'Exalted' }],  // Mag'har Direwolf
  958: [{ type: 'reputation', factionId: 2156, factionName: 'Talanji\'s Expedition', standing: 'Exalted' }],  // Expedition Bloodswarmer
  961: [{ type: 'reputation', factionId: 2158, factionName: 'Voldunai', standing: 'Exalted' }],  // Alabaster Hyena
  964: [{ type: 'reputation', factionId: 2103, factionName: 'Zandalari Empire', standing: 'Exalted' }],  // Zandalari Direhorn
  1008: [{ type: 'reputation', factionId: 2391, factionName: 'Rustbolt Resistance', standing: 'Exalted' }],  // Rustbolt Resistor

  // ── Shadowlands ──
  1370: [{ type: 'covenant', covenant: 'Kyrian' }],  // Phalynx of Loyalty
  1371: [{ type: 'covenant', covenant: 'Venthyr' }],  // Sinrunner Blanchy
  1372: [{ type: 'covenant', covenant: 'Night Fae' }],  // Enchanted Dreamlight Runestag
  1373: [{ type: 'covenant', covenant: 'Necrolord' }],  // Armored Bonehoof Tauralus

  // ════════════════════════════════════════════════════════════════════
  // ACHIEVEMENT MOUNTS
  // ════════════════════════════════════════════════════════════════════
  271: [{ type: 'achievement', achievementId: 2536, name: 'Mountain o\' Mounts (A)' }],   // Albino Drake
  311: [{ type: 'achievement', achievementId: 2537, name: 'Mountain o\' Mounts (H)' }],   // Albino Drake
  451: [{ type: 'achievement', achievementId: 7860, name: 'We\'re Going to Need More Saddles' }],  // Armored Dragonhawk
  619: [{ type: 'achievement', achievementId: 9598, name: 'Mountacular' }],  // Felfire Hawk
  876: [{ type: 'achievement', achievementId: 12934, name: 'Lord of the Reins' }],  // Lord of the Reins mount
  302: [{ type: 'achievement', achievementId: 2143, name: 'Leading the Cavalry' }],  // Albino Drake
  409: [{ type: 'achievement', achievementId: 4602, name: 'Glory of the Cataclysm Hero' }],  // Volcanic Stone Drake
  429: [{ type: 'achievement', achievementId: 6169, name: 'Glory of the Dragon Soul Raider' }],  // Twilight Harbinger
  410: [{ type: 'achievement', achievementId: 4603, name: 'Glory of the Cataclysm Raider' }],  // Drake of the East Wind
  312: [{ type: 'achievement', achievementId: 2136, name: 'Glory of the Hero' }],  // Red Proto-Drake
  314: [{ type: 'achievement', achievementId: 2137, name: 'Glory of the Raider (10)' }],  // Plagued Proto-Drake
  315: [{ type: 'achievement', achievementId: 2138, name: 'Glory of the Raider (25)' }],  // Black Proto-Drake
  375: [{ type: 'achievement', achievementId: 4156, name: 'Glory of the Icecrown Raider (10)' }],  // Bloodbathed Frostbrood Vanquisher
  376: [{ type: 'achievement', achievementId: 4157, name: 'Glory of the Icecrown Raider (25)' }],  // Icebound Frostbrood Vanquisher

  // ════════════════════════════════════════════════════════════════════
  // UNOBTAINABLE MOUNTS
  // ════════════════════════════════════════════════════════════════════

  // ── TCG / Loot Card ──
  253: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],  // X-51 Nether-Rocket
  254: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],  // X-51 Nether-Rocket X-TREME
  246: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],  // Spectral Tiger
  247: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],  // Swift Spectral Tiger
  266: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],  // Magic Rooster Egg
  270: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],  // Big Battle Bear
  344: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],  // Wooly White Rhino
  390: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],  // Savage Raptor
  371: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],  // Blazing Hippogryph
  335: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],  // Corrupted Hippogryph
  334: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],  // Ghastly Charger
  455: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],  // White Riding Camel
  458: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],  // Feldrake
  559: [{ type: 'unobtainable', reason: 'TCG Loot Card' }],  // Ghastly Charger's Skull

  // ── Collector's Edition / Promo ──
  85:  [{ type: 'unobtainable', reason: 'Collector\'s Edition (Vanilla)' }],  // Swift Zhevra

  // ── Removed from Game ──
  238: [{ type: 'unobtainable', reason: 'Removed (Naxx 40-man)' }],  // Black Proto-Drake (if removed)
  145: [{ type: 'unobtainable', reason: 'Removed (Old PvP system)' }],  // Black Qiraji Battle Tank — removed
  164: [{ type: 'unobtainable', reason: 'Removed (Amani War Bear)' }],  // Amani War Bear

  // ── Gladiator Mounts (season-specific, no longer obtainable) ──
  237: [{ type: 'unobtainable', reason: 'Gladiator Season Reward' }],  // Merciless Nether Drake
  239: [{ type: 'unobtainable', reason: 'Gladiator Season Reward' }],  // Vengeful Nether Drake
  240: [{ type: 'unobtainable', reason: 'Gladiator Season Reward' }],  // Brutal Nether Drake
  241: [{ type: 'unobtainable', reason: 'Gladiator Season Reward' }],  // Deadly Gladiator's Frost Wyrm
  242: [{ type: 'unobtainable', reason: 'Gladiator Season Reward' }],  // Furious Gladiator's Frost Wyrm
  243: [{ type: 'unobtainable', reason: 'Gladiator Season Reward' }],  // Relentless Gladiator's Frost Wyrm
  244: [{ type: 'unobtainable', reason: 'Gladiator Season Reward' }],  // Wrathful Gladiator's Frost Wyrm
  356: [{ type: 'unobtainable', reason: 'Gladiator Season Reward' }],  // Vicious Gladiator's Twilight Drake

  // ── Blizzcon / Virtual Ticket ──
  477: [{ type: 'unobtainable', reason: 'BlizzCon 2013' }],  // Hearthsteed
  340: [{ type: 'unobtainable', reason: 'BlizzCon' }],  // Murkimus — pet not mount; adjust

  // ════════════════════════════════════════════════════════════════════
  // RACE-RESTRICTED MOUNTS (Racial mounts — vendor)
  // These are available to all races at Exalted with the racial faction,
  // but by default only the race's own faction sells them cheaply.
  // We mark them as needing the reputation so Quick Wins knows.
  // ════════════════════════════════════════════════════════════════════

  // ── Alliance Racial Mounts ──
  // Human (Stormwind – faction 72)
  1:  [{ type: 'reputation', factionId: 72, factionName: 'Stormwind', standing: 'Exalted' }],
  2:  [{ type: 'reputation', factionId: 72, factionName: 'Stormwind', standing: 'Exalted' }],
  5:  [{ type: 'reputation', factionId: 72, factionName: 'Stormwind', standing: 'Exalted' }],
  6:  [{ type: 'reputation', factionId: 72, factionName: 'Stormwind', standing: 'Exalted' }],
  // Dwarf (Ironforge – faction 47)
  34: [{ type: 'reputation', factionId: 47, factionName: 'Ironforge', standing: 'Exalted' }],
  35: [{ type: 'reputation', factionId: 47, factionName: 'Ironforge', standing: 'Exalted' }],
  36: [{ type: 'reputation', factionId: 47, factionName: 'Ironforge', standing: 'Exalted' }],
  37: [{ type: 'reputation', factionId: 47, factionName: 'Ironforge', standing: 'Exalted' }],
  // Night Elf (Darnassus – faction 69)
  42: [{ type: 'reputation', factionId: 69, factionName: 'Darnassus', standing: 'Exalted' }],
  43: [{ type: 'reputation', factionId: 69, factionName: 'Darnassus', standing: 'Exalted' }],
  44: [{ type: 'reputation', factionId: 69, factionName: 'Darnassus', standing: 'Exalted' }],
  45: [{ type: 'reputation', factionId: 69, factionName: 'Darnassus', standing: 'Exalted' }],
  // Gnome (Gnomeregan – faction 54)
  55: [{ type: 'reputation', factionId: 54, factionName: 'Gnomeregan', standing: 'Exalted' }],
  56: [{ type: 'reputation', factionId: 54, factionName: 'Gnomeregan', standing: 'Exalted' }],
  57: [{ type: 'reputation', factionId: 54, factionName: 'Gnomeregan', standing: 'Exalted' }],
  // Draenei (Exodar – faction 930)
  152: [{ type: 'reputation', factionId: 930, factionName: 'Exodar', standing: 'Exalted' }],
  147: [{ type: 'reputation', factionId: 930, factionName: 'Exodar', standing: 'Exalted' }],

  // ── Horde Racial Mounts ──
  // Orc (Orgrimmar – faction 76)
  12: [{ type: 'reputation', factionId: 76, factionName: 'Orgrimmar', standing: 'Exalted' }],
  13: [{ type: 'reputation', factionId: 76, factionName: 'Orgrimmar', standing: 'Exalted' }],
  14: [{ type: 'reputation', factionId: 76, factionName: 'Orgrimmar', standing: 'Exalted' }],
  // Undead (Undercity – faction 68)
  17: [{ type: 'reputation', factionId: 68, factionName: 'Undercity', standing: 'Exalted' }],
  18: [{ type: 'reputation', factionId: 68, factionName: 'Undercity', standing: 'Exalted' }],
  19: [{ type: 'reputation', factionId: 68, factionName: 'Undercity', standing: 'Exalted' }],
  // Tauren (Thunder Bluff – faction 81)
  25: [{ type: 'reputation', factionId: 81, factionName: 'Thunder Bluff', standing: 'Exalted' }],
  26: [{ type: 'reputation', factionId: 81, factionName: 'Thunder Bluff', standing: 'Exalted' }],
  27: [{ type: 'reputation', factionId: 81, factionName: 'Thunder Bluff', standing: 'Exalted' }],
  // Troll (Darkspear Trolls – faction 530)
  29: [{ type: 'reputation', factionId: 530, factionName: 'Darkspear Trolls', standing: 'Exalted' }],
  30: [{ type: 'reputation', factionId: 530, factionName: 'Darkspear Trolls', standing: 'Exalted' }],
  31: [{ type: 'reputation', factionId: 530, factionName: 'Darkspear Trolls', standing: 'Exalted' }],
  // Blood Elf (Silvermoon City – faction 911)
  160: [{ type: 'reputation', factionId: 911, factionName: 'Silvermoon City', standing: 'Exalted' }],
  161: [{ type: 'reputation', factionId: 911, factionName: 'Silvermoon City', standing: 'Exalted' }],
  162: [{ type: 'reputation', factionId: 911, factionName: 'Silvermoon City', standing: 'Exalted' }],
};

// ── Helper: check if a character meets all requirements for a mount ──

export interface RequirementCheck {
  met: boolean;
  unmet: MountReq[];       // requirements that are NOT met
  all: MountReq[];         // all requirements
}

export function checkMountRequirements(
  mountId: number,
  charData: {
    className?: string | null;
    raceName?: string | null;
    faction?: string | null;
    reputations: Map<number, { name: string; standing: string }>;
    achievementIds: Set<number>;
    professions: Set<string>;
  },
): RequirementCheck {
  const reqs = MOUNT_REQUIREMENTS[mountId];
  if (!reqs) return { met: true, unmet: [], all: [] };

  const unmet: MountReq[] = [];

  for (const req of reqs) {
    switch (req.type) {
      case 'class':
        if (charData.className && !req.classes.includes(charData.className)) unmet.push(req);
        break;
      case 'race':
        if (charData.raceName && !req.races.includes(charData.raceName)) unmet.push(req);
        break;
      case 'profession': {
        const has = charData.professions.has(req.profession.toLowerCase());
        if (!has) unmet.push(req);
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
        unmet.push(req); // always unmet — can't get it
        break;
      case 'covenant':
        // Can't easily check covenant — let it through
        break;
    }
  }

  return { met: unmet.length === 0, unmet, all: reqs };
}

// ── Describe an unmet requirement for display ──

export function describeRequirement(req: MountReq): string {
  switch (req.type) {
    case 'class':       return `${req.classes.join(' / ')} only`;
    case 'race':        return `${req.races.join(' / ')} only`;
    case 'profession':  return req.skill ? `${req.profession} (${req.skill})` : req.profession;
    case 'reputation':  return `${req.standing} — ${req.factionName}`;
    case 'achievement': return req.name;
    case 'unobtainable': return req.reason;
    case 'covenant':    return `${req.covenant} Covenant`;
    default:            return 'Unknown requirement';
  }
}
