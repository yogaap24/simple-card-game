import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './Home.css';

// Helper for consistent SweetAlert toast notifications (top-right, small)
// Only for Home page - game toasts won't appear here
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
		width: '350px',
		customClass: {
			popup: 'home-toast' // Unique identifier for Home toasts
		}
	});
};

function Home() {
	const navigate = useNavigate();

	const [username, setUsername] = useState('');
	const [botCount, setBotCount] = useState(3);
	const [difficulty, setDifficulty] = useState('medium');

	const handleStartGame = () => {
		const playerName = username.trim();

		// Validate name required
		if (!playerName || playerName.length < 2) {
			showToast('warning', 'Nama tidak valid', 'Nama harus diisi minimal 2 karakter');
			return;
		}

		// Generate unique room code
		const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

		// Store game config in sessionStorage
		const gameConfig = {
			playerName,
			botCount,
			difficulty,
			gameId: Date.now().toString(36),
			roomCode
		};

		sessionStorage.setItem('gameConfig', JSON.stringify(gameConfig));

		// Navigate to game with room code
		navigate(`/game/${roomCode}`);
	};

	return (
		<div className="home-page">
			<div className="home-container">
				<h1 className="game-title">Card Game BISINDO</h1>
				<p className="game-subtitle">Permainan Kata Bahasa Indonesia</p>

				<div className="setup-card card">
					<h2 className="setup-title">Setup Game</h2>

					<div className="setup-form">
						<div className="form-group">
							<label>Nama Pemain <span style={{ color: '#ef4444' }}>*</span></label>
							<input
								type="text"
								placeholder="Masukkan nama Anda (wajib)"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								maxLength={20}
								required
							/>
						</div>

						<div className="form-group">
							<label>Jumlah Bot (3-6)</label>
							<div className="bot-count-selector">
								{[3, 4, 5, 6].map(count => (
									<button
										key={count}
										className={`count-btn ${botCount === count ? 'active' : ''}`}
										onClick={() => setBotCount(count)}
									>
										{count} Bot
									</button>
								))}
							</div>
						</div>

						<div className="form-group">
							<label>Tingkat Kesulitan</label>
							<div className="difficulty-selector">
								<button
									className={`difficulty-btn easy ${difficulty === 'easy' ? 'active' : ''}`}
									onClick={() => setDifficulty('easy')}
								>
									Mudah
								</button>
								<button
									className={`difficulty-btn medium ${difficulty === 'medium' ? 'active' : ''}`}
									onClick={() => setDifficulty('medium')}
								>
									Sedang
								</button>
								<button
									className={`difficulty-btn hard ${difficulty === 'hard' ? 'active' : ''}`}
									onClick={() => setDifficulty('hard')}
								>
									Sulit
								</button>
							</div>
						</div>

						<button
							className="btn-start"
							onClick={handleStartGame}
						>
							Mulai Main
						</button>
					</div>
				</div>

				<div className="game-info card">
					<h3>Cara Bermain</h3>
					<ul>
						<li>Bentuk kata bahasa Indonesia yang valid menggunakan kartu</li>
						<li>Giliran bergantian menambah kartu di depan atau belakang</li>
						<li>Kata valid mendapat poin berdasarkan panjang kata</li>
						<li>Gerakan tidak valid akan dapat kartu hukuman</li>
						<li>Pemain pertama yang menghabiskan kartu menang!</li>
					</ul>
				</div>
			</div>
		</div>
	);
}

export default Home;

