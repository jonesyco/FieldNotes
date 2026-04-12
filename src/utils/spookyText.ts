const TITLE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bpark\b/gi, 'graveyard'],
  [/\bgarden\b/gi, 'poison garden'],
  [/\bbridge\b/gi, 'widow bridge'],
  [/\bcafe\b/gi, 'phantom parlor'],
  [/\bcoffee\b/gi, 'midnight brew'],
  [/\blibrary\b/gi, 'forbidden archive'],
  [/\bbookstore\b/gi, 'candlelit archive'],
  [/\bschool\b/gi, 'night academy'],
  [/\bmarket\b/gi, 'shadow market'],
  [/\bshop\b/gi, 'curio crypt'],
  [/\btrail\b/gi, 'whisper trail'],
  [/\bhouse\b/gi, 'manor'],
  [/\bhall\b/gi, 'hall of echoes'],
  [/\bhotel\b/gi, 'mourning house'],
  [/\btheater\b/gi, 'phantom theater'],
  [/\btheatre\b/gi, 'phantom theatre'],
  [/\bchurch\b/gi, 'moon chapel'],
  [/\bpoint\b/gi, 'omen point'],
  [/\bview\b/gi, 'eclipse view'],
  [/\bplaza\b/gi, 'ash plaza'],
  [/\bstation\b/gi, 'last station'],
  [/\bbar\b/gi, 'hex bar'],
  [/\bpub\b/gi, 'blackened pub'],
  [/\bcenter\b/gi, 'hollow center'],
  [/\bcentre\b/gi, 'hollow centre'],
];

const NEIGHBORHOOD_REPLACEMENTS: Array<[RegExp, string]> = [
  [/^Old Town$/i, 'Dead Town'],
  [/^Pearl District$/i, 'Bone District'],
  [/^Downtown$/i, 'Sunken Core'],
  [/^Northwest$/i, 'North Wastes'],
  [/^Nob Hill$/i, 'Knell Hill'],
  [/^North Portland$/i, 'North Hollow'],
  [/^North Mississippi$/i, 'North Mistissippi'],
  [/^Northeast$/i, 'Northeast Gloom'],
  [/^Alberta Arts District$/i, 'Alberta Haunts District'],
  [/^Dekum Triangle$/i, 'Dekum Hexangle'],
  [/^Inner SE$/i, 'Inner Shade East'],
  [/^Southeast$/i, 'Southeast Shadows'],
  [/^SE Division$/i, 'SE Divination'],
  [/^SE Hawthorne$/i, 'SE Hawthornes'],
  [/^South Waterfront$/i, 'Blackwater Front'],
  [/^West Hills$/i, 'Witch Hills'],
  [/^Sauvie Island$/i, 'Sorrow Isle'],
  [/^Columbia Gorge$/i, 'Columbia Gloom'],
  [/^Airport$/i, 'Last Departure'],
  [/^Other$/i, 'Elsewhere'],
];

const SPOOKY_PREFIXES = [
  'Bleak',
  'Crooked',
  'Dread',
  'Forsaken',
  'Grim',
  'Hollow',
  'Mourning',
  'Phantom',
  'Wicked',
  'Withered',
];

const NEIGHBORHOOD_PREFIXES = [
  'Ashen',
  'Fogbound',
  'Gloaming',
  'Hushed',
  'Moonless',
  'Ruinous',
  'Shadow',
  'Sunken',
];

const SPOOKY_MARKER_GLYPHS = ['☠', '⚰', '🕯', '✟', '⛓'];

const LANDMARK_GLYPHS: Array<{ pattern: RegExp; glyph: string }> = [
  { pattern: /coffee|cafe|espresso|roast|tea|brew/i, glyph: '🕯' },
  { pattern: /bar|pub|tavern|cocktail|brewery/i, glyph: '🍷' },
  { pattern: /park|garden|trail|forest|grove|arboretum|outdoor/i, glyph: '🪦' },
  { pattern: /bridge|river|water|lake|harbor|harbour|dock/i, glyph: '⛓' },
  { pattern: /library|books?|archive|museum/i, glyph: '📜' },
  { pattern: /church|chapel|cathedral|shrine/i, glyph: '✟' },
  { pattern: /hotel|house|inn|manor|lodge/i, glyph: '⚰' },
  { pattern: /market|shop|store|boutique/i, glyph: '🗝' },
  { pattern: /theater|theatre|cinema|film|music|stage/i, glyph: '🎭' },
  { pattern: /school|college|academy|campus/i, glyph: '🕮' },
  { pattern: /station|train|airport|terminal/i, glyph: '🚪' },
  { pattern: /point|view|lookout|summit|hill/i, glyph: '🌒' },
];

function hashText(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function preserveCase(source: string, replacement: string): string {
  if (source === source.toUpperCase()) return replacement.toUpperCase();
  if (source[0] === source[0].toUpperCase()) {
    return replacement.replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return replacement.toLowerCase();
}

function applyReplacements(value: string, replacements: Array<[RegExp, string]>): string {
  return replacements.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, (match) => preserveCase(match, replacement)),
    value
  );
}

export function toSpookyTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return 'Nameless Hollow';

  const replaced = applyReplacements(trimmed, TITLE_REPLACEMENTS);
  if (replaced !== trimmed) return replaced;

  const prefix = SPOOKY_PREFIXES[hashText(trimmed) % SPOOKY_PREFIXES.length];
  return `${prefix} ${trimmed}`;
}

export function toSpookyNeighborhood(neighborhood: string): string {
  const trimmed = neighborhood.trim();
  if (!trimmed) return 'Elsewhere';

  const replaced = applyReplacements(trimmed, NEIGHBORHOOD_REPLACEMENTS);
  if (replaced !== trimmed) return replaced;

  const prefix = NEIGHBORHOOD_PREFIXES[hashText(trimmed) % NEIGHBORHOOD_PREFIXES.length];
  return `${prefix} ${trimmed}`;
}

export function getDisplayTitle(title: string, upsideDownMode: boolean): string {
  return upsideDownMode ? toSpookyTitle(title) : title;
}

export function getDisplayNeighborhood(neighborhood: string, upsideDownMode: boolean): string {
  return upsideDownMode ? toSpookyNeighborhood(neighborhood) : neighborhood;
}

export function getSpookyMarkerGlyph(seed: string, tags: string[] = []): string {
  const searchable = `${seed} ${tags.join(' ')}`.trim();
  const matched = LANDMARK_GLYPHS.find(({ pattern }) => pattern.test(searchable));
  if (matched) return matched.glyph;
  return SPOOKY_MARKER_GLYPHS[hashText(searchable) % SPOOKY_MARKER_GLYPHS.length];
}