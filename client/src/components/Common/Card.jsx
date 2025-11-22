import './Card.css';

function Card({ card, onClick, isSelected, isOnTable }) {
	const getCardColor = () => {
		// Cards on table are always blue
		if (isOnTable) {
			return '#60a5fa';
		}

		// Cards in hand use type-based colors
		switch (card.type) {
			case 'BASE_WORD':
				return '#22c55e'; // Green for base in hand
			case 'AFFIX':
				return '#fbbf24'; // Yellow for affix
			default:
				return 'var(--color-bg-tertiary)';
		}
	};

	const getCardLabel = () => {
		switch (card.type) {
			case 'BASE_WORD':
				return 'Base';
			case 'AFFIX':
				return 'Imbuhan';
			default:
				return '';
		}
	};

	return (
		<div
			className={`game-card ${onClick ? 'clickable' : ''} ${isSelected ? 'selected' : ''}`}
			style={{ backgroundColor: getCardColor() }}
			onClick={onClick}
		>
			<div className="card-type">{getCardLabel()}</div>
			<div className="card-value">{card.value}</div>
		</div>
	);
}

export default Card;

