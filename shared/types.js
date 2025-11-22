/**
 * Shared type definitions and constants for the card game
 * Using JSDoc comments for type hints (beginner-friendly alternative to TypeScript)
 */

// Card Types
export const CardType = {
	BASE_WORD: 'BASE_WORD',    // Base word fragments
	AFFIX: 'AFFIX'             // Prefixes/suffixes (imbuhan)
};

// Game Phases
export const GamePhase = {
	WAITING: 'WAITING',        // Waiting for players
	PLAYING: 'PLAYING',        // Game in progress
	FINISHED: 'FINISHED'       // Game ended
};

// Player Status
export const PlayerStatus = {
	NOT_READY: 'NOT_READY',
	READY: 'READY',
	PLAYING: 'PLAYING',
	DISCONNECTED: 'DISCONNECTED'
};

// Challenge Status
export const ChallengeStatus = {
	PENDING: 'PENDING',
	ACCEPTED: 'ACCEPTED',
	REJECTED: 'REJECTED'
};

// Validation Source
export const ValidationSource = {
	DICTIONARY: 'DICTIONARY',
	API: 'API',
	CHALLENGE: 'CHALLENGE'
};

/**
 * @typedef {Object} Card
 * @property {string} id - Unique card identifier
 * @property {string} type - Card type (BASE_WORD, AFFIX, HELPER)
 * @property {string} value - The text/characters on the card
 * @property {string} color - Color for UI (green, yellow, blue)
 */

/**
 * @typedef {Object} Player
 * @property {string} id - Unique player identifier
 * @property {string} username - Player's username
 * @property {Card[]} hand - Cards in player's hand
 * @property {number} score - Player's current score
 * @property {string} status - Player status
 * @property {boolean} isGuest - Whether player is a guest
 */

/**
 * @typedef {Object} GameState
 * @property {string} roomId - Unique room identifier
 * @property {Player[]} players - Array of players in the room
 * @property {Card[]} tableCards - Cards currently on the table
 * @property {Card[]} deck - Remaining cards in deck
 * @property {number} currentTurnIndex - Index of player whose turn it is
 * @property {string} phase - Current game phase
 * @property {number} turnTimer - Seconds remaining in current turn
 * @property {Object|null} activeChallenge - Current challenge if any
 */

/**
 * @typedef {Object} Challenge
 * @property {string} challengerId - ID of player who initiated challenge
 * @property {string} word - The word being challenged
 * @property {Object} votes - Map of player IDs to their votes
 * @property {string} status - Challenge status
 */

export default {
	CardType,
	GamePhase,
	PlayerStatus,
	ChallengeStatus,
	ValidationSource
};

