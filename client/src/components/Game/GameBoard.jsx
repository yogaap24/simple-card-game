import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useSocket } from '../../context/SocketContext';
import PlayerHand from './PlayerHand';
import TableCards from './TableCards';
import PlayerList from './PlayerList';
import TurnTimer from './TurnTimer';
import ChallengeModal from './ChallengeModal';
import CardPlacement from './CardPlacement';
import './GameBoard.css';

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
		width: '350px'
	});
};

function GameBoard({ gameState, currentUserId }) {
	const navigate = useNavigate();
	const { emit, CLIENT_EVENTS } = useSocket();
	const [selectedCards, setSelectedCards] = useState([]);
	const [showChallenge, setShowChallenge] = useState(false);
	const [showPlacement, setShowPlacement] = useState(false);
	const [wordInfo, setWordInfo] = useState(null);

	const currentPlayer = gameState.players.find(p => p.id === currentUserId);
	const isMyTurn = gameState.currentPlayer === currentUserId;
	const currentWord = gameState.tableCards.map(c => c.value).join('');

	// Update word info when game state changes
	useEffect(() => {
		if (gameState.lastValidation) {
			setWordInfo(gameState.lastValidation);
		}
	}, [gameState]);

	const handleCardSelect = (card) => {
		if (!isMyTurn) return;

		// Toggle card selection
		setSelectedCards(prev => {
			const isSelected = prev.some(c => c.id === card.id);
			if (isSelected) {
				return prev.filter(c => c.id !== card.id);
			} else {
				return [...prev, card];
			}
		});
	};

	const handlePlaceCards = (leftZone, rightZone) => {
		if (!isMyTurn) return;

		const leftCardIds = leftZone.map(c => c.id);
		const rightCardIds = rightZone.map(c => c.id);

		emit(CLIENT_EVENTS.PLAY_CARD, { leftCardIds, rightCardIds });
		setSelectedCards([]);
		setShowPlacement(false);
	};

	const handleShowPlacement = () => {
		if (selectedCards.length === 0) {
			showToast('warning', 'Pilih kartu', 'Pilih kartu terlebih dahulu');
			return;
		}
		setShowPlacement(true);
	};

	const handleSkipTurn = () => {
		if (!isMyTurn) return;
		emit(CLIENT_EVENTS.SKIP_TURN);
	};

	const handleLeaveGame = () => {
		emit(CLIENT_EVENTS.LEAVE_ROOM);
		navigate('/lobby');
	};

	const handleChallenge = () => {
		setShowChallenge(true);
	};

	if (gameState.phase === 'FINISHED') {
		const winner = gameState.players.find(p => p.id === gameState.winnerId);
		return (
			<div className="game-finished container text-center">
				<div className="card">
					<h1>Game Over!</h1>
					<h2>Winner: {winner?.username || 'Unknown'}</h2>
					<div className="final-scores">
						<h3>Final Scores</h3>
						{gameState.players.map(player => (
							<div key={player.id} className="score-item">
								<span>{player.username}</span>
								<span>{player.score} points</span>
							</div>
						))}
					</div>
					<button className="btn-primary mt-3" onClick={handleLeaveGame}>
						Return to Lobby
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="game-board-container">
			<div className="game-board">
				{/* Header */}
				<div className="game-header">
					<div className="game-info">
						<h2>Card Game BISINDO</h2>
						<div className="deck-info">
							<span>Deck: {gameState.deckSize} cards</span>
						</div>
					</div>
					<TurnTimer
						timeLeft={gameState.turnTimer}
						isMyTurn={isMyTurn}
					/>
					<button className="btn-danger btn-small" onClick={handleLeaveGame}>
						Keluar Room
					</button>
				</div>

				{/* Main Game Area */}
				<div className="game-main">
					{/* Players List */}
					<div className="players-sidebar">
						<PlayerList
							players={gameState.players}
							currentPlayerId={gameState.currentPlayer}
							currentUserId={currentUserId}
						/>
					</div>

					{/* Center Play Area */}
					<div className="play-area">
						{/* Table Cards */}
						<TableCards
							cards={gameState.tableCards}
							currentWord={currentWord}
							onChallenge={handleChallenge}
							canChallenge={!isMyTurn && currentWord.length > 0}
							wordInfo={wordInfo}
						/>

						{/* Play Controls */}
						{isMyTurn && (
							<div className="play-controls">
								{selectedCards.length > 0 ? (
									<div className="card-actions">
										<p className="selected-info">
											Terpilih: <strong>{selectedCards.map(c => c.value).join(', ')}</strong>
										</p>
										<div className="action-buttons">
											<button
												className="btn-primary"
												onClick={handleShowPlacement}
											>
												Atur Posisi Kartu
											</button>
											<button
												className="btn-secondary"
												onClick={() => setSelectedCards([])}
											>
												Batal
											</button>
										</div>
									</div>
								) : (
									<div className="turn-info">
										<p>Giliran Anda! Pilih kartu untuk dimainkan</p>
										<button
											className="btn-secondary"
											onClick={handleSkipTurn}
										>
											Skip (Ambil Kartu)
										</button>
									</div>
								)}
							</div>
						)}

						{!isMyTurn && (
							<div className="waiting-turn">
								<p>Waiting for {gameState.players.find(p => p.id === gameState.currentPlayer)?.username}'s turn...</p>
							</div>
						)}
					</div>
				</div>

				{/* Player Hand */}
				<div className="player-hand-section">
					<PlayerHand
						cards={currentPlayer?.hand || []}
						selectedCards={selectedCards}
						onCardSelect={handleCardSelect}
						disabled={!isMyTurn}
					/>
				</div>
			</div>

			{/* Challenge Modal */}
			{showChallenge && gameState.activeChallenge && (
				<ChallengeModal
					challenge={gameState.activeChallenge}
					currentUserId={currentUserId}
					onClose={() => setShowChallenge(false)}
				/>
			)}

			{/* Card Placement Modal */}
			{showPlacement && (
				<CardPlacement
					selectedCards={selectedCards}
					tableCards={gameState.tableCards}
					onPlaceCards={handlePlaceCards}
					onCancel={() => setShowPlacement(false)}
				/>
			)}
		</div>
	);
}

export default GameBoard;

