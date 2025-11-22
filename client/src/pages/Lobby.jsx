import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import './Lobby.css';

function Lobby() {
	const navigate = useNavigate();
	const { user, logout } = useAuth();
	const { emit, on, off, authenticateUser, CLIENT_EVENTS, SERVER_EVENTS, connected } = useSocket();

	const [rooms, setRooms] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!user) {
			navigate('/');
			return;
		}

		// Make sure user is authenticated with socket server
		if (connected && user.isGuest) {
			authenticateUser(user);
		}

		if (connected) {
			loadRooms();
		}
	}, [user, connected]);

	useEffect(() => {
		if (!connected) return;

		const handleRoomCreated = (data) => {
			setLoading(false);
			navigate(`/game/${data.roomId}`);
		};

		const handleRoomJoined = (data) => {
			setLoading(false);
			navigate(`/game/${data.roomId}`);
		};

		const handleError = (data) => {
			setError(data.message);
			setLoading(false);
			setTimeout(() => setError(''), 5000);
		};

		const handleRoomsList = (data) => {
			setRooms(data.rooms);
		};

		on(SERVER_EVENTS.ROOM_CREATED, handleRoomCreated);
		on(SERVER_EVENTS.ROOM_JOINED, handleRoomJoined);
		on(SERVER_EVENTS.ERROR, handleError);
		on(SERVER_EVENTS.ROOMS_LIST, handleRoomsList);

		return () => {
			off(SERVER_EVENTS.ROOM_CREATED, handleRoomCreated);
			off(SERVER_EVENTS.ROOM_JOINED, handleRoomJoined);
			off(SERVER_EVENTS.ERROR, handleError);
			off(SERVER_EVENTS.ROOMS_LIST, handleRoomsList);
		};
	}, [connected]);

	const loadRooms = () => {
		emit(CLIENT_EVENTS.GET_ROOMS);
	};

	const handleCreateRoom = (withBots = false) => {
		setLoading(true);
		setError('');
		emit(CLIENT_EVENTS.CREATE_ROOM, { withBots, botCount: 3 });
	};

	const handleJoinRoom = (roomId) => {
		setLoading(true);
		setError('');
		emit(CLIENT_EVENTS.JOIN_ROOM, { roomId });
	};

	const handleLogout = () => {
		logout();
		navigate('/');
	};

	return (
		<div className="lobby-page">
			<div className="lobby-container container">
				<div className="lobby-header">
					<div>
						<h1>Game Lobby</h1>
						<p className="user-info">
							Welcome, <strong>{user?.username}</strong>
							{user?.isGuest && ' (Guest)'}
						</p>
					</div>
					<button className="btn-secondary" onClick={handleLogout}>
						Logout
					</button>
				</div>

				{error && <div className="error-text text-center mb-3">{error}</div>}

				<div className="lobby-content">
					<div className="create-room-section card fade-in">
						<h2>Create New Room</h2>
						<p>Start a new game and invite friends to join</p>
						<div className="create-room-buttons">
							<button
								className="btn-primary btn-large"
								onClick={() => handleCreateRoom(false)}
								disabled={loading || !connected}
							>
								{loading ? 'Creating...' : 'Multiplayer Room'}
							</button>
							<button
								className="btn-success btn-large"
								onClick={() => handleCreateRoom(true)}
								disabled={loading || !connected}
							>
								{loading ? 'Creating...' : 'VS Bots (Solo)'}
							</button>
						</div>
						<p className="create-room-hint">
							VS Bots mode: Perfect for testing and solo practice!
						</p>
					</div>

					<div className="rooms-section card fade-in">
						<div className="rooms-header">
							<h2>Available Rooms</h2>
							<button
								className="btn-secondary"
								onClick={loadRooms}
								disabled={!connected}
							>
								Refresh
							</button>
						</div>

						{!connected && (
							<div className="text-center">
								<div className="spinner"></div>
								<p className="mt-2">Connecting to server...</p>
							</div>
						)}

						{connected && rooms.length === 0 && (
							<div className="empty-state">
								<p>No rooms available</p>
								<p className="text-secondary">Create a new room to start playing!</p>
							</div>
						)}

						{connected && rooms.length > 0 && (
							<div className="rooms-list">
								{rooms.map((room) => (
									<div key={room.roomId} className="room-item">
										<div className="room-info">
											<div className="room-id">
												Room: {room.roomId}
												{room.hasBots && <span className="bot-badge">[BOTS]</span>}
											</div>
											<div className="room-host">Host: {room.hostUsername}</div>
											<div className="room-players">
												{room.hasBots ? (
													<>
														Players: {room.humanPlayerCount || 0} human + {room.playerCount - (room.humanPlayerCount || 0)} bot(s)
													</>
												) : (
													<>
														Players: {room.playerCount}/{room.maxPlayers}
													</>
												)}
											</div>
										</div>
										{room.status === 'WAITING' ? (
											<button
												className="btn-primary"
												onClick={() => handleJoinRoom(room.roomId)}
												disabled={loading || room.playerCount >= room.maxPlayers}
											>
												{room.playerCount >= room.maxPlayers ? 'Full' : 'Join'}
											</button>
										) : (
											<button className="btn-secondary" disabled>
												In Game
											</button>
										)}
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default Lobby;

