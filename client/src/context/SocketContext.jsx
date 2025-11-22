import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../../../shared/events';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
	const [socket, setSocket] = useState(null);
	const [connected, setConnected] = useState(false);
	const [authenticated, setAuthenticated] = useState(false);

	useEffect(() => {
		// Initialize socket connection
		const newSocket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000', {
			autoConnect: true,
			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionAttempts: 5
		});

		newSocket.on('connect', () => {
			console.log('✅ Connected to server');
			setConnected(true);

			// Re-authenticate on reconnect if user exists
			const userData = sessionStorage.getItem('gameUser');
			if (userData) {
				try {
					const user = JSON.parse(userData);
					if (user.isGuest) {
						console.log('🔄 Re-authenticating guest user:', user.username);
						newSocket.emit(CLIENT_EVENTS.GUEST_LOGIN, { username: user.username });
					}
				} catch (e) {
					console.error('Failed to parse user data:', e);
				}
			}
		});

		newSocket.on('disconnect', () => {
			console.log('❌ Disconnected from server');
			setConnected(false);
			setAuthenticated(false);
		});

		newSocket.on('connect_error', (error) => {
			console.error('Connection error:', error);
			setConnected(false);
		});

		newSocket.on(SERVER_EVENTS.AUTH_SUCCESS, () => {
			console.log('✅ Authenticated with server');
			setAuthenticated(true);
		});

		setSocket(newSocket);

		// Cleanup on unmount
		return () => {
			newSocket.close();
		};
	}, []);

	const emit = (event, data) => {
		if (socket && connected) {
			socket.emit(event, data);
		} else {
			console.error('Socket not connected');
		}
	};

	const on = (event, callback) => {
		if (socket) {
			socket.on(event, callback);
		}
	};

	const off = (event, callback) => {
		if (socket) {
			socket.off(event, callback);
		}
	};

	const authenticateUser = (user) => {
		if (user && user.isGuest) {
			// Store in sessionStorage for re-auth on reconnect
			sessionStorage.setItem('gameUser', JSON.stringify(user));

			if (connected) {
				console.log('🔐 Authenticating user with server:', user.username);
				socket.emit(CLIENT_EVENTS.GUEST_LOGIN, { username: user.username });
			}
		}
	};

	const value = {
		socket,
		connected,
		authenticated,
		authenticateUser,
		emit,
		on,
		off,
		CLIENT_EVENTS,
		SERVER_EVENTS
	};

	return (
		<SocketContext.Provider value={value}>
			{children}
		</SocketContext.Provider>
	);
};

export const useSocket = () => {
	const context = useContext(SocketContext);
	if (!context) {
		throw new Error('useSocket must be used within SocketProvider');
	}
	return context;
};

