import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import authRoutes from './routes/auth.js';
import { setupSocketHandlers } from './socket/gameSocket.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.IO setup with CORS
const io = new Server(httpServer, {
	cors: {
		origin: process.env.CLIENT_URL || 'http://localhost:5173',
		methods: ['GET', 'POST'],
		credentials: true
	}
});

// Middleware
app.use(cors({
	origin: process.env.CLIENT_URL || 'http://localhost:5173',
	credentials: true
}));
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
	res.json({ status: 'ok', message: 'Server is running' });
});

// KBBI API Proxy endpoint (fix CORS)
app.get('/api/validate/:word', async (req, res) => {
	try {
		const { word } = req.params;

		// Proxy request to KBBI API
		const kbbiUrl = `https://kbbi.raf555.dev/api/v1/entry/${encodeURIComponent(word)}`;

		const response = await fetch(kbbiUrl, {
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'CardGameBISINDO/1.0'
			}
		});

		if (response.ok) {
			const data = await response.json();
			const isValid = data.lemma && data.entries && data.entries.length > 0;

			res.json({
				valid: isValid,
				word: word,
				lemma: data.lemma,
				entries: data.entries
			});
		} else {
			// Word not found in KBBI
			res.json({
				valid: false,
				word: word,
				message: 'Kata tidak ditemukan di KBBI'
			});
		}
	} catch (error) {
		console.error('KBBI API proxy error:', error);
		res.status(500).json({
			valid: false,
			word: req.params.word,
			message: 'Server validation error',
			error: error.message
		});
	}
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
	console.log(`✅ Server running on port ${PORT}`);
	console.log(`🎮 Game server ready for connections`);
});

export { io };

