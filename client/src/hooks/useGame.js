import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export const useGame = () => {
	const { socket, on, off, emit, SERVER_EVENTS, CLIENT_EVENTS } = useSocket();
	const [gameState, setGameState] = useState(null);
	const [error, setError] = useState(null);
	const [notification, setNotification] = useState(null);

	useEffect(() => {
		if (!socket) return;

		// Listen for game state updates
		const handleGameStateUpdate = (data) => {
			setGameState(data.gameState);
		};

		const handleRoomCreated = (data) => {
			setGameState(data.gameState);
		};

		const handleRoomJoined = (data) => {
			setGameState(data.gameState);
		};

		const handleGameStarted = (data) => {
			setGameState(data.gameState);
			setNotification('Game has started!');
		};

		const handleGameEnded = (data) => {
			setNotification(`Game ended! Winner: ${data.winner}`);
		};

		const handleCardPlayed = (data) => {
			let message = `Word played: ${data.word} (+${data.points} points)`;
			if (data.wordInfo && data.wordInfo.derivedWords && data.wordInfo.derivedWords.length > 0) {
				message += ` | Related: ${data.wordInfo.derivedWords.slice(0, 3).join(', ')}`;
			}
			setNotification(message);
		};

		const handleTurnChanged = (data) => {
			// Turn changed notification
		};

		const handleError = (data) => {
			setError(data.message);
			setTimeout(() => setError(null), 5000);
		};

		const handleInvalidMove = (data) => {
			setError(data.message);
			setTimeout(() => setError(null), 5000);
		};

		// Register event listeners
		on(SERVER_EVENTS.ROOM_CREATED, handleRoomCreated);
		on(SERVER_EVENTS.ROOM_JOINED, handleRoomJoined);
		on(SERVER_EVENTS.GAME_STATE_UPDATE, handleGameStateUpdate);
		on(SERVER_EVENTS.GAME_STARTED, handleGameStarted);
		on(SERVER_EVENTS.GAME_ENDED, handleGameEnded);
		on(SERVER_EVENTS.CARD_PLAYED, handleCardPlayed);
		on(SERVER_EVENTS.TURN_CHANGED, handleTurnChanged);
		on(SERVER_EVENTS.ERROR, handleError);
		on(SERVER_EVENTS.INVALID_MOVE, handleInvalidMove);

		// Cleanup
		return () => {
			off(SERVER_EVENTS.ROOM_CREATED, handleRoomCreated);
			off(SERVER_EVENTS.ROOM_JOINED, handleRoomJoined);
			off(SERVER_EVENTS.GAME_STATE_UPDATE, handleGameStateUpdate);
			off(SERVER_EVENTS.GAME_STARTED, handleGameStarted);
			off(SERVER_EVENTS.GAME_ENDED, handleGameEnded);
			off(SERVER_EVENTS.CARD_PLAYED, handleCardPlayed);
			off(SERVER_EVENTS.TURN_CHANGED, handleTurnChanged);
			off(SERVER_EVENTS.ERROR, handleError);
			off(SERVER_EVENTS.INVALID_MOVE, handleInvalidMove);
		};
	}, [socket]);

	const playCard = (cardId, position = 'back') => {
		emit(CLIENT_EVENTS.PLAY_CARD, { cardId, position });
	};

	const drawCard = () => {
		emit(CLIENT_EVENTS.DRAW_CARD);
	};

	const skipTurn = () => {
		emit(CLIENT_EVENTS.SKIP_TURN);
	};

	const setPlayerReady = (ready) => {
		emit(CLIENT_EVENTS.PLAYER_READY, { ready });
	};

	return {
		gameState,
		error,
		notification,
		playCard,
		drawCard,
		skipTurn,
		setPlayerReady
	};
};

