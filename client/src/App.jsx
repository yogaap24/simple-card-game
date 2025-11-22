import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import GameSolo from './pages/GameSolo';
import './App.css';

function App() {
	return (
		<BrowserRouter>
			<div className="app">
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/game" element={<GameSolo />} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</div>
		</BrowserRouter>
	);
}

export default App;

