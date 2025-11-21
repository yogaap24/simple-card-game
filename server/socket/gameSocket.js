import { CLIENT_EVENTS, SERVER_EVENTS } from '../../shared/events.js';
import roomManager from '../game/RoomManager.js';
import { createBots } from '../game/BotPlayer.js';

/**
 * Setup Socket.IO event handlers
 */
export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Store player info on socket
    socket.playerData = {
      id: socket.id,
      username: null,
      isGuest: false,
      roomId: null
    };

    /**
     * Guest Login - Quick join without account
     */
    socket.on(CLIENT_EVENTS.GUEST_LOGIN, ({ username }) => {
      try {
        if (!username || username.trim().length < 2) {
          socket.emit(SERVER_EVENTS.ERROR, { message: 'Username must be at least 2 characters' });
          return;
        }

        socket.playerData.username = username.trim();
        socket.playerData.isGuest = true;

        socket.emit(SERVER_EVENTS.AUTH_SUCCESS, {
          user: {
            id: socket.id,
            username: socket.playerData.username,
            isGuest: true
          }
        });

        console.log(`👤 Guest logged in: ${username}`);
      } catch (error) {
        console.error('Guest login error:', error);
        socket.emit(SERVER_EVENTS.ERROR, { message: error.message });
      }
    });

    /**
     * Create Room
     */
    socket.on(CLIENT_EVENTS.CREATE_ROOM, ({ withBots = false, botCount = 3, botDifficulty = 'medium' } = {}) => {
      try {
        if (!socket.playerData.username) {
          socket.emit(SERVER_EVENTS.ERROR, { message: 'Must login first' });
          return;
        }

        if (socket.playerData.roomId) {
          socket.emit(SERVER_EVENTS.ERROR, { message: 'Already in a room' });
          return;
        }

        const { roomId, gameState } = roomManager.createRoom(
          socket.id,
          socket.playerData.username,
          socket.playerData.isGuest,
          withBots
        );

        socket.playerData.roomId = roomId;
        socket.join(roomId);

        // Add bots if requested
        if (withBots) {
          const count = Math.min(Math.max(botCount, 3), 6); // 3-6 bots
          const bots = createBots(count, botDifficulty);

          // Add bots to game
          for (const bot of bots) {
            gameState.addPlayer(bot.id, bot.name, true);
            gameState.setPlayerReady(bot.id, true);
          }

          // Store bot instances in game state for AI
          gameState.bots = bots;

          console.log(`🤖 Added ${count} bots (${botDifficulty}) to room ${roomId}`);
        }

        socket.emit(SERVER_EVENTS.ROOM_CREATED, {
          roomId,
          gameState: gameState.getPublicState(socket.id),
          withBots
        });

        console.log(`🎮 Room ${roomId} created${withBots ? ' with bots' : ''}`);
      } catch (error) {
        console.error('Create room error:', error);
        socket.emit(SERVER_EVENTS.ERROR, { message: error.message });
      }
    });

    /**
     * Get Available Rooms
     */
    socket.on(CLIENT_EVENTS.GET_ROOMS, () => {
      try {
        const rooms = roomManager.getAvailableRooms();
        socket.emit(SERVER_EVENTS.ROOMS_LIST, { rooms });
      } catch (error) {
        console.error('Get rooms error:', error);
        socket.emit(SERVER_EVENTS.ERROR, { message: error.message });
      }
    });

    /**
     * Join Room
     */
    socket.on(CLIENT_EVENTS.JOIN_ROOM, ({ roomId }) => {
      try {
        if (!socket.playerData.username) {
          socket.emit(SERVER_EVENTS.ERROR, { message: 'Must login first' });
          return;
        }

        if (socket.playerData.roomId) {
          socket.emit(SERVER_EVENTS.ERROR, { message: 'Already in a room' });
          return;
        }

        const gameState = roomManager.joinRoom(
          roomId,
          socket.id,
          socket.playerData.username,
          socket.playerData.isGuest
        );

        socket.playerData.roomId = roomId;
        socket.join(roomId);

        // Notify player they joined
        socket.emit(SERVER_EVENTS.ROOM_JOINED, {
          roomId,
          gameState: gameState.getPublicState(socket.id)
        });

        // Notify other players in room
        socket.to(roomId).emit(SERVER_EVENTS.PLAYER_JOINED, {
          player: {
            id: socket.id,
            username: socket.playerData.username,
            isGuest: socket.playerData.isGuest
          }
        });

        console.log(`✅ ${socket.playerData.username} joined room ${roomId}`);
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit(SERVER_EVENTS.ERROR, { message: error.message });
      }
    });

    /**
     * Leave Room
     */
    socket.on(CLIENT_EVENTS.LEAVE_ROOM, () => {
      handlePlayerLeave(socket, io);
    });

    /**
     * Player Ready
     */
    socket.on(CLIENT_EVENTS.PLAYER_READY, ({ ready }) => {
      try {
        const gameState = roomManager.getPlayerRoom(socket.id);
        if (!gameState) {
          socket.emit(SERVER_EVENTS.ERROR, { message: 'Not in a room' });
          return;
        }

        gameState.setPlayerReady(socket.id, ready);

        // Broadcast to all players in room
        io.to(socket.playerData.roomId).emit(SERVER_EVENTS.PLAYER_READY_UPDATE, {
          playerId: socket.id,
          ready,
          gameState: gameState.getPublicState(socket.id)
        });

        // Auto-start if all players ready
        if (gameState.areAllPlayersReady()) {
          startGame(socket.playerData.roomId, gameState, io);
        }
      } catch (error) {
        console.error('Player ready error:', error);
        socket.emit(SERVER_EVENTS.ERROR, { message: error.message });
      }
    });

    /**
     * Play Card(s) - supports multiple cards with position
     */
    socket.on(CLIENT_EVENTS.PLAY_CARD, async ({ cardId, position, leftCardIds, rightCardIds }) => {
      try {
        const gameState = roomManager.getPlayerRoom(socket.id);
        if (!gameState) {
          socket.emit(SERVER_EVENTS.ERROR, { message: 'Not in a room' });
          return;
        }

        let result;

        // New API: multiple cards with left/right zones
        if (leftCardIds || rightCardIds) {
          result = await gameState.playCards(
            socket.id,
            leftCardIds || [],
            rightCardIds || []
          );
        }
        // Old API: single card backward compatibility
        else if (cardId) {
          result = await gameState.playCard(socket.id, cardId, position);
        } else {
          socket.emit(SERVER_EVENTS.ERROR, { message: 'No cards specified' });
          return;
        }

        if (!result.success) {
          // Invalid move - player must draw
          socket.emit(SERVER_EVENTS.INVALID_MOVE, {
            message: result.message
          });

          if (result.mustDraw && gameState.deck.length > 0) {
            const drawnCard = gameState.drawCard(socket.id);
            socket.emit(SERVER_EVENTS.CARD_DRAWN, { card: drawnCard });
          }

          // Don't call nextTurn here - already handled in skipTurn if needed
        }

        // Broadcast updated game state to all players
        const roomId = socket.playerData.roomId;
        gameState.players.forEach(player => {
          const playerSocket = io.sockets.sockets.get(player.id);
          if (playerSocket) {
            playerSocket.emit(SERVER_EVENTS.GAME_STATE_UPDATE, {
              gameState: gameState.getPublicState(player.id)
            });
          }
        });

        if (result.success) {
          // Broadcast the played card with word info
          io.to(roomId).emit(SERVER_EVENTS.CARD_PLAYED, {
            playerId: socket.id,
            word: result.word,
            points: result.points,
            wordInfo: result.wordInfo || null
          });

          if (result.gameEnded) {
            io.to(roomId).emit(SERVER_EVENTS.GAME_ENDED, {
              winner: result.winner,
              finalScores: gameState.players.map(p => ({
                id: p.id,
                username: p.username,
                score: p.score
              }))
            });
          }
        }
      } catch (error) {
        console.error('Play card error:', error);
        socket.emit(SERVER_EVENTS.ERROR, { message: error.message });
      }
    });

    /**
     * Draw Card (manual)
     */
    socket.on(CLIENT_EVENTS.DRAW_CARD, () => {
      try {
        const gameState = roomManager.getPlayerRoom(socket.id);
        if (!gameState) {
          socket.emit(SERVER_EVENTS.ERROR, { message: 'Not in a room' });
          return;
        }

        const card = gameState.drawCard(socket.id);
        socket.emit(SERVER_EVENTS.CARD_DRAWN, { card });

        // Broadcast state update
        io.to(socket.playerData.roomId).emit(SERVER_EVENTS.GAME_STATE_UPDATE, {
          gameState: gameState.getPublicState(socket.id)
        });
      } catch (error) {
        console.error('Draw card error:', error);
        socket.emit(SERVER_EVENTS.ERROR, { message: error.message });
      }
    });

    /**
     * Skip Turn
     */
    socket.on(CLIENT_EVENTS.SKIP_TURN, () => {
      try {
        const gameState = roomManager.getPlayerRoom(socket.id);
        if (!gameState) {
          socket.emit(SERVER_EVENTS.ERROR, { message: 'Not in a room' });
          return;
        }

        gameState.skipTurn(socket.id);

        // Broadcast to all players
        const roomId = socket.playerData.roomId;
        gameState.players.forEach(player => {
          const playerSocket = io.sockets.sockets.get(player.id);
          if (playerSocket) {
            playerSocket.emit(SERVER_EVENTS.GAME_STATE_UPDATE, {
              gameState: gameState.getPublicState(player.id)
            });
          }
        });

        io.to(roomId).emit(SERVER_EVENTS.TURN_CHANGED, {
          currentPlayerId: gameState.players[gameState.currentTurnIndex].id
        });
      } catch (error) {
        console.error('Skip turn error:', error);
        socket.emit(SERVER_EVENTS.ERROR, { message: error.message });
      }
    });

    /**
     * Challenge Word
     */
    socket.on(CLIENT_EVENTS.CHALLENGE_WORD, ({ word }) => {
      try {
        const gameState = roomManager.getPlayerRoom(socket.id);
        if (!gameState) {
          socket.emit(SERVER_EVENTS.ERROR, { message: 'Not in a room' });
          return;
        }

        const challenge = gameState.initiateChallenge(socket.id, word);

        // Broadcast challenge to all players
        io.to(socket.playerData.roomId).emit(SERVER_EVENTS.CHALLENGE_INITIATED, {
          challenge,
          challengerUsername: socket.playerData.username
        });
      } catch (error) {
        console.error('Challenge word error:', error);
        socket.emit(SERVER_EVENTS.ERROR, { message: error.message });
      }
    });

    /**
     * Vote on Challenge
     */
    socket.on(CLIENT_EVENTS.VOTE_CHALLENGE, ({ vote }) => {
      try {
        const gameState = roomManager.getPlayerRoom(socket.id);
        if (!gameState) {
          socket.emit(SERVER_EVENTS.ERROR, { message: 'Not in a room' });
          return;
        }

        const result = gameState.voteChallenge(socket.id, vote);

        // Broadcast vote update
        io.to(socket.playerData.roomId).emit(SERVER_EVENTS.CHALLENGE_VOTE_UPDATE, {
          voterId: socket.id,
          totalVotes: Object.keys(gameState.activeChallenge?.votes || {}).length
        });

        // If challenge resolved, broadcast result
        if (result) {
          io.to(socket.playerData.roomId).emit(SERVER_EVENTS.CHALLENGE_RESOLVED, {
            result
          });

          // Update game state
          gameState.players.forEach(player => {
            const playerSocket = io.sockets.sockets.get(player.id);
            if (playerSocket) {
              playerSocket.emit(SERVER_EVENTS.GAME_STATE_UPDATE, {
                gameState: gameState.getPublicState(player.id)
              });
            }
          });
        }
      } catch (error) {
        console.error('Vote challenge error:', error);
        socket.emit(SERVER_EVENTS.ERROR, { message: error.message });
      }
    });

    /**
     * Disconnect
     */
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      handlePlayerLeave(socket, io);
    });
  });

  console.log('✅ Socket.IO handlers configured');
}

