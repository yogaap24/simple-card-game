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
	SINGLE_LETTER_PROBABILITY: 0.2, // 20% chance untuk 1 huruf
};

export const POINTS = {
	// Points calculated by word length
	PER_CHARACTER: 1,
	CHALLENGE_PENALTY: 2,
	WRONG_CHALLENGE_PENALTY: 2, // -2 poin jika challenge salah
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

// Syllables untuk 2 huruf
export const SYLLABLES = [
	"BA", "BI", "BU", "BE", "BO",
	"CA", "CI", "CU", "CE", "CO",
	"DA", "DI", "DU", "DE", "DO",
	"FA", "FI", "FU", "FE", "FO",
	"GA", "GI", "GU", "GE", "GO",
	"HA", "HI", "HU", "HE", "HO",
	"JA", "JI", "JU", "JE", "JO",
	"KA", "KI", "KU", "KE", "KO",
	"LA", "LI", "LU", "LE", "LO",
	"MA", "MI", "MU", "ME", "MO",
	"NA", "NI", "NU", "NE", "NO",
	"PA", "PI", "PU", "PE", "PO",
	"QA", "QI", "QU", "QE", "QO",
	"RA", "RI", "RU", "RE", "RO",
	"SA", "SI", "SU", "SE", "SO",
	"TA", "TI", "TU", "TE", "TO",
	"VA", "VI", "VU", "VE", "VO",
	"WA", "WI", "WU", "WE", "WO",
	"XA", "XI", "XU", "XE", "XO",
	"YA", "YI", "YU", "YE", "YO",
	"ZA", "ZI", "ZU", "ZE", "ZO",
	"AB", "AC", "AD", "AF", "AG",
	"AH", "AJ", "AK", "AL", "AM",
	"AN", "AP", "AQ", "AR", "AS",
	"AT", "AV", "AW", "AX", "AY",
	"AZ", "IB", "IC", "ID", "IF",
	"IG", "IH", "IJ", "IK", "IL",
	"IM", "IN", "IP", "IQ", "IR",
	"IS", "IT", "IV", "IW", "IX",
	"IY", "IZ", "UB", "UC", "UD",
	"UF", "UG", "UH", "UJ", "UK",
	"UL", "UM", "UN", "UP", "UQ",
	"UR", "US", "UT", "UV", "UW",
	"UX", "UY", "UZ", "EB", "EC",
	"ED", "EF", "EG", "EH", "EJ",
	"EK", "EL", "EM", "EN", "EP",
	"EQ", "ER", "ES", "ET", "EV",
	"EW", "EX", "EY", "EZ", "OB",
	"OC", "OD", "OF", "OG", "OH",
	"OJ", "OK", "OL", "OM", "ON",
	"OP", "OQ", "OR", "OS", "OT",
	"OV", "OW", "OX", "OY", "OZ"
];

// Alfabet untuk 1 huruf
export const ALPHABET = [
	"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
	"N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
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
	SYLLABLES,
	ALPHABET,
	CARD_COLORS
};

