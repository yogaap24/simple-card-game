import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { BASE_WORDS, AFFIXES, isCompleteWord, isValidTableFragment } from '../data/words';
import './Game.css';
import './GameSolo.css';

// Helper for consistent SweetAlert toast notifications (top-right, small)
const showToast = (icon, title, text, timer = 2000) => {
	Swal.fire({
		icon,
		title,
		text,
		position: 'top-end',
		showConfirmButton: false,
		timer,
		timerProgressBar: true,
		toast: true,
		width: '350px',
		customClass: {
			popup: 'swal-toast'
		}
	});
};

function GameSolo() {
	const navigate = useNavigate();
	const [gameConfig, setGameConfig] = useState(null);
	const [gameState, setGameState] = useState(null);
	const [loading, setLoading] = useState(true);
	const [selectedCard, setSelectedCard] = useState(null);
	const [draggedCard, setDraggedCard] = useState(null);
	const [placedCards, setPlacedCards] = useState([]); // Array of {card, slotIndex}
	const [turnTimeLimit, setTurnTimeLimit] = useState(60);
	const [timeLeft, setTimeLeft] = useState(60);
	const [isValidating, setIsValidating] = useState(false);
	const [wordHistory, setWordHistory] = useState([]);
	const [consecutiveSkips, setConsecutiveSkips] = useState(0);
	const [swapCount, setSwapCount] = useState(0);
	const [botPlacedCards, setBotPlacedCards] = useState([]); // Visual cards placed by bot
	const [isBotMoving, setIsBotMoving] = useState(false);
	const botTurnTimeoutRef = useRef(null);
	const timerRef = useRef(null);

	useEffect(() => {
		// Load game config
		const configStr = sessionStorage.getItem('gameConfig');
		if (!configStr) {
			navigate('/');
			return;
		}

		const config = JSON.parse(configStr);
		setGameConfig(config);

		// Set timer based on difficulty
		const timeLimit = config.difficulty === 'easy' ? 60 :
			config.difficulty === 'medium' ? 45 : 30;
		setTurnTimeLimit(timeLimit);
		setTimeLeft(timeLimit);

		// Initialize game
		initializeGame(config);
	}, [navigate]);

	// Timer effect
	useEffect(() => {
		if (!gameState || gameState.phase !== 'PLAYING') return;
		if (gameState.currentPlayerIndex !== 0) return; // Not player turn

		// Clear existing timer
		if (timerRef.current) {
			clearInterval(timerRef.current);
		}

		timerRef.current = setInterval(() => {
			setTimeLeft(prev => {
				if (prev <= 1) {
					clearInterval(timerRef.current);
					handleSkipTurn();
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => {
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
		};
	}, [gameState?.currentPlayerIndex, gameState?.phase]);

	// Reset timer when turn changes
	useEffect(() => {
		setTimeLeft(turnTimeLimit);
	}, [gameState?.currentPlayerIndex, turnTimeLimit]);

	const initializeGame = (config) => {
		// Create players
		const players = [
			{
				id: 'player',
				name: config.playerName,
				isBot: false,
				hand: [],
				score: 0
			}
		];

		// Add bots with difficulty-appropriate names
		const getBotNames = (difficulty) => {
			const easyNames = ['Andi', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fitri'];
			const mediumNames = ['Arif', 'Bambang', 'Dani', 'Eka', 'Fajar', 'Galih'];
			const hardNames = ['Aditya', 'Bagas', 'Cahya', 'Dimas', 'Erlangga', 'Farhan'];

			switch (difficulty) {
				case 'easy': return easyNames;
				case 'hard': return hardNames;
				default: return mediumNames;
			}
		};

		const botNames = getBotNames(config.difficulty);
		for (let i = 0; i < config.botCount; i++) {
			players.push({
				id: `bot-${i}`,
				name: botNames[i] || `Bot ${i + 1}`,
				isBot: true,
				hand: [],
				score: 0,
				difficulty: config.difficulty
			});
		}

		// Create initial game state
		const initialState = {
			players,
			currentPlayerIndex: 0,
			tableCards: [],
			currentWord: '',
			phase: 'WAITING',
			difficulty: config.difficulty
		};

		setGameState(initialState);
		setLoading(false);

		// Auto start after 1 second
		setTimeout(() => {
			startGame(initialState);
		}, 1000);
	};

	const startGame = (state) => {
		// Use imported dictionary
		const baseWords = BASE_WORDS;
		const affixes = AFFIXES;

		// Generate fragments from base words
		// For TABLE: Only 2 characters, must be vowel+consonant, not "nd", "ng", "aa"
		const baseFragments = new Set();
		baseWords.forEach(word => {
			for (let i = 0; i < word.length; i++) {
				// Only generate 2-character fragments for table
				const segment = word.substring(i, i + 2);
				if (segment.length === 2 && isValidTableFragment(segment)) {
					baseFragments.add(segment);
				}
			}
		});
		const fragmentArray = Array.from(baseFragments);

		const updatedPlayers = state.players.map(player => ({
			...player,
			hand: generateHand(7, fragmentArray, affixes)
		}));

		// Set first table card (random fragment)
		const randomFragment = fragmentArray[Math.floor(Math.random() * fragmentArray.length)];
		const firstCard = {
			id: `table-${Date.now()}`,
			value: randomFragment,
			type: 'BASE_WORD'
		};

		setGameState({
			...state,
			players: updatedPlayers,
			tableCards: [firstCard],
			currentWord: firstCard.value,
			phase: 'PLAYING'
		});
	};

	const generateHand = (count, fragments, affixes) => {
		const hand = [];
		const usedValues = new Set(); // Track duplicates

		// Ensure minimum requirements
		const minSingleChar = 3; // At least 3 single-character cards
		const minAffix = 2;

		// Generate ALL possible fragments (1-3 characters for player hand)
		const allFragments = [];
		const singleCharFragments = [];

		fragments.forEach(fragment => {
			// Add 1-3 character substrings
			for (let i = 0; i < fragment.length; i++) {
				for (let len = 1; len <= Math.min(3, fragment.length - i); len++) {
					const seg = fragment.substring(i, i + len);
					if (seg.length >= 1 && seg.length <= 3) {
						// Filter out complete words for 3-char fragments
						if (seg.length === 3 && isCompleteWord(seg)) {
							continue; // Skip this fragment
						}

						allFragments.push(seg);
						if (seg.length === 1) {
							singleCharFragments.push(seg);
						}
					}
				}
			}
		});

		// Remove duplicates
		const uniqueFragments = [...new Set(allFragments)];
		const uniqueSingleChar = [...new Set(singleCharFragments)];

		// Add minimum SINGLE CHARACTER cards (PRIORITY!)
		let attempts = 0;
		while (hand.filter(c => c.type === 'BASE_WORD' && c.value.length === 1).length < minSingleChar && attempts < 100) {
			const value = uniqueSingleChar[Math.floor(Math.random() * uniqueSingleChar.length)];
			if (!usedValues.has(value)) {
				hand.push({
					id: `card-${Date.now()}-${Math.random()}-${hand.length}`,
					value,
					type: 'BASE_WORD'
				});
				usedValues.add(value);
			}
			attempts++;
		}

		// Add minimum affix cards (no duplicates)
		attempts = 0;
		while (hand.filter(c => c.type === 'AFFIX').length < minAffix && attempts < 100) {
			const value = affixes[Math.floor(Math.random() * affixes.length)];
			if (!usedValues.has(value)) {
				hand.push({
					id: `card-${Date.now()}-${Math.random()}-${hand.length}`,
					value,
					type: 'AFFIX'
				});
				usedValues.add(value);
			}
			attempts++;
		}

		// Fill rest randomly (no duplicates)
		attempts = 0;
		while (hand.length < count && attempts < 200) {
			const isAffix = Math.random() > 0.5;
			const value = isAffix
				? affixes[Math.floor(Math.random() * affixes.length)]
				: uniqueFragments[Math.floor(Math.random() * uniqueFragments.length)];

			if (!usedValues.has(value)) {
				hand.push({
					id: `card-${Date.now()}-${Math.random()}-${hand.length}`,
					value,
					type: isAffix ? 'AFFIX' : 'BASE_WORD'
				});
				usedValues.add(value);
			}
			attempts++;
		}

		return hand;
	};

	const handleBackToHome = () => {
		if (timerRef.current) clearInterval(timerRef.current);
		if (botTurnTimeoutRef.current) clearTimeout(botTurnTimeoutRef.current);
		setPlacedCards([]);
		setSelectedCard(null);
		sessionStorage.removeItem('gameConfig');
		navigate('/');
	};

	const handleCardClick = (card) => {
		if (gameState.phase !== 'PLAYING') return;
		if (gameState.currentPlayerIndex !== 0) return;

		// Check if card already placed
		const alreadyPlaced = placedCards.some(p => p.card.id === card.id);
		if (alreadyPlaced) return;

		setSelectedCard(card);
	};

	const handleSlotClick = (slotIndex) => {
		if (!selectedCard) return;

		// Simple approach: store slot index relative to current merged display
		// The key is to assign a unique order number for proper sorting
		const orderNumber = Date.now() + Math.random();

		setPlacedCards([...placedCards, {
			card: selectedCard,
			slotIndex,
			order: orderNumber
		}]);
		setSelectedCard(null);
	};

	const handleDragStart = (e, card) => {
		if (gameState.currentPlayerIndex !== 0) return;

		// Check if card already placed
		const alreadyPlaced = placedCards.some(p => p.card.id === card.id);
		if (alreadyPlaced) return;

		e.dataTransfer.effectAllowed = 'move';
		setDraggedCard(card);
		setSelectedCard(card);
	};

	const handleDragOver = (e) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
	};

	const handleDrop = (e, slotIndex) => {
		e.preventDefault();
		if (!draggedCard) return;

		const orderNumber = Date.now() + Math.random();

		setPlacedCards([...placedCards, {
			card: draggedCard,
			slotIndex,
			order: orderNumber
		}]);
		setDraggedCard(null);
		setSelectedCard(null);
	};

	const handleConfirmPlacement = async () => {
		if (placedCards.length === 0) return;

		// Build new table cards using same logic as display
		let newTableCards = [...gameState.tableCards];

		// Sort placements by order (chronological)
		const sortedPlacements = [...placedCards].sort((a, b) => a.order - b.order);

		// Insert each card at its slot index
		sortedPlacements.forEach((placement) => {
			const insertAt = Math.min(placement.slotIndex, newTableCards.length);
			newTableCards.splice(insertAt, 0, placement.card);
		});

		const word = newTableCards.map(c => c.value).join('').toLowerCase();

		// Check if word already used
		if (wordHistory.includes(word)) {
			showToast('warning', 'Kata sudah digunakan', 'Kata ini sudah pernah dibuat sebelumnya');
			handleCancelPlacement();
			return;
		}

		// Validate word via server proxy (fixes CORS)
		setIsValidating(true);

		let isValid = false;

		try {
			const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
			const response = await fetch(`${serverUrl}/api/validate/${encodeURIComponent(word)}`, {
				headers: { 'Accept': 'application/json' }
			});

			if (response.ok) {
				const data = await response.json();
				isValid = data.valid === true;
				console.log(`✅ KBBI API (via proxy): "${word}" - Valid:`, isValid);
			} else {
				console.log(`❌ KBBI API proxy: "${word}" - Response not OK:`, response.status);
			}
		} catch (error) {
			console.error('KBBI API proxy error:', error);
			// If API fails, treat as invalid
			isValid = false;
		}

		if (!isValid) {
			showToast('error', 'Kata tidak valid', 'Turn berakhir. +1 kartu hukuman', 2500);

			// Return cards to hand
			setPlacedCards([]);
			setSelectedCard(null);

			// Draw penalty card
			drawCardToPlayer(0);

			// END TURN - move to next player
			const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
			setGameState({
				...gameState,
				currentPlayerIndex: nextPlayerIndex
			});

			setIsValidating(false);
			return;
		}

		// Valid word! Update game
		const updatedPlayers = [...gameState.players];

		// Remove placed cards from hand
		const placedCardIds = placedCards.map(p => p.card.id);
		updatedPlayers[0].hand = updatedPlayers[0].hand.filter(c => !placedCardIds.includes(c.id));

		// Add score based on word length
		updatedPlayers[0].score += word.length;

		setWordHistory([...wordHistory, word]);
		setConsecutiveSkips(0);

		// RESET TABLE to new base card (not continuation!)
		// Generate new random base card: Only 2 characters, vowel+consonant, not "nd", "ng", "aa"
		const tableFragments = [];
		BASE_WORDS.forEach(w => {
			for (let i = 0; i < w.length; i++) {
				const segment = w.substring(i, i + 2);
				if (segment.length === 2 && isValidTableFragment(segment)) {
					tableFragments.push(segment);
				}
			}
		});

		const newRandomFragment = tableFragments[Math.floor(Math.random() * tableFragments.length)];
		const resetTableCard = {
			id: `table-reset-${Date.now()}-${Math.random()}`,
			value: newRandomFragment,
			type: 'BASE_WORD'
		};

		const newGameState = {
			...gameState,
			players: updatedPlayers,
			tableCards: [resetTableCard], // RESET to single new card!
			currentWord: newRandomFragment,
			currentPlayerIndex: (gameState.currentPlayerIndex + 1) % gameState.players.length
		};

		setGameState(newGameState);

		showToast('success', 'Kata valid!', `+${word.length} poin`);

		setPlacedCards([]);
		setSelectedCard(null);
		setIsValidating(false);

		// Check if game should end
		setTimeout(() => {
			checkGameEnd(updatedPlayers);
		}, 100);
	};

	const handleCancelPlacement = () => {
		// Just clear placements (cards are still in hand)
		setPlacedCards([]);
		setSelectedCard(null);
	};

	const handleSwapCards = () => {
		if (!isMyTurn) return;

		// Get swap limit based on difficulty
		const swapLimit = gameConfig.difficulty === 'easy' ? 5 :
			gameConfig.difficulty === 'medium' ? 2 : 0;

		if (swapCount >= swapLimit) {
			showToast('warning', 'Batas maksimal', `Tukar kartu sudah mencapai limit (${swapLimit}x)`);
			return;
		}

		// Return any placed cards to hand first
		const updatedPlayers = [...gameState.players];
		const player = updatedPlayers[0];

		// Add placed cards back to hand
		if (placedCards.length > 0) {
			const placedCardObjects = placedCards.map(p => p.card);
			player.hand = [...player.hand, ...placedCardObjects];
			setPlacedCards([]);
			setSelectedCard(null);
		}

		// Get current hand size to maintain same count (including returned cards)
		const currentHandSize = player.hand.length;

		// Generate new hand with EXACT same count (no minimum requirements for swap)
		const baseFragments = new Set();
		BASE_WORDS.forEach(word => {
			for (let i = 0; i < word.length; i++) {
				for (let len = 1; len <= Math.min(3, word.length - i); len++) {
					const seg = word.substring(i, i + len);
					if (seg.length >= 1 && seg.length <= 3) {
						if (seg.length === 3 && isCompleteWord(seg)) {
							continue;
						}
						baseFragments.add(seg);
					}
				}
			}
		});
		const fragmentArray = Array.from(baseFragments);
		const uniqueFragments = [...new Set(fragmentArray)];
		const uniqueSingleChar = uniqueFragments.filter(f => f.length === 1);

		// Generate hand with EXACT count (no minimum requirements)
		const newHand = [];
		const usedValues = new Set();

		// Fill randomly until we reach exact count
		let attempts = 0;
		while (newHand.length < currentHandSize && attempts < 500) {
			const isAffix = Math.random() > 0.5;
			let value;

			if (isAffix) {
				value = AFFIXES[Math.floor(Math.random() * AFFIXES.length)];
			} else {
				// Prefer single char if we have less than 3, otherwise random
				if (newHand.filter(c => c.type === 'BASE_WORD' && c.value.length === 1).length < 3 && uniqueSingleChar.length > 0) {
					value = uniqueSingleChar[Math.floor(Math.random() * uniqueSingleChar.length)];
				} else {
					value = uniqueFragments[Math.floor(Math.random() * uniqueFragments.length)];
				}
			}

			if (!usedValues.has(value)) {
				newHand.push({
					id: `card-${Date.now()}-${Math.random()}-${newHand.length}`,
					value,
					type: isAffix ? 'AFFIX' : 'BASE_WORD'
				});
				usedValues.add(value);
			}
			attempts++;
		}

		player.hand = newHand;

		setSwapCount(swapCount + 1);
		setGameState({
			...gameState,
			players: updatedPlayers
		});

		showToast('success', 'Kartu ditukar', `${swapCount + 1}/${swapLimit} kali`, 1500);
	};

	const handleSkipTurn = () => {
		// Clear any placements
		setPlacedCards([]);
		setSelectedCard(null);

		// Deduct 1 point if player has points
		const updatedPlayers = [...gameState.players];
		const playerName = updatedPlayers[0].name;
		const hadPoints = updatedPlayers[0].score > 0;
		if (updatedPlayers[0].score > 0) {
			updatedPlayers[0].score = Math.max(0, updatedPlayers[0].score - 1);
		}

		const newSkipCount = consecutiveSkips + 1;
		console.log(`Skip count: ${newSkipCount} / ${gameState.players.length}`);

		// Show alert for skip
		showToast('info', `${playerName} skip turn`, hadPoints ? '-1 poin' : '', 1500);

		// Check if all players skipped
		if (newSkipCount >= gameState.players.length) {
			console.log('All players skipped! Resetting table...');

			// Reset table: Only 2 characters, vowel+consonant, not "nd", "ng", "aa"
			const fragments = [];
			BASE_WORDS.forEach(word => {
				for (let i = 0; i < word.length; i++) {
					const segment = word.substring(i, i + 2);
					if (segment.length === 2 && isValidTableFragment(segment)) {
						fragments.push(segment);
					}
				}
			});

			const randomFragment = fragments[Math.floor(Math.random() * fragments.length)];
			const newCard = {
				id: `table-reset-${Date.now()}-${Math.random()}`,
				value: randomFragment,
				type: 'BASE_WORD'
			};

			console.log(`New table card: ${newCard.value}`);

			// Update state with new table card and reset skip count
			const newGameState = {
				...gameState,
				players: updatedPlayers,
				tableCards: [newCard],
				currentWord: randomFragment,
				currentPlayerIndex: (gameState.currentPlayerIndex + 1) % gameState.players.length
			};

			setGameState(newGameState);
			setConsecutiveSkips(0);

			showToast('info', 'Meja direset', `Kartu baru: ${randomFragment.toUpperCase()}`);

			// Check if game should end
			setTimeout(() => {
				checkGameEnd(updatedPlayers);
			}, 100);
		} else {
			setConsecutiveSkips(newSkipCount);

			// Skip to next player
			const newGameState = {
				...gameState,
				players: updatedPlayers,
				currentPlayerIndex: (gameState.currentPlayerIndex + 1) % gameState.players.length
			};

			setGameState(newGameState);

			// Check if game should end
			setTimeout(() => {
				checkGameEnd(updatedPlayers);
			}, 100);
		}
	};


	const drawCardToPlayer = (playerIndex) => {
		const isAffix = Math.random() > 0.6;

		let value;
		if (isAffix) {
			value = AFFIXES[Math.floor(Math.random() * AFFIXES.length)];
		} else {
			// Generate 1-3 character fragment for player hand
			// 40% chance for 1-char, 30% for 2-char, 30% for 3-char
			const rand = Math.random();
			let len;
			if (rand < 0.4) len = 1;
			else if (rand < 0.7) len = 2;
			else len = 3;

			let attempts = 0;
			do {
				const word = BASE_WORDS[Math.floor(Math.random() * BASE_WORDS.length)];
				const maxLen = Math.min(len, word.length);
				const startIdx = Math.floor(Math.random() * Math.max(1, word.length - maxLen + 1));
				value = word.substring(startIdx, startIdx + maxLen);
				attempts++;

				// Filter out complete words for 3-char
				if (value.length === 3 && isCompleteWord(value)) {
					continue;
				}
				break;
			} while (attempts < 10);
		}

		// Avoid duplicates in player's hand
		const updatedPlayers = [...gameState.players];
		const existingValues = new Set(updatedPlayers[playerIndex].hand.map(c => c.value));

		// Try up to 5 times to get a unique card
		let attempts = 0;
		while (existingValues.has(value) && attempts < 5) {
			const rand = Math.random();
			let len;
			if (rand < 0.4) len = 1;
			else if (rand < 0.7) len = 2;
			else len = 3;

			let innerAttempts = 0;
			do {
				const word = BASE_WORDS[Math.floor(Math.random() * BASE_WORDS.length)];
				const maxLen = Math.min(len, word.length);
				const startIdx = Math.floor(Math.random() * Math.max(1, word.length - maxLen + 1));
				value = word.substring(startIdx, startIdx + maxLen);
				innerAttempts++;

				if (value.length === 3 && isCompleteWord(value)) {
					continue;
				}
				break;
			} while (innerAttempts < 10);

			attempts++;
		}

		const newCard = {
			id: `card-${Date.now()}-${Math.random()}`,
			value,
			type: isAffix ? 'AFFIX' : 'BASE_WORD'
		};

		updatedPlayers[playerIndex].hand.push(newCard);
		setGameState({
			...gameState,
			players: updatedPlayers
		});
	};

	// Bot AI logic
	useEffect(() => {
		if (!gameState || gameState.phase !== 'PLAYING') return;

		const currentPlayer = gameState.players[gameState.currentPlayerIndex];
		if (!currentPlayer || !currentPlayer.isBot) return;

		// Clear any existing timeout
		if (botTurnTimeoutRef.current) {
			clearTimeout(botTurnTimeoutRef.current);
		}

		// Bot thinks based on difficulty
		const thinkTime = gameConfig.difficulty === 'easy' ? 3000 :
			gameConfig.difficulty === 'medium' ? 2000 : 1000;

		botTurnTimeoutRef.current = setTimeout(() => {
			executeBotTurn(currentPlayer);
		}, thinkTime);

		return () => {
			if (botTurnTimeoutRef.current) {
				clearTimeout(botTurnTimeoutRef.current);
			}
		};
	}, [gameState?.currentPlayerIndex, gameState?.phase]);

	const executeBotTurn = async (bot) => {
		const tableCards = gameState.tableCards;
		const hand = bot.hand;
		const difficulty = gameConfig.difficulty;

		// Try to find valid word with difficulty-based intelligence
		let bestMove = null;
		let bestScore = 0;

		// Difficulty-based search strategy and rates
		let cardsToTry = hand;
		let positionsToTry = [];
		let validationRate = 1.0; // Default 100%
		let skipChance = 0; // Default 0%

		if (difficulty === 'easy') {
			// Easy: Validation 40%, Skip 60%
			cardsToTry = hand.slice(0, Math.min(2, hand.length)); // Only 2 cards
			positionsToTry = [0]; // Only try at the beginning
			validationRate = 0.4;
			skipChance = 0.6;
		} else if (difficulty === 'medium') {
			// Medium: Validation 60%, Skip 40%
			cardsToTry = hand.slice(0, Math.min(5, hand.length)); // 5 cards
			for (let i = 0; i <= tableCards.length; i++) {
				positionsToTry.push(i);
			}
			validationRate = 0.6;
			skipChance = 0.4;
		} else {
			// Hard: Validation 90%, Skip 10%
			cardsToTry = hand; // All cards
			for (let i = 0; i <= tableCards.length; i++) {
				positionsToTry.push(i);
			}
			validationRate = 0.9;
			skipChance = 0.1;
		}

		// Try cards and positions based on difficulty
		for (const card of cardsToTry) {
			for (const slotIndex of positionsToTry) {
				const testCards = [...tableCards];
				testCards.splice(slotIndex, 0, card);
				const word = testCards.map(c => c.value).join('').toLowerCase();

				if (word.length >= 3 && !wordHistory.includes(word)) {
					// Validation rate: Only validate X% of attempts based on difficulty
					if (Math.random() > validationRate) {
						continue; // Skip validation based on rate
					}

					const isValid = await quickValidateWord(word);
					if (isValid && word.length > bestScore) {
						bestMove = { card, slotIndex };
						bestScore = word.length;

						// Easy bots: Stop at first valid move (don't search for best)
						if (difficulty === 'easy') {
							break;
						}
					}
				}
			}
			if (difficulty === 'easy' && bestMove) {
				break; // Easy bots stop after first valid move
			}
		}

		// Skip chance: Chance to skip even if found valid move
		if (bestMove && Math.random() < skipChance) {
			bestMove = null; // Force skip
		}

		if (bestMove) {
			// Visual bot move: Show card being placed
			setIsBotMoving(true);

			// Show bot's card placement visually (like player drag & drop)
			const orderNumber = Date.now() + Math.random();
			setBotPlacedCards([{
				card: bestMove.card,
				slotIndex: bestMove.slotIndex,
				order: orderNumber
			}]);

			// Wait 2 seconds for visual feedback, then confirm
			setTimeout(async () => {
				const updatedPlayers = [...gameState.players];
				const botIndex = gameState.currentPlayerIndex;

				// Remove card from bot hand
				updatedPlayers[botIndex].hand = updatedPlayers[botIndex].hand.filter(
					c => c.id !== bestMove.card.id
				);

				// Build word for scoring
				const newTableCards = [...tableCards];
				newTableCards.splice(bestMove.slotIndex, 0, bestMove.card);
				const word = newTableCards.map(c => c.value).join('');
				updatedPlayers[botIndex].score += word.length;

				setWordHistory([...wordHistory, word]);
				setConsecutiveSkips(0);

				// RESET TABLE to new base card (not continuation!)
				// Only 2 characters, vowel+consonant, not "nd", "ng", "aa"
				const tableFragments = [];
				BASE_WORDS.forEach(w => {
					for (let i = 0; i < w.length; i++) {
						const segment = w.substring(i, i + 2);
						if (segment.length === 2 && isValidTableFragment(segment)) {
							tableFragments.push(segment);
						}
					}
				});

				const newRandomFragment = tableFragments[Math.floor(Math.random() * tableFragments.length)];
				const resetTableCard = {
					id: `table-reset-${Date.now()}-${Math.random()}`,
					value: newRandomFragment,
					type: 'BASE_WORD'
				};

				// Clear bot placed cards and reset
				setBotPlacedCards([]);
				setIsBotMoving(false);

				const newGameState = {
					...gameState,
					players: updatedPlayers,
					tableCards: [resetTableCard], // RESET to single new card!
					currentWord: newRandomFragment,
					currentPlayerIndex: (gameState.currentPlayerIndex + 1) % gameState.players.length
				};

				setGameState(newGameState);

				// Show alert with bot's move
				showToast('success', `${bot.name} bermain`, `Kata: ${word.toUpperCase()} (+${word.length} poin)`);

				console.log(`🤖 ${bot.name} played: ${word} (+${word.length} points). Table reset to: ${newRandomFragment}`);

				// Check if game should end
				setTimeout(() => {
					checkGameEnd(updatedPlayers);
				}, 100);
			}, 2000); // 2 second visual delay
		} else {
			// Bot skips
			const updatedPlayers = [...gameState.players];
			const botIndex = gameState.currentPlayerIndex;

			// Deduct 1 point if bot has points
			const hadPoints = updatedPlayers[botIndex].score > 0;
			if (updatedPlayers[botIndex].score > 0) {
				updatedPlayers[botIndex].score = Math.max(0, updatedPlayers[botIndex].score - 1);
			}

			// Show alert for bot skip
			showToast('info', `${bot.name} skip turn`, hadPoints ? '-1 poin' : '', 1500);

			console.log(`🤖 ${bot.name} skipped turn`);

			const newSkipCount = consecutiveSkips + 1;
			console.log(`Bot skip count: ${newSkipCount} / ${gameState.players.length}`);

			if (newSkipCount >= gameState.players.length) {
				console.log('All players skipped! Resetting table...');

				// Reset table: Only 2 characters, vowel+consonant, not "nd", "ng", "aa"
				const fragments = [];
				BASE_WORDS.forEach(word => {
					for (let i = 0; i < word.length; i++) {
						const segment = word.substring(i, i + 2);
						if (segment.length === 2 && isValidTableFragment(segment)) {
							fragments.push(segment);
						}
					}
				});

				const randomFragment = fragments[Math.floor(Math.random() * fragments.length)];
				const newCard = {
					id: `table-reset-${Date.now()}-${Math.random()}`,
					value: randomFragment,
					type: 'BASE_WORD'
				};

				console.log(`Bot triggered reset. New table card: ${newCard.value}`);

				const newGameState = {
					...gameState,
					players: updatedPlayers,
					tableCards: [newCard],
					currentWord: randomFragment,
					currentPlayerIndex: (gameState.currentPlayerIndex + 1) % gameState.players.length
				};

				setGameState(newGameState);
				setConsecutiveSkips(0);

				showToast('info', 'Meja direset', `Kartu baru: ${randomFragment.toUpperCase()}`);

				// Check if game should end
				setTimeout(() => {
					checkGameEnd(updatedPlayers);
				}, 100);
			} else {
				setConsecutiveSkips(newSkipCount);

				const newGameState = {
					...gameState,
					players: updatedPlayers,
					currentPlayerIndex: (gameState.currentPlayerIndex + 1) % gameState.players.length
				};

				setGameState(newGameState);

				// Check if game should end
				setTimeout(() => {
					checkGameEnd(updatedPlayers);
				}, 100);
			}
		}
	};

	// Check if game should end (any player has 0 cards)
	const checkGameEnd = (players) => {
		// Don't check if game already finished
		if (gameState?.phase === 'FINISHED') {
			return false;
		}

		const playerWithNoCards = players.find(p => p.hand.length === 0);

		if (playerWithNoCards) {
			// Game ends! Calculate penalties for players with remaining cards
			const updatedPlayers = players.map(player => {
				if (player.hand.length > 0) {
					// Calculate penalty: sum of all card character lengths
					const penalty = player.hand.reduce((sum, card) => sum + card.value.length, 0);
					const newScore = Math.max(0, player.score - penalty);

					return {
						...player,
						score: newScore,
						penalty: penalty // Store penalty for display
					};
				}
				// Player who finished first gets +10 bonus points
				return {
					...player,
					score: player.score + 10,
					penalty: 0,
					finishedFirst: true
				};
			});

			// Find winner (highest score)
			const winner = updatedPlayers.reduce((prev, current) =>
				(current.score > prev.score) ? current : prev
			);

			setGameState(prevState => ({
				...prevState,
				players: updatedPlayers,
				phase: 'FINISHED',
				winnerId: winner.id
			}));

			// Show game over toast
			setTimeout(() => {
				showToast('success', 'Game Over!', `${winner.name} menang dengan ${winner.score} poin!`, 4000);
			}, 500);

			return true; // Game ended
		}

		return false; // Game continues
	};

	const quickValidateWord = async (word) => {
		// Validate via server proxy (fixes CORS)
		try {
			const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
			const response = await fetch(`${serverUrl}/api/validate/${encodeURIComponent(word)}`, {
				headers: { 'Accept': 'application/json' },
				signal: AbortSignal.timeout(5000) // 5 second timeout for bots
			});

			if (response.ok) {
				const data = await response.json();
				return data.valid === true;
			}
		} catch (error) {
			console.error('KBBI API proxy error for bot:', error);
		}

		return false;
	};

	// Build display with slots
	const buildTableDisplay = () => {
		const slots = [];

		// Build merged cards array (table + placed by player + placed by bot)
		let mergedCards = [...gameState.tableCards];

		// Add player placed cards
		if (placedCards.length > 0) {
			// Sort placements by order (chronological)
			const sortedPlacements = [...placedCards].sort((a, b) => a.order - b.order);

			// Insert each card at its slot index, one by one
			sortedPlacements.forEach((placement) => {
				const insertAt = Math.min(placement.slotIndex, mergedCards.length);
				mergedCards.splice(insertAt, 0, placement.card);
			});
		}

		// Add bot placed cards (visual feedback)
		if (botPlacedCards.length > 0) {
			const sortedBotPlacements = [...botPlacedCards].sort((a, b) => a.order - b.order);
			sortedBotPlacements.forEach((placement) => {
				const insertAt = Math.min(placement.slotIndex, mergedCards.length);
				mergedCards.splice(insertAt, 0, placement.card);
			});
		}

		// Add slot before first card
		slots.push({ type: 'slot', index: 0 });

		// Add cards and slots between
		mergedCards.forEach((card, idx) => {
			const isPlaced = placedCards.some(p => p.card.id === card.id);
			const isBotPlaced = botPlacedCards.some(p => p.card.id === card.id);
			slots.push({ type: 'card', card, isPlaced, isBotPlaced });
			slots.push({ type: 'slot', index: idx + 1 });
		});

		return slots;
	};

	if (loading || !gameState) {
		return (
			<div className="game-page">
				<div className="container text-center">
					<div className="spinner"></div>
					<p className="mt-2">Memulai game...</p>
				</div>
			</div>
		);
	}

	const isMyTurn = gameState.currentPlayerIndex === 0;
	const hasPlacedCard = placedCards.length > 0;

	return (
		<div className="game-page">
			<div className="game-header">
				<h1>Card Game BISINDO</h1>
				<button className="btn-secondary" onClick={handleBackToHome}>
					Keluar Room
				</button>
			</div>

			<div className="game-container">
				{gameState.phase === 'WAITING' && (
					<div className="waiting-screen card">
						<h2>🤖 Mode Bot</h2>
						<div className="players-list">
							{gameState.players.map((player) => (
								<div key={player.id} className="player-item">
									<span>
										{player.isBot && '🤖 '}
										{player.name}
									</span>
								</div>
							))}
						</div>
						<p className="mt-3">Game akan dimulai...</p>
					</div>
				)}

				{gameState.phase === 'PLAYING' && (
					<div className="game-board">
						{/* Header with Timer */}
						<div className="game-header-solo">
							<div className="player-turn-info">
								<h3>
									{isMyTurn
										? `Giliran Anda (${gameConfig.playerName})`
										: `Giliran ${gameState.players[gameState.currentPlayerIndex].name}`}
								</h3>
							</div>
							{isMyTurn && (
								<div className="timer-display">
									<span className="timer-value">{timeLeft}s</span>
								</div>
							)}
						</div>

						{/* Opponents */}
						<div className="opponents">
							{gameState.players
								.filter(p => p.id !== 'player')
								.map((player) => (
									<div key={player.id} className="opponent-card card">
										<div className="player-info">
											<span>{player.isBot && '[BOT] '}{player.name}</span>
											<span className="card-count">{player.hand.length} kartu</span>
										</div>
										<div className="player-score">Skor: {player.score}</div>
									</div>
								))}
						</div>

						{/* Table Area with Drag & Drop */}
						<div className="table-section">
							<h3>Kata di Meja: {
								(() => {
									let mergedCards = [...gameState.tableCards];
									// Add player placed cards
									if (placedCards.length > 0) {
										const sortedPlacements = [...placedCards].sort((a, b) => a.order - b.order);
										sortedPlacements.forEach((placement) => {
											const insertAt = Math.min(placement.slotIndex, mergedCards.length);
											mergedCards.splice(insertAt, 0, placement.card);
										});
									}
									// Add bot placed cards
									if (botPlacedCards.length > 0) {
										const sortedBotPlacements = [...botPlacedCards].sort((a, b) => a.order - b.order);
										sortedBotPlacements.forEach((placement) => {
											const insertAt = Math.min(placement.slotIndex, mergedCards.length);
											mergedCards.splice(insertAt, 0, placement.card);
										});
									}
									return mergedCards.map(c => c.value).join('').toUpperCase();
								})()
							}</h3>

							<div className="play-area">
								<div className="cards-display">
									{buildTableDisplay().map((item, idx) => {
										if (item.type === 'slot') {
											const showSlot = isMyTurn && selectedCard;
											return (
												<div
													key={`slot-${item.index}`}
													className={`card-slot ${showSlot ? 'active' : ''}`}
													onClick={() => showSlot && handleSlotClick(item.index)}
													onDragOver={showSlot ? handleDragOver : undefined}
													onDrop={(e) => showSlot && handleDrop(e, item.index)}
												>
													{showSlot && (
														<div className="slot-indicator">
															<span className="slot-number">{item.index}</span>
														</div>
													)}
												</div>
											);
										} else {
											return (
												<div
													key={`card-${idx}`}
													className={`game-card ${item.isPlaced ? 'placed-card' : ''} ${item.isBotPlaced ? 'bot-placed-card' : ''}`}
													style={{
														backgroundColor: item.isBotPlaced ? '#fbbf24' : '#60a5fa' // Yellow for bot, blue for player
													}}
												>
													<div className="card-type">{item.card.type === 'AFFIX' ? 'IMBUHAN' : 'BASE'}</div>
													<div className="card-value">{item.card.value}</div>
													{item.isPlaced && <div className="placed-badge">Baru</div>}
													{item.isBotPlaced && <div className="bot-badge">Bot</div>}
												</div>
											);
										}
									})}
								</div>
							</div>

							{/* Instructions */}
							{isMyTurn && selectedCard && (
								<p className="placement-instruction">
									Klik nomor slot atau drag kartu ke posisi yang diinginkan
								</p>
							)}

							{/* Action Buttons */}
							{isMyTurn && (
								<div className="action-buttons-solo">
									{hasPlacedCard && (
										<>
											<button
												className="btn-primary"
												onClick={handleConfirmPlacement}
												disabled={isValidating}
											>
												{isValidating ? 'Validasi...' : `Konfirmasi Kata (${placedCards.length} kartu)`}
											</button>
											<button className="btn-secondary" onClick={handleCancelPlacement}>
												Batalkan
											</button>
										</>
									)}
									{isMyTurn && (
										<button
											className="btn-secondary"
											onClick={handleSwapCards}
											disabled={swapCount >= (gameConfig?.difficulty === 'easy' ? 5 : gameConfig?.difficulty === 'medium' ? 2 : 0)}
										>
											Tukar Kartu ({swapCount}/{gameConfig?.difficulty === 'easy' ? 5 : gameConfig?.difficulty === 'medium' ? 2 : 0})
										</button>
									)}
									<button className="btn-secondary" onClick={handleSkipTurn}>
										Skip Turn
									</button>
								</div>
							)}
						</div>

						{/* Player Hand */}
						<div className="player-section card">
							<div className="player-info">
								<h3>{gameConfig.playerName}</h3>
								<div className="player-score">Skor: {gameState.players[0].score}</div>
							</div>
							<div className="player-hand">
								{gameState.players[0].hand.map((card) => {
									const isSelected = selectedCard?.id === card.id;
									const alreadyPlaced = placedCards.some(p => p.card.id === card.id);
									const isDisabled = !isMyTurn || alreadyPlaced;

									return (
										<div
											key={card.id}
											className={`game-card ${!isDisabled ? 'clickable' : 'disabled'} ${isSelected ? 'selected' : ''}`}
											style={{
												backgroundColor: card.type === 'BASE_WORD' ? '#22c55e' : '#fbbf24',
												opacity: isDisabled ? 0.5 : 1,
												cursor: isDisabled ? 'not-allowed' : 'grab'
											}}
											draggable={!isDisabled}
											onDragStart={(e) => !isDisabled && handleDragStart(e, card)}
											onClick={() => !isDisabled && handleCardClick(card)}
										>
											<div className="card-type">{card.type === 'BASE_WORD' ? 'BASE' : 'IMBUHAN'}</div>
											<div className="card-value">{card.value}</div>
											{isSelected && <div className="selection-badge">✓</div>}
										</div>
									);
								})}
							</div>
						</div>
					</div>
				)}

				{gameState.phase === 'FINISHED' && (
					<div className="game-finished card">
						<h1 className="game-over-title">Game Over!</h1>
						<div className="winner-section">
							<h2>🏆 Pemenang: {gameState.players.find(p => p.id === gameState.winnerId)?.name || 'Unknown'}</h2>
						</div>

						<div className="final-scores">
							<h3>Skor Akhir</h3>
							<div className="scores-list">
								{gameState.players
									.sort((a, b) => b.score - a.score)
									.map((player, index) => (
										<div key={player.id} className={`score-item ${player.id === gameState.winnerId ? 'winner' : ''}`}>
											<div className="score-rank">
												{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
											</div>
											<div className="score-info">
												<div className="score-name">
													{player.isBot && '[BOT] '}{player.name}
													{player.id === gameState.winnerId && <span className="winner-badge"> (Pemenang)</span>}
												</div>
												<div className="score-details">
													{player.finishedFirst && (
														<span className="bonus-text">Bonus: +10 poin (habis duluan)</span>
													)}
													{player.penalty > 0 && (
														<span className="penalty-text">Penalty: -{player.penalty} poin</span>
													)}
												</div>
											</div>
											<div className="score-value">{player.score} poin</div>
										</div>
									))}
							</div>
						</div>

						<button className="btn-primary mt-3" onClick={handleBackToHome}>
							Kembali ke Home
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

export default GameSolo;
