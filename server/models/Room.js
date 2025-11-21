import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  roomId: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true
  },
  hostId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  players: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  status: {
    type: DataTypes.ENUM('WAITING', 'PLAYING', 'FINISHED'),
    defaultValue: 'WAITING'
  },
  maxPlayers: {
    type: DataTypes.INTEGER,
    defaultValue: 6,
    validate: {
      min: 4,
      max: 6
    }
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  finishedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  winnerId: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

export default Room;

