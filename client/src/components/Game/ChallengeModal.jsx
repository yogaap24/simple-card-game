import { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import './ChallengeModal.css';

function ChallengeModal({ challenge, currentUserId, onClose }) {
	const { emit, on, off, CLIENT_EVENTS, SERVER_EVENTS } = useSocket();
	const [hasVoted, setHasVoted] = useState(false);

	const isChallenger = challenge.challengerId === currentUserId;
	const myVote = challenge.votes[currentUserId];

	useEffect(() => {
		const handleResolved = () => {
			setTimeout(onClose, 2000); // Close after 2 seconds
		};

		on(SERVER_EVENTS.CHALLENGE_RESOLVED, handleResolved);

		return () => {
			off(SERVER_EVENTS.CHALLENGE_RESOLVED, handleResolved);
		};
	}, []);

	const handleVote = (vote) => {
		if (isChallenger || hasVoted) return;

		emit(CLIENT_EVENTS.VOTE_CHALLENGE, { vote });
		setHasVoted(true);
	};

	const totalVotes = Object.keys(challenge.votes).length;
	const validVotes = Object.values(challenge.votes).filter(v => v === true).length;
	const invalidVotes = Object.values(challenge.votes).filter(v => v === false).length;

	return (
		<div className="challenge-modal-overlay" onClick={onClose}>
			<div className="challenge-modal" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h2>⚠️ Word Challenge</h2>
					<button className="close-btn" onClick={onClose}>×</button>
				</div>

				<div className="modal-content">
					<div className="challenge-word">
						<span className="label">Challenged Word:</span>
						<span className="word">{challenge.word}</span>
					</div>

					{challenge.status === 'PENDING' && (
						<>
							<p className="challenge-question">
								Is this a valid Indonesian word?
							</p>

							{!isChallenger && !hasVoted && !myVote && (
								<div className="vote-buttons">
									<button
										className="btn-success"
										onClick={() => handleVote(true)}
									>
										✓ Valid
									</button>
									<button
										className="btn-danger"
										onClick={() => handleVote(false)}
									>
										✗ Invalid
									</button>
								</div>
							)}

							{(isChallenger || hasVoted || myVote) && (
								<div className="voting-status">
									{isChallenger && (
										<p>You initiated this challenge. Waiting for other players to vote...</p>
									)}
									{(hasVoted || myVote) && !isChallenger && (
										<p>You voted: {myVote ? '✓ Valid' : '✗ Invalid'}</p>
									)}
									<div className="vote-count">
										<div className="vote-bar">
											<div
												className="valid-bar"
												style={{ width: `${(validVotes / (validVotes + invalidVotes || 1)) * 100}%` }}
											>
												{validVotes}
											</div>
											<div
												className="invalid-bar"
												style={{ width: `${(invalidVotes / (validVotes + invalidVotes || 1)) * 100}%` }}
											>
												{invalidVotes}
											</div>
										</div>
										<p className="vote-text">
											Votes: {totalVotes} received
										</p>
									</div>
								</div>
							)}
						</>
					)}

					{challenge.status === 'RESOLVED' && (
						<div className="challenge-result">
							<p className="result-text">
								Challenge {challenge.wordIsValid ? 'Successful' : 'Failed'}!
							</p>
							<p>{challenge.message}</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default ChallengeModal;