/**
 * Helper: Handle player leaving
 */
function handlePlayerLeave(socket, io) {
  try {
    const roomId = socket.playerData.roomId;
    if (!roomId) return;

    const gameState = roomManager.leaveRoom(socket.id);

    if (gameState) {
      socket.leave(roomId);
      socket.playerData.roomId = null;

      // Notify other players
      io.to(roomId).emit(SERVER_EVENTS.PLAYER_LEFT, {
        playerId: socket.id,
        username: socket.playerData.username
      });

      // Send updated game state to remaining players
      const updatedGameState = roomManager.getRoom(roomId);
      if (updatedGameState) {
        updatedGameState.players.forEach(player => {
          const playerSocket = io.sockets.sockets.get(player.id);
          if (playerSocket) {
            playerSocket.emit(SERVER_EVENTS.GAME_STATE_UPDATE, {
              gameState: updatedGameState.getPublicState(player.id)
            });
          }
        });
      }
    }
  } catch (error) {
    console.error('Handle player leave error:', error);
  }
}

/**
 * Helper: Start game
 */
function startGame(roomId, gameState, io) {
  try {
    gameState.startGame();

    // Send personalized game state to each player (with their own hand)
    gameState.players.forEach(player => {
      const playerSocket = io.sockets.sockets.get(player.id);
      if (playerSocket) {
        playerSocket.emit(SERVER_EVENTS.GAME_STARTED, {
          gameState: gameState.getPublicState(player.id)
        });
      }
    });

    console.log(`🎮 Game started in room ${roomId}`);

    // If game has bots, start bot AI
    if (gameState.bots && gameState.bots.length > 0) {
      startBotAI(roomId, gameState, io);
    }
  } catch (error) {
    console.error('Start game error:', error);
    io.to(roomId).emit(SERVER_EVENTS.ERROR, { message: error.message });
  }
}

