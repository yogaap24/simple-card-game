import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticateToken = async (req, res, next) => {
	try {
		const authHeader = req.headers['authorization'];
		const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

		if (!token) {
			return res.status(401).json({ error: 'Access token required' });
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

		// Check if user still exists
		const user = await User.findByPk(decoded.userId);
		if (!user) {
			return res.status(401).json({ error: 'User not found' });
		}

		req.user = {
			userId: user.id,
			username: user.username,
			email: user.email
		};

		next();
	} catch (error) {
		console.error('Auth middleware error:', error);
		return res.status(403).json({ error: 'Invalid or expired token' });
	}
};

export const generateToken = (userId) => {
	return jwt.sign(
		{ userId },
		process.env.JWT_SECRET || 'your_jwt_secret',
		{ expiresIn: '7d' }
	);
};

