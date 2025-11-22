import Card from '../Common/Card';
import './TableCards.css';

function TableCards({ cards, currentWord, onChallenge, canChallenge, wordInfo }) {
	return (
		<div className="table-cards">
			<h3 className="table-title">Table</h3>

			{cards.length === 0 ? (
				<div className="empty-table">
					<p>No cards on table</p>
					<p className="subtitle">Play the first card to start!</p>
				</div>
			) : (
				<>
					<div className="table-word">
						<div className="word-display">
							{cards.map((card, index) => (
								<Card key={index} card={card} isOnTable={true} />
							))}
						</div>
						<div className="word-text">
							<span className="label">Current Word:</span>
							<span className="word">{currentWord}</span>
						</div>

						{/* Display word information from KBBI API */}
						{wordInfo && wordInfo.derivedWords && wordInfo.derivedWords.length > 0 && (
							<div className="word-info">
								<div className="info-section">
									<span className="info-label">Related Words:</span>
									<div className="derived-words">
										{wordInfo.derivedWords.slice(0, 6).map((word, index) => (
											<span key={index} className="derived-word">{word}</span>
										))}
										{wordInfo.derivedWords.length > 6 && (
											<span className="derived-word more">+{wordInfo.derivedWords.length - 6} more</span>
										)}
									</div>
								</div>
								{wordInfo.definitions && wordInfo.definitions.length > 0 && (
									<div className="info-section">
										<span className="info-label">Definition:</span>
										<p className="definition">{wordInfo.definitions[0]}</p>
									</div>
								)}
							</div>
						)}
					</div>

					{canChallenge && (
						<button
							className="btn-warning challenge-btn"
							onClick={onChallenge}
						>
							Challenge Word
						</button>
					)}
				</>
			)}
		</div>
	);
}

export default TableCards;

