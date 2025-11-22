import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5001';

const AuthContext = createContext(null);

// Development-only logging
const devError = (...args) => {
	if (import.meta.env.DEV) {
		console.error(...args);
	}
};

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [token, setToken] = useState(localStorage.getItem('token'));
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Check if user is logged in on mount
		const storedUser = localStorage.getItem('user');

		if (storedUser) {
			try {
				const parsedUser = JSON.parse(storedUser);
				setUser(parsedUser);
				setLoading(false);

				// If it's a registered user with token, verify it
				if (token && !parsedUser.isGuest) {
					verifyToken();
				}
			} catch (e) {
				devError('Failed to parse stored user:', e);
				setLoading(false);
			}
		} else if (token) {
			verifyToken();
		} else {
			setLoading(false);
		}
	}, []);

	const verifyToken = async () => {
		try {
			const response = await axios.get('/api/auth/me', {
				headers: { Authorization: `Bearer ${token}` }
			});
			setUser(response.data.user);
		} catch (error) {
			devError('Token verification failed:', error);
			logout();
		} finally {
			setLoading(false);
		}
	};

	const register = async (username, email, password) => {
		try {
			const response = await axios.post('/api/auth/register', {
				username,
				email,
				password
			});

			const { token, user } = response.data;
			setToken(token);
			setUser(user);
			localStorage.setItem('token', token);
			localStorage.setItem('user', JSON.stringify(user));
			return { success: true, user };
		} catch (error) {
			return {
				success: false,
				error: error.response?.data?.error || 'Registration failed'
			};
		}
	};

	const login = async (email, password) => {
		try {
			const response = await axios.post('/api/auth/login', {
				email,
				password
			});

			const { token, user } = response.data;
			setToken(token);
			setUser(user);
			localStorage.setItem('token', token);
			localStorage.setItem('user', JSON.stringify(user));
			return { success: true, user };
		} catch (error) {
			return {
				success: false,
				error: error.response?.data?.error || 'Login failed'
			};
		}
	};

	const guestLogin = (username) => {
		const guestUser = {
			id: `guest-${Date.now()}`,
			username,
			isGuest: true
		};
		setUser(guestUser);
		localStorage.setItem('user', JSON.stringify(guestUser));
		return { success: true, user: guestUser };
	};

	const logout = () => {
		setUser(null);
		setToken(null);
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		sessionStorage.removeItem('gameUser');
	};

	const value = {
		user,
		token,
		loading,
		register,
		login,
		guestLogin,
		logout,
		isAuthenticated: !!user
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within AuthProvider');
	}
	return context;
};

