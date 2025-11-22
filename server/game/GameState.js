import { GamePhase, PlayerStatus, ChallengeStatus } from '../../shared/types.js';
import { GAME_CONFIG, POINTS } from '../../shared/constants.js';
import { validateWord } from './WordValidator.js';
import { dealCards } from './CardGenerator.js';

/**
 * GameState manages the state of a single game room
 */
export class GameState {
	constructor(roomId) {
		this.roomId = roomId;
		this.players = [];
		this.tableCards = [];
		this.deck = [];
		this.currentTurnIndex = 0;
		this.phase = GamePhase.WAITING;
		this.turnTimer = GAME_CONFIG.TURN_DURATION;
		this.turnInterval = null;
		this.activeChallenge = null;
		this.hostId = null;
		this.wordHistory = []; // Track all words created
		this.consecutiveSkips = 0; // Track skips for auto-reset
	}

	/**
	 * Add a player to the game
	 */
	addPlayer(playerId, username, isGuest = false) {
		if (this.players.length >= GAME_CONFIG.MAX_PLAYERS) {
			throw new Error('Room is full');
		}

		if (this.phase !== GamePhase.WAITING) {
			throw new Error('Game already in progress');
		}

		const player = {
			id: playerId,
			username,
			hand: [],
			score: 0,
			status: PlayerStatus.NOT_READY,
			isGuest
		};

		this.players.push(player);

		// First player becomes host
		if (this.players.length === 1) {
			this.hostId = playerId;
		}

		return player;
	}

	/**
	 * Remove a player from the game
	 */
	removePlayer(playerId) {
		const index = this.players.findIndex(p => p.id === playerId);
		if (index === -1) return false;

		// Return player's cards to deck
		const player = this.players[index];
		this.deck.push(...player.hand);

		this.players.splice(index, 1);

		// Assign new host if current host left
		if (this.hostId === playerId && this.players.length > 0) {
			this.hostId = this.players[0].id;
		}

		// Adjust turn index if necessary
		if (this.currentTurnIndex >= this.players.length && this.players.length > 0) {
			this.currentTurnIndex = 0;
		}

		return true;
	}

	/**
	 * Mark player as ready
	 */
	setPlayerReady(playerId, ready = true) {
		const player = this.players.find(p => p.id === playerId);
		if (!player) throw new Error('Player not found');

		player.status = ready ? PlayerStatus.READY : PlayerStatus.NOT_READY;
		return true;
	}

	/**
	 * Check if all players are ready
	 */
	areAllPlayersReady() {
		// For bot games, check if we have at least MIN_BOT_PLAYERS
		const hasBots = this.players.some(p => p.isBot);
		const minPlayers = hasBots ? GAME_CONFIG.MIN_BOT_PLAYERS : GAME_CONFIG.MIN_PLAYERS;

		if (this.players.length < minPlayers) return false;
		return this.players.every(p => p.status === PlayerStatus.READY);
	}

	/**
	 * Start the game
	 */
	startGame() {
		if (this.players.length < GAME_CONFIG.MIN_PLAYERS) {
			throw new Error(`Need at least ${GAME_CONFIG.MIN_PLAYERS} players to start`);
		}

		if (!this.areAllPlayersReady()) {
			throw new Error('Not all players are ready');
		}

		// Deal cards to players
		const { playerHands, remainingDeck } = dealCards(
			this.players.length,
			GAME_CONFIG.STARTING_CARDS
		);

		// Assign hands to players
		this.players.forEach((player, index) => {
			player.hand = playerHands[index];
			player.status = PlayerStatus.PLAYING;
		});

		this.deck = remainingDeck;

		// Place one random BASE card on table to start
		const baseCards = this.deck.filter(c => c.type === 'BASE_WORD');
		if (baseCards.length > 0) {
			const randomIndex = Math.floor(Math.random() * baseCards.length);
			const startCard = baseCards[randomIndex];
			this.tableCards = [startCard];
			// Remove from deck
			const deckIndex = this.deck.findIndex(c => c.id === startCard.id);
			if (deckIndex !== -1) {
				this.deck.splice(deckIndex, 1);
			}
			console.log(`🎴 Starting table card: ${startCard.value}`);
		}

		this.phase = GamePhase.PLAYING;
		this.currentTurnIndex = 0;
		this.wordHistory = [];
		this.consecutiveSkips = 0;
		this.startTurnTimer();

		console.log(`✅ Game started in room ${this.roomId} with ${this.players.length} players`);
		return true;
	}

