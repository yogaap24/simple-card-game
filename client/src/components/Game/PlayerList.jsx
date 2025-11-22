import './PlayerList.css';

function PlayerList({ players, currentPlayerId, currentUserId }) {
	return (
		<div className="player-list">
			<h3 className="player-list-title">Players</h3>
			<div className="player-items">
				{players.map((player) => {
					const isCurrentTurn = player.id === currentPlayerId;
					const isMe = player.id === currentUserId;

					return (
						<div
							key={player.id}
							className={`player-list-item ${isCurrentTurn ? 'current-turn' : ''} ${isMe ? 'is-me' : ''}`}
						>
							<div className="player-avatar">
								{player.username.charAt(0).toUpperCase()}
							</div>
							<div className="player-details">
								<div className="player-username">
									{player.username}
									{isMe && ' (You)'}
								</div>
								<div className="player-stats">
									<span>🎴 {player.handSize} cards</span>
									<span>⭐ {player.score} pts</span>
								</div>
							</div>
							{isCurrentTurn && (
								<div className="turn-indicator">
									👉
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default PlayerList;

