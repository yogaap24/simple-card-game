import { GameState } from './GameState.js';
import { generateRoomId } from './CardGenerator.js';

/**
 * RoomManager handles all game rooms
 */
class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> GameState
    this.playerRooms = new Map(); // playerId -> roomId
    this.botRoomTimers = new Map(); // roomId -> timeout
    this.roomMetadata = new Map(); // roomId -> { hasBots: boolean, createdAt: Date }
  }

  /**
   * Create a new room
   */
  createRoom(hostId, hostUsername, isGuest = false, withBots = false) {
    const roomId = this.generateUniqueRoomId();
    const gameState = new GameState(roomId);

    gameState.addPlayer(hostId, hostUsername, isGuest);
    this.rooms.set(roomId, gameState);
    this.playerRooms.set(hostId, roomId);

    // Track room metadata
    this.roomMetadata.set(roomId, {
      hasBots: withBots,
      createdAt: new Date()
    });

    // Start cleanup timer for bot-only rooms
    if (withBots) {
      this.startBotRoomCleanupTimer(roomId);
    }

    console.log(`✅ Room ${roomId} created by ${hostUsername}${withBots ? ' (with bots)' : ''}`);
    return { roomId, gameState };
  }

  /**
   * Join an existing room
   */
  joinRoom(roomId, playerId, username, isGuest = false) {
    const gameState = this.rooms.get(roomId);
    if (!gameState) {
      throw new Error('Room not found');
    }

    gameState.addPlayer(playerId, username, isGuest);
    this.playerRooms.set(playerId, roomId);

    // Cancel bot room cleanup timer if a real player joins
    const metadata = this.roomMetadata.get(roomId);
    if (metadata?.hasBots) {
      this.cancelBotRoomCleanupTimer(roomId);
    }

    console.log(`✅ ${username} joined room ${roomId}`);
    return gameState;
  }

  /**
   * Leave a room
   */
  leaveRoom(playerId) {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return null;

    const gameState = this.rooms.get(roomId);
    if (!gameState) return null;

    gameState.removePlayer(playerId);
    this.playerRooms.delete(playerId);

    // Delete room if empty or only bots remain
    const hasHumanPlayers = gameState.players.some(p => !p.isBot);

    if (gameState.players.length === 0) {
      this.deleteRoom(roomId);
      console.log(`✅ Room ${roomId} deleted (empty)`);
    } else if (!hasHumanPlayers) {
      // Only bots left, restart cleanup timer
      const metadata = this.roomMetadata.get(roomId);
      if (metadata?.hasBots) {
        this.startBotRoomCleanupTimer(roomId);
      }
    }

    return roomId;
  }

  /**
   * Get room by ID
   */
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  /**
   * Get room for a player
   */
  getPlayerRoom(playerId) {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return null;
    return this.rooms.get(roomId);
  }

  /**
   * Get all available rooms
   */
  getAvailableRooms() {
    const availableRooms = [];

    this.rooms.forEach((gameState, roomId) => {
      // Only show rooms in WAITING phase (not started)
      if (gameState.phase === 'WAITING' && gameState.players.length < 6) {
        const metadata = this.roomMetadata.get(roomId);
        const humanPlayerCount = gameState.players.filter(p => !p.isBot).length;

        availableRooms.push({
          roomId,
          hostUsername: gameState.players[0]?.username,
          playerCount: gameState.players.length,
          humanPlayerCount: humanPlayerCount,
          maxPlayers: 6,
          status: gameState.phase,
          hasBots: metadata?.hasBots || false
        });
      }
    });

    return availableRooms;
  }

  /**
   * Generate unique room ID
   */
  generateUniqueRoomId() {
    let roomId;
    let attempts = 0;
    do {
      roomId = generateRoomId();
      attempts++;
      if (attempts > 100) {
        throw new Error('Could not generate unique room ID');
      }
    } while (this.rooms.has(roomId));

    return roomId;
  }

  /**
   * Get total number of rooms
   */
  getRoomCount() {
    return this.rooms.size;
  }

  /**
   * Get total number of players across all rooms
   */
  getTotalPlayers() {
    let total = 0;
    this.rooms.forEach(gameState => {
      total += gameState.players.length;
    });
    return total;
  }

  /**
   * Start auto-cleanup timer for bot-only rooms
   */
  startBotRoomCleanupTimer(roomId) {
    // Clear existing timer if any
    this.cancelBotRoomCleanupTimer(roomId);

    // Set 2 minute timer
    const timer = setTimeout(() => {
      const gameState = this.rooms.get(roomId);
      if (gameState) {
        const hasHumanPlayers = gameState.players.some(p => !p.isBot);

        // Only delete if no human players and still in waiting phase
        if (!hasHumanPlayers && gameState.phase === 'WAITING') {
          console.log(`⏰ Auto-deleting bot-only room ${roomId} (2 min timeout)`);
          this.deleteRoom(roomId);
        }
      }
    }, 2 * 60 * 1000); // 2 minutes

    this.botRoomTimers.set(roomId, timer);
    console.log(`⏱️  Started 2-minute cleanup timer for bot room ${roomId}`);
  }

  /**
   * Cancel auto-cleanup timer for a room
   */
  cancelBotRoomCleanupTimer(roomId) {
    const timer = this.botRoomTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.botRoomTimers.delete(roomId);
      console.log(`✅ Cancelled cleanup timer for room ${roomId}`);
    }
  }

  /**
   * Delete a room completely
   */
  deleteRoom(roomId) {
    const gameState = this.rooms.get(roomId);
    if (gameState) {
      // Remove all player mappings
      gameState.players.forEach(player => {
        this.playerRooms.delete(player.id);
      });
    }

    this.rooms.delete(roomId);
    this.roomMetadata.delete(roomId);
    this.cancelBotRoomCleanupTimer(roomId);
  }
}

// Singleton instance
const roomManager = new RoomManager();
export default roomManager;

