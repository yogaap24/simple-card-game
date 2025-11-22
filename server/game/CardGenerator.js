import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CardType } from '../../shared/types.js';
import { GAME_CONFIG, AFFIX_LIST, CARD_COLORS, SYLLABLES, ALPHABET } from '../../shared/constants.js';

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
 * Generate all possible card segments:
 * - 20% chance: 1 huruf (A-Z)
 * - 80% chance: 2 huruf (SYLLABLES)
 * - Segments dari base words (1-3 huruf)
 */
function generateBaseWordCards() {
	const cards = [];
	let cardId = 1;

	// 1. Alfabet (1 huruf) - dari ALPHABET
	ALPHABET.forEach(letter => {
		cards.push({
			id: `alpha-${cardId++}`,
			type: CardType.BASE_WORD,
			value: letter.toLowerCase(),
			color: CARD_COLORS.BASE_WORD,
			isAlphabet: true
		});
	});

	// 2. Syllables (2 huruf) - dari SYLLABLES
	SYLLABLES.forEach(syllable => {
		cards.push({
			id: `syll-${cardId++}`,
			type: CardType.BASE_WORD,
			value: syllable.toLowerCase(),
			color: CARD_COLORS.BASE_WORD,
			isSyllable: true
		});
	});

	// 3. Segments dari base words (1-3 huruf)
	const uniqueSegments = new Set();
	baseWords.forEach(word => {
		for (let i = 0; i < word.length; i++) {
			for (let len = 1; len <= Math.min(GAME_CONFIG.MAX_CARD_LENGTH, word.length - i); len++) {
				const segment = word.substring(i, i + len);
				if (segment.length >= 1) {
					uniqueSegments.add(segment);
				}
			}
		}
	});

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
 * Deal cards to players ensuring proper distribution
 * 20% chance untuk 1 huruf, 80% untuk 2 huruf atau lebih
 */
export function dealCards(numPlayers, cardsPerPlayer = GAME_CONFIG.STARTING_CARDS) {
	const deck = shuffleDeck(generateDeck());
	const playerHands = [];

	// Separate cards by type
	const alphabetCards = deck.filter(card => card.isAlphabet);
	const otherCards = deck.filter(card => !card.isAlphabet);

	// Deal cards to each player with 20% single letter probability
	for (let i = 0; i < numPlayers; i++) {
		const hand = [];

		for (let j = 0; j < cardsPerPlayer; j++) {
			const rand = Math.random();

			// 20% chance untuk 1 huruf
			if (rand < GAME_CONFIG.SINGLE_LETTER_PROBABILITY && alphabetCards.length > 0) {
				const card = alphabetCards.splice(Math.floor(Math.random() * alphabetCards.length), 1)[0];
				hand.push(card);
			}
			// 80% chance untuk 2+ huruf
			else if (otherCards.length > 0) {
				const card = otherCards.splice(Math.floor(Math.random() * otherCards.length), 1)[0];
				hand.push(card);
			}
			// Fallback jika kehabisan
			else if (alphabetCards.length > 0) {
				const card = alphabetCards.splice(Math.floor(Math.random() * alphabetCards.length), 1)[0];
				hand.push(card);
			}
		}

		playerHands.push(hand);
	}

	// Remaining deck
	const remainingDeck = [...alphabetCards, ...otherCards];

	return {
		playerHands,
		remainingDeck: shuffleDeck(remainingDeck)
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

