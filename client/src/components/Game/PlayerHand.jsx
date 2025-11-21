import Card from '../Common/Card';
import './PlayerHand.css';

function PlayerHand({ cards, selectedCards = [], onCardSelect, disabled }) {
  return (
    <div className="player-hand">
      <div className="hand-header">
        <h3>Your Hand ({cards.length} cards)</h3>
      </div>
      <div className="hand-cards">
        {cards.length === 0 ? (
          <div className="empty-hand">
            <p>No cards in hand</p>
          </div>
        ) : (
          cards.map((card) => {
            const isSelected = selectedCards.some(c => c.id === card.id);
            return (
              <div
                key={card.id}
                onClick={() => !disabled && onCardSelect(card)}
                className={`hand-card-wrapper ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
              >
                <Card card={card} isSelected={isSelected} onClick={() => !disabled && onCardSelect(card)} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default PlayerHand;

