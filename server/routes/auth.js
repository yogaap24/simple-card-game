import express from 'express';
import User from '../models/User.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
	try {
		const { username, email, password } = req.body;

		// Validation
		if (!username || !email || !password) {
			return res.status(400).json({ error: 'All fields are required' });
		}

		if (username.length < 3 || username.length > 20) {
			return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
		}

		if (password.length < 6) {
			return res.status(400).json({ error: 'Password must be at least 6 characters' });
		}

		// Check if user already exists
		const existingUser = await User.findOne({
			$or: [{ email }, { username }]
		});

		if (existingUser) {
			if (existingUser.email === email) {
				return res.status(400).json({ error: 'Email already registered' });
			}
			return res.status(400).json({ error: 'Username already taken' });
		}

		// Create new user
		const user = await User.create({ username, email, password });

		// Generate token
		const token = generateToken(user.id);

		res.status(201).json({
			message: 'User registered successfully',
			token,
			user: {
				id: user.id,
				username: user.username,
				email: user.email
			}
		});
	} catch (error) {
		console.error('Registration error:', error);
		res.status(500).json({ error: 'Server error during registration' });
	}
});

// Login
router.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body;

		// Validation
		if (!email || !password) {
			return res.status(400).json({ error: 'Email and password are required' });
		}

		// Find user
		const user = await User.findOne({ where: { email } });
		if (!user) {
			return res.status(401).json({ error: 'Invalid email or password' });
		}

		// Check password
		const isMatch = await user.comparePassword(password);
		if (!isMatch) {
			return res.status(401).json({ error: 'Invalid email or password' });
		}

		// Generate token
		const token = generateToken(user.id);

		res.json({
			message: 'Login successful',
			token,
			user: {
				id: user.id,
				username: user.username,
				email: user.email,
				gamesPlayed: user.gamesPlayed,
				gamesWon: user.gamesWon,
				totalScore: user.totalScore
			}
		});
	} catch (error) {
		console.error('Login error:', error);
		res.status(500).json({ error: 'Server error during login' });
	}
});

// Get current user profile (protected route)
router.get('/me', authenticateToken, async (req, res) => {
	try {
		const user = await User.findByPk(req.user.userId, {
			attributes: { exclude: ['password'] }
		});
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		res.json({
			user: {
				id: user.id,
				username: user.username,
				email: user.email,
				gamesPlayed: user.gamesPlayed,
				gamesWon: user.gamesWon,
				totalScore: user.totalScore
			}
		});
	} catch (error) {
		console.error('Get profile error:', error);
		res.status(500).json({ error: 'Server error' });
	}
});

export default router;

