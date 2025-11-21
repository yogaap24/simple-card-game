import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import './WaitingRoom.css';

function WaitingRoom({ gameState, roomId }) {
  const navigate = useNavigate();
  const { emit, CLIENT_EVENTS } = useSocket();
  const { user } = useAuth();

  const currentPlayer = gameState.players.find(p => p.id === user?.id);
  const isHost = gameState.hostId === user?.id;
  const isReady = currentPlayer?.status === 'READY';
  const canStart = gameState.players.length >= 4 && gameState.players.every(p => p.status === 'READY');

  // Check if playing with bots
  const hasBot = gameState.players.some(p => p.isBot);

  // Auto-ready when playing with bots
  useEffect(() => {
    if (hasBot && !isReady) {
      emit(CLIENT_EVENTS.PLAYER_READY, { ready: true });
    }
  }, [hasBot, isReady, emit, CLIENT_EVENTS.PLAYER_READY]);

  const handleToggleReady = () => {
    emit(CLIENT_EVENTS.PLAYER_READY, { ready: !isReady });
  };

  const handleLeaveRoom = () => {
    emit(CLIENT_EVENTS.LEAVE_ROOM);
    navigate('/');
  };

  return (
    <div className="waiting-room container">
      <div className="waiting-room-header">
        <div>
          <h1>{hasBot ? 'Mode Bot' : 'Waiting Room'}</h1>
          <p className="room-code">Room Code: <strong>{roomId}</strong></p>
        </div>
        <button className="btn-danger" onClick={handleLeaveRoom}>
          Keluar
        </button>
      </div>

      <div className="waiting-room-content">
        <div className="players-section card">
          <h2>Players ({gameState.players.length})</h2>
          <div className="players-list">
            {gameState.players.map((player) => (
              <div key={player.id} className="player-item">
                <div className="player-info">
                  <span className="player-name">
                    {player.isBot && '[BOT] '}
                    {player.username}
                    {player.id === gameState.hostId && ' [HOST]'}
                  </span>
                  <span className={`player-status ${player.status.toLowerCase()}`}>
                    {player.status === 'READY' ? 'Siap' : 'Belum Siap'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {hasBot && !canStart && (
            <div className="info-message">
              Menunggu semua pemain siap...
            </div>
          )}

          {hasBot && canStart && (
            <div className="info-message success-text">
              Semua pemain siap! Game akan segera dimulai...
            </div>
          )}
        </div>

        <div className="ready-section card">
          <h2>Pengaturan Game</h2>
          <div className="settings-info">
            <div className="setting-item">
              <span>Jumlah Pemain:</span>
              <span>{gameState.players.length} pemain</span>
            </div>
            <div className="setting-item">
              <span>Kartu Awal:</span>
              <span>7 kartu</span>
            </div>
            <div className="setting-item">
              <span>Waktu Per Turn:</span>
              <span>20 detik</span>
            </div>
            {hasBot && (
              <div className="setting-item">
                <span>Mode:</span>
                <span>Melawan Bot</span>
              </div>
            )}
          </div>

          {!hasBot && (
            <div className="ready-actions">
              <button
                className={`btn-large ${isReady ? 'btn-secondary' : 'btn-success'}`}
                onClick={handleToggleReady}
              >
                {isReady ? 'Siap' : 'Tandai Siap'}
              </button>

              {isHost && canStart && (
                <div className="start-info success-text">
                  Semua pemain siap! Game akan dimulai otomatis.
                </div>
              )}

              {isHost && !canStart && (
                <div className="start-info">
                  Menunggu semua pemain siap...
                </div>
              )}
            </div>
          )}

          {hasBot && (
            <div className="bot-ready-info success-text">
              Game akan dimulai otomatis saat semua siap
            </div>
          )}
        </div>
      </div>

      <div className="game-rules card mt-3">
        <h3>Aturan Main</h3>
        <ul>
          <li>Gunakan kartu untuk membentuk kata bahasa Indonesia yang valid</li>
          <li>Tambahkan kartu di depan atau belakang kata di meja</li>
          <li>Kata valid dapat poin berdasarkan panjang kata</li>
          <li>Main tidak valid harus ambil kartu hukuman</li>
          <li>Challenge kata yang meragukan</li>
          <li>Pemain pertama yang habis kartunya menang!</li>
        </ul>
      </div>
    </div>
  );
}

export default WaitingRoom;

