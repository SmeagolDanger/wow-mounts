/**
 * Pre-built optimized mount farming route, modeled after SimpleArmory.
 *
 * Each step is either a TRAVEL instruction (no checkbox) or an INSTANCE
 * to run (with checkbox, boss, mount, and notes).
 *
 * The route is geographically optimized: travel steps tell you exactly
 * how to get from one instance to the next.
 *
 * mount_id values let us auto-hide steps for mounts the player already owns.
 */

export interface MountDrop {
  boss: string;
  mount: string;
  mount_id?: number;   // Blizzard mount ID — used to filter collected
  note?: string;
}

export interface RouteStep {
  type: 'travel' | 'instance';
  // Travel
  instruction?: string;     // e.g. "Fly to Dustwallow Marsh"
  // Instance
  instance?: string;        // e.g. "Vortex Pinnacle"
  instance_type?: 'dungeon' | 'raid';
  drops?: MountDrop[];
  reset?: 'daily' | 'weekly';
  expansion?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Alliance route — starts in Stormwind.
// Horde players can adapt (start Orgrimmar, portal equivalents).
// ────────────────────────────────────────────────────────────────────────────
export const MOUNT_ROUTE: RouteStep[] = [

  // ── Cataclysm (Uldum / Deepholm) ─────────────────────────────────────
  { type: 'travel', instruction: 'Portal to Uldum',                            expansion: 'Cataclysm' },
  { type: 'instance', instance: 'Vortex Pinnacle', instance_type: 'dungeon', reset: 'daily', expansion: 'Cataclysm',
    drops: [{ boss: 'Altairus', mount: 'Drake of the North Wind', mount_id: 395, note: 'Heroic 1x/day, Normal 10x/hr' }] },
  { type: 'instance', instance: 'Throne of the Four Winds', instance_type: 'raid', reset: 'weekly', expansion: 'Cataclysm',
    drops: [{ boss: "Al'Akir", mount: 'Drake of the South Wind', mount_id: 396 }] },

  // ── Classic (Kalimdor) ───────────────────────────────────────────────
  { type: 'travel', instruction: 'Fly to Dustwallow Marsh',                   expansion: 'Classic' },
  { type: 'instance', instance: "Onyxia's Lair", instance_type: 'raid', reset: 'weekly', expansion: 'Classic',
    drops: [{ boss: 'Onyxia', mount: 'Onyxian Drake', mount_id: 349 }] },

  // ── Classic (Eastern Kingdoms — Stormwind hub) ───────────────────────
  { type: 'travel', instruction: 'Hearthstone to Stormwind and Portal to Northrend Dalaran', expansion: 'WotLK' },

  // ── WotLK (Northrend) ───────────────────────────────────────────────
  { type: 'travel', instruction: 'Fly to Icecrown',                           expansion: 'WotLK' },
  { type: 'instance', instance: 'Icecrown Citadel', instance_type: 'raid', reset: 'weekly', expansion: 'WotLK',
    drops: [{ boss: 'The Lich King', mount: "Invincible's Reins", mount_id: 363, note: 'Heroic 25 only' }] },
  { type: 'travel', instruction: 'Fly to Wintergrasp',                        expansion: 'WotLK' },
  { type: 'instance', instance: 'Vault of Archavon', instance_type: 'raid', reset: 'weekly', expansion: 'WotLK',
    drops: [
      { boss: 'Koralon', mount: 'Grand Black War Mammoth', mount_id: 391 },
      { boss: 'Toravon', mount: 'Grand Black War Mammoth', mount_id: 391 },
      { boss: 'Archavon', mount: 'Grand Black War Mammoth', mount_id: 391 },
      { boss: 'Emalon', mount: 'Grand Black War Mammoth', mount_id: 391 },
    ] },
  { type: 'travel', instruction: 'Fly to Coldarra',                           expansion: 'WotLK' },
  { type: 'instance', instance: 'Eye of Eternity', instance_type: 'raid', reset: 'weekly', expansion: 'WotLK',
    drops: [{ boss: 'Malygos', mount: 'Azure Drake', mount_id: 394 }] },
  { type: 'travel', instruction: 'Fly to Howling Fjord',                      expansion: 'WotLK' },
  { type: 'instance', instance: 'Utgarde Pinnacle', instance_type: 'dungeon', reset: 'daily', expansion: 'WotLK',
    drops: [{ boss: 'Skadi the Ruthless', mount: 'Blue Proto-Drake', mount_id: 253, note: 'Heroic only' }] },
  { type: 'travel', instruction: 'Fly to Storm Peaks',                        expansion: 'WotLK' },
  { type: 'instance', instance: 'Ulduar', instance_type: 'raid', reset: 'weekly', expansion: 'WotLK',
    drops: [{ boss: 'Yogg-Saron', mount: "Mimiron's Head", mount_id: 304, note: 'Requires no watchers up' }] },

  // ── Back to Stormwind ────────────────────────────────────────────────
  { type: 'travel', instruction: 'Hearthstone to Stormwind',                  expansion: 'Cataclysm' },
  { type: 'travel', instruction: 'Portal to Caverns of Time',                 expansion: 'Cataclysm' },
  { type: 'instance', instance: 'Dragon Soul', instance_type: 'raid', reset: 'weekly', expansion: 'Cataclysm',
    drops: [
      { boss: 'Ultraxion', mount: 'Experiment 12-B', mount_id: 397 },
      { boss: 'Deathwing', mount: 'Blazing Drake', mount_id: 398 },
      { boss: 'Deathwing', mount: "Life-Binder's Handmaiden", mount_id: 399, note: 'Heroic only' },
    ] },

  // ── TBC (Shattrath hub) ─────────────────────────────────────────────
  { type: 'travel', instruction: 'Hearthstone to Stormwind and Portal to Shattrath', expansion: 'TBC' },
  { type: 'travel', instruction: 'Fly to Shattrath',                          expansion: 'TBC' },
  { type: 'travel', instruction: 'Portal to Isle of Quel\'Danas',             expansion: 'TBC' },

  // ── Classic (Eastern Plaguelands) ───────────────────────────────────
  { type: 'travel', instruction: 'Fly to Eastern Plaguelands',                expansion: 'Classic' },
  { type: 'instance', instance: 'Stratholme', instance_type: 'dungeon', reset: 'daily', expansion: 'Classic',
    drops: [{ boss: 'Baron Rivendare', mount: "Deathcharger's Reins", mount_id: 168 }] },
  { type: 'travel', instruction: 'Hearthstone to Stormwind',                  expansion: 'Classic' },

  // ── TBC (Outland) ───────────────────────────────────────────────────
  { type: 'travel', instruction: 'Fly to Blasted Lands, take Dark Portal to Outland', expansion: 'TBC' },
  { type: 'travel', instruction: 'Fly to Auchindoun',                         expansion: 'TBC' },
  { type: 'instance', instance: 'Sethekk Halls', instance_type: 'dungeon', reset: 'daily', expansion: 'TBC',
    drops: [{ boss: 'Anzu', mount: 'Raven Lord', mount_id: 185, note: 'Heroic only' }] },
  { type: 'travel', instruction: 'Fly to Netherstorm',                        expansion: 'TBC' },
  { type: 'instance', instance: 'Tempest Keep', instance_type: 'raid', reset: 'weekly', expansion: 'TBC',
    drops: [{ boss: "Kael'thas Sunstrider", mount: "Ashes of Al'ar", mount_id: 183 }] },
  { type: 'travel', instruction: 'Fly to Deadwind Pass (portal or fly)',      expansion: 'TBC' },
  { type: 'instance', instance: 'Karazhan', instance_type: 'raid', reset: 'weekly', expansion: 'TBC',
    drops: [{ boss: 'Attumen the Huntsman', mount: 'Fiery Warhorse', mount_id: 174 }] },

  // ── Cataclysm (Firelands / BWD / misc) ──────────────────────────────
  { type: 'travel', instruction: 'Hearthstone to Stormwind',                  expansion: 'Cataclysm' },
  { type: 'travel', instruction: 'Portal to Hyjal',                           expansion: 'Cataclysm' },
  { type: 'instance', instance: 'Firelands', instance_type: 'raid', reset: 'weekly', expansion: 'Cataclysm',
    drops: [
      { boss: 'Alysrazor', mount: 'Flametalon of Alysrazor', mount_id: 400 },
      { boss: 'Ragnaros', mount: 'Pureblood Fire Hawk', mount_id: 415, note: 'Heroic only' },
    ] },
  { type: 'travel', instruction: 'Fly to Deepholm portal (Stormwind) or fly to Stonecore', expansion: 'Cataclysm' },
  { type: 'instance', instance: 'The Stonecore', instance_type: 'dungeon', reset: 'daily', expansion: 'Cataclysm',
    drops: [{ boss: 'Slabhide', mount: 'Vitreous Stone Drake', mount_id: 401 }] },

  // ── Cataclysm (Northern Stranglethorn) ──────────────────────────────
  { type: 'travel', instruction: 'Fly to Northern Stranglethorn',             expansion: 'Cataclysm' },
  { type: 'instance', instance: "Zul'Gurub", instance_type: 'dungeon', reset: 'daily', expansion: 'Cataclysm',
    drops: [
      { boss: "Bloodlord Mandokir", mount: 'Armored Razzashi Raptor', mount_id: 410 },
      { boss: "High Priestess Kilnara", mount: 'Swift Zulian Panther', mount_id: 411 },
    ] },

  // ── MoP ─────────────────────────────────────────────────────────────
  { type: 'travel', instruction: 'Hearthstone to Stormwind and Portal to Pandaria', expansion: 'MoP' },
  { type: 'travel', instruction: "Fly to Mogu'shan Vaults (Kun-Lai Summit)", expansion: 'MoP' },
  { type: 'instance', instance: "Mogu'shan Vaults", instance_type: 'raid', reset: 'weekly', expansion: 'MoP',
    drops: [{ boss: 'Elegon', mount: 'Astral Cloud Serpent', mount_id: 478 }] },
  { type: 'travel', instruction: 'Fly to Isle of Thunder',                    expansion: 'MoP' },
  { type: 'instance', instance: 'Throne of Thunder', instance_type: 'raid', reset: 'weekly', expansion: 'MoP',
    drops: [
      { boss: 'Horridon', mount: 'Spawn of Horridon', mount_id: 531 },
      { boss: 'Ji-Kun', mount: 'Clutch of Ji-Kun', mount_id: 543 },
    ] },
  { type: 'travel', instruction: 'Fly to Vale of Eternal Blossoms',          expansion: 'MoP' },
  { type: 'instance', instance: 'Siege of Orgrimmar', instance_type: 'raid', reset: 'weekly', expansion: 'MoP',
    drops: [{ boss: 'Garrosh Hellscream', mount: "Kor'kron Juggernaut", mount_id: 559, note: 'Mythic only' }] },

  // ── WoD ─────────────────────────────────────────────────────────────
  { type: 'travel', instruction: 'Hearthstone to Stormwind and Portal to Ashran / Garrison', expansion: 'WoD' },
  { type: 'travel', instruction: 'Fly to Blackrock Foundry (Gorgrond)',       expansion: 'WoD' },
  { type: 'instance', instance: 'Blackrock Foundry', instance_type: 'raid', reset: 'weekly', expansion: 'WoD',
    drops: [{ boss: 'Blackhand', mount: 'Ironhoof Destroyer', mount_id: 613, note: 'Mythic only' }] },
  { type: 'travel', instruction: 'Fly to Hellfire Citadel (Tanaan Jungle)',   expansion: 'WoD' },
  { type: 'instance', instance: 'Hellfire Citadel', instance_type: 'raid', reset: 'weekly', expansion: 'WoD',
    drops: [{ boss: 'Archimonde', mount: 'Felsteel Annihilator', mount_id: 751, note: 'Mythic only' }] },

  // ── Legion ──────────────────────────────────────────────────────────
  { type: 'travel', instruction: 'Hearthstone to Stormwind and Portal to Legion Dalaran', expansion: 'Legion' },
  { type: 'travel', instruction: 'Fly to Return to Karazhan (Deadwind Pass)', expansion: 'Legion' },
  { type: 'instance', instance: 'Return to Karazhan', instance_type: 'dungeon', reset: 'daily', expansion: 'Legion',
    drops: [
      { boss: 'Attumen the Huntsman', mount: 'Midnight', mount_id: 875 },
      { boss: 'Nightbane (secret boss)', mount: 'Smoldering Ember Wyrm', mount_id: 876, note: 'Timed event' },
    ] },
  { type: 'travel', instruction: 'Fly to The Nighthold (Suramar)',           expansion: 'Legion' },
  { type: 'instance', instance: 'The Nighthold', instance_type: 'raid', reset: 'weekly', expansion: 'Legion',
    drops: [{ boss: "Gul'dan", mount: 'Felblaze Infernal', mount_id: 877 }] },
  { type: 'travel', instruction: 'Fly to Tomb of Sargeras (Broken Shore)',   expansion: 'Legion' },
  { type: 'instance', instance: 'Tomb of Sargeras', instance_type: 'raid', reset: 'weekly', expansion: 'Legion',
    drops: [{ boss: "Mistress Sassz'ine", mount: 'Abyss Worm', mount_id: 954 }] },
  { type: 'travel', instruction: 'Fly to Antorus (Argus)',                    expansion: 'Legion' },
  { type: 'instance', instance: 'Antorus, the Burning Throne', instance_type: 'raid', reset: 'weekly', expansion: 'Legion',
    drops: [
      { boss: 'Felhounds of Sargeras', mount: 'Antoran Charhound', mount_id: 971 },
      { boss: 'Argus the Unmaker', mount: "Shackled Ur'zul", mount_id: 954, note: 'Mythic only' },
    ] },

  // ── BfA ─────────────────────────────────────────────────────────────
  { type: 'travel', instruction: 'Hearthstone to Stormwind, take boat to Boralus', expansion: 'BfA' },
  { type: 'travel', instruction: 'Fly to Freehold (Tiragarde Sound)',         expansion: 'BfA' },
  { type: 'instance', instance: 'Freehold', instance_type: 'dungeon', reset: 'daily', expansion: 'BfA',
    drops: [{ boss: 'Harlan Sweete', mount: 'Sharkbait', mount_id: 1039, note: 'Mythic only' }] },
  { type: 'travel', instruction: "Fly to Kings' Rest (Zuldazar)",            expansion: 'BfA' },
  { type: 'instance', instance: "Kings' Rest", instance_type: 'dungeon', reset: 'daily', expansion: 'BfA',
    drops: [{ boss: 'King Dazar', mount: 'Tomb Stalker', mount_id: 1040, note: 'Mythic only' }] },
  { type: 'travel', instruction: 'Fly to The Underrot (Nazmir)',             expansion: 'BfA' },
  { type: 'instance', instance: 'The Underrot', instance_type: 'dungeon', reset: 'daily', expansion: 'BfA',
    drops: [{ boss: 'Unbound Abomination', mount: 'Underrot Crawg', mount_id: 1053, note: 'Mythic only' }] },
  { type: 'travel', instruction: "Fly to Battle of Dazar'alor",             expansion: 'BfA' },
  { type: 'instance', instance: "Battle of Dazar'alor", instance_type: 'raid', reset: 'weekly', expansion: 'BfA',
    drops: [
      { boss: 'High Tinker Mekkatorque', mount: 'G.M.O.D.', mount_id: 1205, note: 'Mythic only' },
      { boss: 'Lady Jaina Proudmoore', mount: 'Glacial Tidestorm', mount_id: 1206, note: 'Mythic only' },
    ] },
  { type: 'travel', instruction: "Fly to Ny'alotha entrance (Vale of Eternal Blossoms or Uldum)", expansion: 'BfA' },
  { type: 'instance', instance: "Ny'alotha, the Waking City", instance_type: 'raid', reset: 'weekly', expansion: 'BfA',
    drops: [{ boss: "N'Zoth the Corruptor", mount: "Ny'alotha Allseer", mount_id: 1293, note: 'Mythic only' }] },

  // ── Shadowlands ─────────────────────────────────────────────────────
  { type: 'travel', instruction: 'Hearthstone to Stormwind and Portal to Oribos', expansion: 'Shadowlands' },
  { type: 'travel', instruction: 'Fly to Sanctum of Domination (The Maw)',   expansion: 'Shadowlands' },
  { type: 'instance', instance: 'Sanctum of Domination', instance_type: 'raid', reset: 'weekly', expansion: 'Shadowlands',
    drops: [
      { boss: 'The Nine', mount: "Vengeance's Reins", mount_id: 1476, note: 'Mythic only' },
    ] },
  { type: 'travel', instruction: 'Fly to Sepulcher of the First Ones (Zereth Mortis)', expansion: 'Shadowlands' },
  { type: 'instance', instance: 'Sepulcher of the First Ones', instance_type: 'raid', reset: 'weekly', expansion: 'Shadowlands',
    drops: [{ boss: 'The Jailer', mount: 'Zereth Overseer', mount_id: 1587, note: 'Mythic only' }] },

  // ── Dragonflight ────────────────────────────────────────────────────
  { type: 'travel', instruction: 'Hearthstone to Stormwind and Portal to Valdrakken', expansion: 'Dragonflight' },
  { type: 'travel', instruction: 'Fly to Aberrus (Zaralek Cavern)',          expansion: 'Dragonflight' },
  { type: 'instance', instance: 'Aberrus, the Shadowed Crucible', instance_type: 'raid', reset: 'weekly', expansion: 'Dragonflight',
    drops: [{ boss: 'Echo of Neltharion', mount: 'Rusza\'luv, the Nightstalker', note: 'Mythic only' }] },
  { type: 'travel', instruction: 'Fly to Amirdrassil (Emerald Dream)',       expansion: 'Dragonflight' },
  { type: 'instance', instance: 'Amirdrassil, the Dream\'s Hope', instance_type: 'raid', reset: 'weekly', expansion: 'Dragonflight',
    drops: [{ boss: 'Fyrakk the Blazing', mount: "Anu'relos, Flame's Guidance", note: 'Mythic only' }] },

  // ── The War Within ──────────────────────────────────────────────────
  { type: 'travel', instruction: 'Hearthstone to Stormwind and Portal to Dornogal', expansion: 'The War Within' },
  { type: 'travel', instruction: 'Fly to Nerub-ar Palace (Azj-Kahet)',       expansion: 'The War Within' },
  { type: 'instance', instance: 'Nerub-ar Palace', instance_type: 'raid', reset: 'weekly', expansion: 'The War Within',
    drops: [{ boss: 'Queen Ansurek', mount: 'Sureki Skyrazor', note: 'Mythic only' }] },
  { type: 'travel', instruction: 'Fly to Liberation of Undermine',           expansion: 'The War Within' },
  { type: 'instance', instance: 'Liberation of Undermine', instance_type: 'raid', reset: 'weekly', expansion: 'The War Within',
    drops: [{ boss: 'Chrome King Gallywix', mount: 'The Big G', note: 'Mythic only' }] },

  // ── Done ────────────────────────────────────────────────────────────
  { type: 'travel', instruction: 'Hearthstone to Stormwind — Route Complete!', expansion: 'Done' },
];

// Expansion colors for section headers
export const EXP_COLORS: Record<string, string> = {
  Classic: '#D4A017', TBC: '#3CB371', WotLK: '#70B8FF', Cataclysm: '#FF6347',
  MoP: '#22C55E', WoD: '#B8860B', Legion: '#4ADE80', BfA: '#F59E0B',
  Shadowlands: '#9B6FFF', Dragonflight: '#22D3EE', 'The War Within': '#C084FC',
  Various: '#94A3B8', Done: '#4ADE80',
};
