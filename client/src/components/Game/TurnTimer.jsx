import './TurnTimer.css';

function TurnTimer({ timeLeft, isMyTurn }) {
  const percentage = (timeLeft / 20) * 100;
  const isLowTime = timeLeft <= 5;

  return (
    <div className={`turn-timer ${isMyTurn ? 'my-turn' : ''} ${isLowTime ? 'low-time' : ''}`}>
      <div className="timer-circle">
        <svg width="80" height="80">
          <circle
            cx="40"
            cy="40"
            r="35"
            stroke="var(--color-bg-tertiary)"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="40"
            cy="40"
            r="35"
            stroke={isMyTurn ? 'var(--color-primary)' : 'var(--color-text-secondary)'}
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 35}`}
            strokeDashoffset={`${2 * Math.PI * 35 * (1 - percentage / 100)}`}
            transform="rotate(-90 40 40)"
            className="timer-progress"
          />
        </svg>
        <div className="timer-text">
          <span className="timer-seconds">{timeLeft}</span>
          <span className="timer-label">sec</span>
        </div>
      </div>
    </div>
  );
}

export default TurnTimer;

