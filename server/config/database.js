import { Sequelize } from 'sequelize';

// Initialize Sequelize with PostgreSQL
export const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgresql://localhost:5432/card_game_bisindo',
  {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Connected successfully');

    // Sync database models (create tables if they don't exist)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✅ Database models synchronized');
  } catch (error) {
    console.error(`❌ Error connecting to PostgreSQL: ${error.message}`);
    // Don't exit process, allow server to run without DB (for guest-only mode)
    console.log('⚠️  Server will run in guest-only mode');
  }
};

