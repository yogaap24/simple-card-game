/**
 * Socket.IO event names
 * Centralizing event names prevents typos and makes refactoring easier
 */

// Client to Server Events
export const CLIENT_EVENTS = {
  // Authentication
  GUEST_LOGIN: 'guest_login',
  LOGIN: 'login',
  REGISTER: 'register',

  // Room Management
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  GET_ROOMS: 'get_rooms',
  PLAYER_READY: 'player_ready',

  // Gameplay
  PLAY_CARD: 'play_card',
  DRAW_CARD: 'draw_card',
  SKIP_TURN: 'skip_turn',

  // Challenge System
  CHALLENGE_WORD: 'challenge_word',
  VOTE_CHALLENGE: 'vote_challenge',
};

// Server to Client Events
export const SERVER_EVENTS = {
  // Authentication
  AUTH_SUCCESS: 'auth_success',
  AUTH_ERROR: 'auth_error',

  // Room Management
  ROOM_CREATED: 'room_created',
  ROOM_JOINED: 'room_joined',
  ROOM_LEFT: 'room_left',
  ROOMS_LIST: 'rooms_list',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  PLAYER_READY_UPDATE: 'player_ready_update',

  // Game State
  GAME_STARTED: 'game_started',
  GAME_STATE_UPDATE: 'game_state_update',
  TURN_CHANGED: 'turn_changed',
  CARD_PLAYED: 'card_played',
  CARD_DRAWN: 'card_drawn',
  GAME_ENDED: 'game_ended',

  // Challenge System
  CHALLENGE_INITIATED: 'challenge_initiated',
  CHALLENGE_VOTE_UPDATE: 'challenge_vote_update',
  CHALLENGE_RESOLVED: 'challenge_resolved',

  // Errors and Notifications
  ERROR: 'error',
  NOTIFICATION: 'notification',
  INVALID_MOVE: 'invalid_move',
};

export default {
  CLIENT_EVENTS,
  SERVER_EVENTS
};

