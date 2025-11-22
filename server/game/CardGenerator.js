import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CardType } from '../../shared/types.js';
import { GAME_CONFIG, AFFIX_LIST, CARD_COLORS } from '../../shared/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load word dictionary
let baseWords = [];
try {
	const wordsPath = join(__dirname, '../../data/kbbi-words.json');
	baseWords = JSON.parse(readFileSync(wordsPath, 'utf-8'));
	console.log(`✅ Loaded ${baseWords.length} base words from dictionary`);
} catch (error) {
	console.error('❌ Error loading base words:', error.message);
	baseWords = ['beli', 'jual', 'makan', 'minum', 'tidur']; // Fallback words
}

/**
 * Generate all possible card segments from base words
 */
function generateBaseWordCards() {
	const cards = [];
	const uniqueSegments = new Set();

	baseWords.forEach(word => {
		// Generate all possible 1-3 character segments
		for (let i = 0; i < word.length; i++) {
			for (let len = 1; len <= Math.min(GAME_CONFIG.MAX_CARD_LENGTH, word.length - i); len++) {
				const segment = word.substring(i, i + len);
				if (segment.length >= 1) {
					uniqueSegments.add(segment);
				}
			}
		}
	});

	// Convert segments to card objects
	let cardId = 1;
	uniqueSegments.forEach(segment => {
		cards.push({
			id: `base-${cardId++}`,
			type: CardType.BASE_WORD,
			value: segment,
			color: CARD_COLORS.BASE_WORD
		});
	});

	return cards;
}

/**
 * Generate affix cards (prefixes and suffixes)
 */
function generateAffixCards() {
	const cards = [];

	AFFIX_LIST.forEach((affix, index) => {
		cards.push({
			id: `affix-${index + 1}`,
			type: CardType.AFFIX,
			value: affix,
			color: CARD_COLORS.AFFIX
		});
	});

	return cards;
}

/**
 * Generate complete deck of all cards with duplicate limits
 * Rule: Max 2 duplicates per card type (BASE_WORD or AFFIX)
 * If there are 2 of the same affix, there cannot be 2 of the same base
 */
export function generateDeck() {
	const baseWordCards = generateBaseWordCards();
	const affixCards = generateAffixCards();

	// For each unique card, only include it ONCE (no duplicates initially)
	const uniqueBaseCards = removeDuplicateValues(baseWordCards);
	const uniqueAffixCards = removeDuplicateValues(affixCards);

	// Now add a SECOND copy of each card (total 2 per unique value)
	const limitedBaseCards = [...uniqueBaseCards, ...uniqueBaseCards.map(card => ({
		...card,
		id: card.id + '-dup'
	}))];

	const limitedAffixCards = [...uniqueAffixCards, ...uniqueAffixCards.map(card => ({
		...card,
		id: card.id + '-dup'
	}))];

	const deck = [...limitedBaseCards, ...limitedAffixCards];

	console.log(`✅ Generated deck with ${deck.length} cards (max 2 of each value):`);
	console.log(`   - ${limitedBaseCards.length} base word cards (${uniqueBaseCards.length} unique)`);
	console.log(`   - ${limitedAffixCards.length} affix cards (${uniqueAffixCards.length} unique)`);

	return deck;
}

/**
 * Remove duplicate values, keeping only one of each unique value
 */
function removeDuplicateValues(cards) {
	const seen = new Set();
	const uniqueCards = [];

	for (const card of cards) {
		if (!seen.has(card.value)) {
			seen.add(card.value);
			uniqueCards.push(card);
		}
	}

	return uniqueCards;
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffleDeck(deck) {
	const shuffled = [...deck];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

/**
 * Deal cards to players ensuring no duplicates
 */
export function dealCards(numPlayers, cardsPerPlayer = GAME_CONFIG.STARTING_CARDS) {
	const deck = shuffleDeck(generateDeck());
	const playerHands = [];

	// Calculate how many cards we need
	const totalNeeded = numPlayers * cardsPerPlayer;

	if (totalNeeded > deck.length) {
		throw new Error(`Not enough cards in deck. Need ${totalNeeded}, have ${deck.length}`);
	}

	// Deal cards to each player
	for (let i = 0; i < numPlayers; i++) {
		const hand = deck.splice(0, cardsPerPlayer);
		playerHands.push(hand);
	}

	// Return player hands and remaining deck
	return {
		playerHands,
		remainingDeck: deck
	};
}

/**
 * Generate a random room ID
 */
export function generateRoomId(length = GAME_CONFIG.ROOM_ID_LENGTH) {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

export default {
	generateDeck,
	shuffleDeck,
	dealCards,
	generateRoomId
};