	/**
	 * Play multiple cards to left/right of table
	 */
	async playCards(playerId, leftCardIds = [], rightCardIds = []) {
		// Validate it's player's turn
		const currentPlayer = this.players[this.currentTurnIndex];
		if (currentPlayer.id !== playerId) {
			throw new Error('Not your turn');
		}

		// Must play at least one card
		if (leftCardIds.length === 0 && rightCardIds.length === 0) {
			throw new Error('Must play at least one card');
		}

		// Find cards in player's hand
		const leftCards = leftCardIds.map(id => {
			const card = currentPlayer.hand.find(c => c.id === id);
			if (!card) throw new Error('Card not found in hand');
			return card;
		});

		const rightCards = rightCardIds.map(id => {
			const card = currentPlayer.hand.find(c => c.id === id);
			if (!card) throw new Error('Card not found in hand');
			return card;
		});

		// Build new table cards array
		const newTableCards = [...leftCards, ...this.tableCards, ...rightCards];

		// Validate the word formed
		const word = newTableCards.map(c => c.value).join('').toLowerCase();
		const validation = await validateWord(word);

		if (!validation.valid) {
			// Invalid word - player must draw a card
			return {
				success: false,
				message: validation.message || 'Kata tidak valid',
				mustDraw: true
			};
		}

		// Check if word already used
		if (this.wordHistory.includes(word)) {
			return {
				success: false,
				message: 'Kata sudah pernah dibuat!',
				mustDraw: false
			};
		}

		// Valid word - update game state
		[...leftCardIds, ...rightCardIds].forEach(id => {
			const index = currentPlayer.hand.findIndex(c => c.id === id);
			if (index !== -1) currentPlayer.hand.splice(index, 1);
		});

		this.tableCards = newTableCards;
		this.wordHistory.push(word);
		this.consecutiveSkips = 0; // Reset skip counter

		// Award points based on word length
		const points = this.calculatePoints(word);
		currentPlayer.score += points;

		// Store word info for display
		const wordInfo = {
			lemma: validation.lemma,
			definitions: validation.definitions,
			derivedWords: validation.derivedWords,
			compoundWords: validation.compoundWords
		};

		// Check win condition
		if (currentPlayer.hand.length === 0) {
			this.endGame(playerId);
			return {
				success: true,
				word,
				points,
				wordInfo,
				gameEnded: true,
				winner: playerId
			};
		}

		// Move to next turn
		this.nextTurn();

		return {
			success: true,
			word,
			points,
			wordInfo
		};
	}

	/**
	 * Backward compatibility: Play single card (old API)
	 */
	async playCard(playerId, cardId, position = 'back') {
		const leftCards = position === 'front' ? [cardId] : [];
		const rightCards = position === 'back' ? [cardId] : [];
		return this.playCards(playerId, leftCards, rightCards);
	}

	/**
	 * Draw a card from deck
	 */
	drawCard(playerId) {
		const player = this.players.find(p => p.id === playerId);
		if (!player) throw new Error('Player not found');

		if (this.deck.length === 0) {
			throw new Error('Deck is empty');
		}

		const card = this.deck.pop();
		player.hand.push(card);

		return card;
	}

	/**
	 * Skip turn (player can't or won't play)
	 */
	skipTurn(playerId) {
		const currentPlayer = this.players[this.currentTurnIndex];
		if (currentPlayer.id !== playerId) {
			throw new Error('Not your turn');
		}

		// Player must draw a card as penalty
		if (this.deck.length > 0) {
			this.drawCard(playerId);
		}

		// Increment skip counter
		this.consecutiveSkips++;

		// Check if all players skipped (one full round)
		if (this.consecutiveSkips >= this.players.length) {
			this.resetTableCard();
		}

		this.nextTurn();
		return true;
	}

	/**
	 * Reset table card when all players skip
	 */
	resetTableCard() {
		console.log(`🔄 All players skipped - resetting table card`);

		// Draw a new random card from deck
		if (this.deck.length > 0) {
			const newCard = this.deck.pop();
			this.tableCards = [newCard];
			this.consecutiveSkips = 0;

			console.log(`✅ New table card: ${newCard.value}`);
		} else {
			console.log('⚠️ Deck is empty - cannot reset table');
		}
	}

