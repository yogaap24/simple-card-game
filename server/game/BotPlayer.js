/**
 * Bot Player AI for Card Game BISINDO
 * Allows solo testing and provides VS Bot gameplay option
 */

import { validateWord } from './WordValidator.js';

export class BotPlayer {
	constructor(botId, botName) {
		this.id = botId;
		this.name = botName;
		this.difficulty = 'medium'; // easy, medium, hard
	}

	/**
	 * Bot decides which cards to play
	 */
	async makeMove(hand, tableCards, wordHistory) {
		// Wait a bit to simulate thinking
		await this.sleep(1000 + Math.random() * 2000);

		const currentWord = tableCards.map(c => c.value).join('');

		// Try to find a valid move (single or multiple cards)
		const possibleMoves = await this.findValidMoves(hand, currentWord, wordHistory);

		if (possibleMoves.length === 0) {
			return null; // Skip turn
		}

		// Choose best move based on difficulty
		return this.selectMove(possibleMoves);
	}

	/**
	 * Find all valid card combinations
	 */
	async findValidMoves(hand, currentWord, wordHistory = []) {
		const moves = [];

		// Try single cards first
		for (const card of hand) {
			// Try adding to front (left)
			const frontWord = (card.value + currentWord).toLowerCase();
			if (!wordHistory.includes(frontWord)) {
				const frontValid = await this.quickValidate(frontWord);
				if (frontValid) {
					moves.push({
						leftCards: [card],
						rightCards: [],
						word: frontWord,
						score: this.scoreMove(frontWord)
					});
				}
			}

			// Try adding to back (right)
			const backWord = (currentWord + card.value).toLowerCase();
			if (!wordHistory.includes(backWord)) {
				const backValid = await this.quickValidate(backWord);
				if (backValid) {
					moves.push({
						leftCards: [],
						rightCards: [card],
						word: backWord,
						score: this.scoreMove(backWord)
					});
				}
			}
		}

		// For hard bots: try 2-card combinations
		if (this.difficulty === 'hard' && hand.length >= 2) {
			for (let i = 0; i < Math.min(hand.length, 3); i++) {
				for (let j = i + 1; j < Math.min(hand.length, 4); j++) {
					// Try both to the right
					const word1 = (currentWord + hand[i].value + hand[j].value).toLowerCase();
					if (!wordHistory.includes(word1) && await this.quickValidate(word1)) {
						moves.push({
							leftCards: [],
							rightCards: [hand[i], hand[j]],
							word: word1,
							score: this.scoreMove(word1)
						});
					}

					// Try both to the left
					const word2 = (hand[i].value + hand[j].value + currentWord).toLowerCase();
					if (!wordHistory.includes(word2) && await this.quickValidate(word2)) {
						moves.push({
							leftCards: [hand[i], hand[j]],
							rightCards: [],
							word: word2,
							score: this.scoreMove(word2)
						});
					}

					// Try split: one left, one right
					const word3 = (hand[i].value + currentWord + hand[j].value).toLowerCase();
					if (!wordHistory.includes(word3) && await this.quickValidate(word3)) {
						moves.push({
							leftCards: [hand[i]],
							rightCards: [hand[j]],
							word: word3,
							score: this.scoreMove(word3)
						});
					}
				}
			}
		}

		return moves;
	}

	/**
	 * Quick word validation (simplified for bot)
	 */
	async quickValidate(word) {
		if (word.length < 2) return false;

		try {
			const result = await validateWord(word);
			return result.valid;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Score a potential move based on word length
	 */
	scoreMove(word) {
		return word.length; // Points = word length
	}

	/**
	 * Select best move based on difficulty
	 */
	selectMove(moves) {
		if (moves.length === 0) return null;

		// Sort by score
		moves.sort((a, b) => b.score - a.score);

		switch (this.difficulty) {
			case 'easy':
				// Random selection (50% chance of best move)
				return Math.random() > 0.5
					? moves[0]
					: moves[Math.floor(Math.random() * moves.length)];

			case 'hard':
				// Always best move
				return moves[0];

			case 'medium':
			default:
				// Top 3 moves randomly
				const topMoves = moves.slice(0, Math.min(3, moves.length));
				return topMoves[Math.floor(Math.random() * topMoves.length)];
		}
	}

	/**
	 * Sleep utility
	 */
	sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Bot should challenge? (simple logic)
	 */
	shouldChallenge(word) {
		// Bots rarely challenge (10% chance for words > 8 chars)
		if (word.length > 8 && Math.random() < 0.1) {
			return true;
		}
		return false;
	}

	/**
	 * Bot voting on challenge
	 */
	voteOnChallenge(word) {
		// Simple logic: vote invalid for very long words
		if (word.length > 10) {
			return false; // Vote invalid
		}
		return true; // Vote valid
	}
}

/**
 * Get random bot names based on difficulty level
 */
function getBotNamesByDifficulty(difficulty) {
	const easyNames = [
		'Andi', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fitri',
		'Gita', 'Hadi', 'Indah', 'Joko'
	];

	const mediumNames = [
		'Arif', 'Bambang', 'Dani', 'Eka', 'Fajar', 'Galih',
		'Hendra', 'Irfan', 'Jaya', 'Krisna'
	];

	const hardNames = [
		'Aditya', 'Bagas', 'Cahya', 'Dimas', 'Erlangga', 'Farhan',
		'Gilang', 'Hafiz', 'Ilham', 'Kurnia'
	];

	switch (difficulty) {
		case 'easy':
			return easyNames;
		case 'hard':
			return hardNames;
		case 'medium':
		default:
			return mediumNames;
	}
}

/**
 * Create bot players with difficulty-appropriate names
 */
export function createBots(count, difficulty = 'medium') {
	const availableNames = getBotNamesByDifficulty(difficulty);
	const shuffledNames = [...availableNames].sort(() => Math.random() - 0.5);

	const bots = [];
	for (let i = 0; i < count; i++) {
		const botId = `bot-${Date.now()}-${i}`;
		const botName = shuffledNames[i] || availableNames[i % availableNames.length];
		const bot = new BotPlayer(botId, botName);
		bot.difficulty = difficulty; // Set difficulty on bot
		bots.push(bot);
	}

	return bots;
}

export default BotPlayer;