/**
 * Bot AI - makes moves for bot players
 */
async function startBotAI(roomId, gameState, io) {
  // Check if it's a bot's turn
  const checkBotTurn = async () => {
    if (gameState.phase !== 'PLAYING') return;

    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    if (!currentPlayer) return;

    const bot = gameState.bots?.find(b => b.id === currentPlayer.id);
    if (!bot) return;

    console.log(`🤖 Bot ${bot.name} is thinking...`);

    try {
      // Bot makes a move
      const move = await bot.makeMove(
        currentPlayer.hand,
        gameState.tableCards,
        gameState.wordHistory || []
      );

      if (!move) {
        // Bot skips turn
        console.log(`🤖 Bot ${bot.name} skips turn`);
        gameState.skipTurn(bot.id);
      } else {
        // Bot plays cards
        console.log(`🤖 Bot ${bot.name} plays: ${move.word}`);
        const leftCardIds = move.leftCards ? move.leftCards.map(c => c.id) : [];
        const rightCardIds = move.rightCards ? move.rightCards.map(c => c.id) : [];

        const result = await gameState.playCards(bot.id, leftCardIds, rightCardIds);

        if (result.success) {
          io.to(roomId).emit(SERVER_EVENTS.CARD_PLAYED, {
            playerId: bot.id,
            word: result.word,
            points: result.points,
            wordInfo: result.wordInfo || null
          });

          if (result.gameEnded) {
            io.to(roomId).emit(SERVER_EVENTS.GAME_ENDED, {
              winner: result.winner,
              finalScores: gameState.players.map(p => ({
                id: p.id,
                username: p.username,
                score: p.score
              }))
            });
            return;
          }
        } else {
          // Bot's move failed, skip turn
          console.log(`🤖 Bot ${bot.name} invalid move, skipping`);
          gameState.skipTurn(bot.id);
        }
      }

      // Broadcast updated game state
      gameState.players.forEach(player => {
        const playerSocket = io.sockets.sockets.get(player.id);
        if (playerSocket) {
          playerSocket.emit(SERVER_EVENTS.GAME_STATE_UPDATE, {
            gameState: gameState.getPublicState(player.id)
          });
        }
      });

      // Check next turn after delay
      setTimeout(checkBotTurn, 500);
    } catch (error) {
      console.error('Bot AI error:', error);
      gameState.skipTurn(bot.id);
      setTimeout(checkBotTurn, 500);
    }
  };

  // Start checking for bot turns
  setTimeout(checkBotTurn, 1000);
}

export default setupSocketHandlers;