	/**
	 * Move to next player's turn
	 */
	nextTurn() {
		this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
		this.resetTurnTimer();
	}

	/**
	 * Calculate points for a word based on word length
	 * Longer words score more points
	 */
	calculatePoints(word) {
		return word.length; // 1 point per character
	}

	/**
	 * Initiate a challenge
	 */
	initiateChallenge(challengerId, word) {
		if (this.activeChallenge) {
			throw new Error('Challenge already in progress');
		}

		this.activeChallenge = {
			challengerId,
			word,
			votes: {},
			status: ChallengeStatus.PENDING,
			createdAt: Date.now()
		};

		return this.activeChallenge;
	}

	/**
	 * Vote on active challenge
	 */
	voteChallenge(playerId, vote) {
		if (!this.activeChallenge) {
			throw new Error('No active challenge');
		}

		this.activeChallenge.votes[playerId] = vote; // true = word is valid, false = invalid

		// Check if all players have voted (except challenger)
		const votedCount = Object.keys(this.activeChallenge.votes).length;
		if (votedCount >= this.players.length - 1) {
			return this.resolveChallenge();
		}

		return null; // Challenge not resolved yet
	}

	/**
	 * Resolve challenge based on votes
	 */
	resolveChallenge() {
		if (!this.activeChallenge) return null;

		const votes = Object.values(this.activeChallenge.votes);
		const validVotes = votes.filter(v => v === true).length;
		const invalidVotes = votes.filter(v => v === false).length;

		const wordIsValid = validVotes > invalidVotes;
		const challenger = this.players.find(p => p.id === this.activeChallenge.challengerId);

		let result;
		if (wordIsValid) {
			// Word is valid, challenger was right
			result = {
				success: true,
				wordIsValid: true,
				message: 'Challenge successful - word is valid'
			};
		} else {
			// Word is invalid, challenger was wrong - apply penalty
			if (challenger && this.deck.length > 0) {
				const penaltyCards = Math.min(POINTS.CHALLENGE_PENALTY, this.deck.length);
				for (let i = 0; i < penaltyCards; i++) {
					this.drawCard(challenger.id);
				}
			}

			result = {
				success: false,
				wordIsValid: false,
				message: 'Challenge failed - penalty applied',
				penalty: POINTS.CHALLENGE_PENALTY
			};
		}

		this.activeChallenge = null;
		return result;
	}

	/**
	 * Start turn timer
	 */
	startTurnTimer() {
		this.resetTurnTimer();
	}

	/**
	 * Reset turn timer
	 */
	resetTurnTimer() {
		if (this.turnInterval) {
			clearInterval(this.turnInterval);
		}
		this.turnTimer = GAME_CONFIG.TURN_DURATION;
	}

	/**
	 * Stop turn timer
	 */
	stopTurnTimer() {
		if (this.turnInterval) {
			clearInterval(this.turnInterval);
			this.turnInterval = null;
		}
	}

	/**
	 * End the game
	 */
	endGame(winnerId) {
		this.phase = GamePhase.FINISHED;
		this.stopTurnTimer();

		console.log(`✅ Game ended in room ${this.roomId}. Winner: ${winnerId}`);
		return {
			winnerId,
			finalScores: this.players.map(p => ({
				id: p.id,
				username: p.username,
				score: p.score,
				cardsLeft: p.hand.length
			}))
		};
	}

	/**
	 * Get public game state (hides other players' hands)
	 */
	getPublicState(forPlayerId) {
		return {
			roomId: this.roomId,
			phase: this.phase,
			tableCards: this.tableCards,
			currentTurnIndex: this.currentTurnIndex,
			currentPlayer: this.players[this.currentTurnIndex]?.id,
			turnTimer: this.turnTimer,
			deckSize: this.deck.length,
			players: this.players.map(p => ({
				id: p.id,
				username: p.username,
				handSize: p.hand.length,
				hand: p.id === forPlayerId ? p.hand : undefined, // Only show own hand
				score: p.score,
				status: p.status,
				isGuest: p.isGuest,
				isBot: p.isBot
			})),
			activeChallenge: this.activeChallenge,
			hostId: this.hostId,
			wordHistory: this.wordHistory,
			consecutiveSkips: this.consecutiveSkips
		};
	}
}

export default GameState;

