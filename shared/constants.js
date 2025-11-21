/**
 * Game configuration constants
 */

export const GAME_CONFIG = {
  MIN_PLAYERS: 4,
  MAX_PLAYERS: 6,
  MIN_BOT_PLAYERS: 3, // minimum total players including bots
  MAX_BOT_PLAYERS: 6, // maximum total players including bots
  STARTING_CARDS: 7,
  TURN_DURATION: 20, // seconds
  ROOM_ID_LENGTH: 6,
  MAX_CARD_LENGTH: 3, // for base word cards
};

export const POINTS = {
  // Points calculated by word length
  PER_CHARACTER: 1,
  CHALLENGE_PENALTY: 2,
};

export const AFFIX_LIST = [
  // Prefixes
  'me', 'mem', 'men', 'meng', 'meny',
  'di',
  'ke',
  'se',
  'ber', 'bel',
  'ter',
  'pe', 'pem', 'pen', 'peng', 'peny',
  'per',

  // Suffixes
  'kan',
  'i',
  'an',
  'nya',

  // Confixes (represented as separate parts)
  // per...an, ke...an will be formed by combining prefix + suffix
];

export const CARD_COLORS = {
  // Player hand colors
  BASE_WORD: '#22c55e',  // green-500 - base word fragments in hand
  AFFIX: '#fbbf24',      // yellow-400 - affixes (imbuhan)

  // Table colors (all cards on table are blue)
  TABLE_CARD: '#60a5fa'  // blue-400 - any card on table
};

export default {
  GAME_CONFIG,
  POINTS,
  AFFIX_LIST,
  CARD_COLORS
};

