import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../hooks/useGame';
import WaitingRoom from '../components/Lobby/WaitingRoom';
import GameBoard from '../components/Game/GameBoard';
import './Game.css';

function Game() {
	const { roomId } = useParams();
	const navigate = useNavigate();
	const { user } = useAuth();
	const { connected } = useSocket();
	const { gameState, error, notification } = useGame();

	useEffect(() => {
		if (!user) {
			navigate('/');
			return;
		}
	}, [user, navigate]);

	if (!connected) {
		return (
			<div className="game-page">
				<div className="container text-center">
					<div className="spinner"></div>
					<p className="mt-2">Connecting to game...</p>
				</div>
			</div>
		);
	}

	if (!gameState) {
		return (
			<div className="game-page">
				<div className="container text-center">
					<div className="spinner"></div>
					<p className="mt-2">Loading game...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="game-page">
			{error && (
				<div className="notification error-notification fade-in">
					{error}
				</div>
			)}

			{notification && (
				<div className="notification success-notification fade-in">
					{notification}
				</div>
			)}

			{gameState.phase === 'WAITING' ? (
				<WaitingRoom gameState={gameState} roomId={roomId} />
			) : (
				<GameBoard gameState={gameState} currentUserId={user?.id} />
			)}
		</div>
	);
}

export default Game;

