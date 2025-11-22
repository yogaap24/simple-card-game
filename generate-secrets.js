#!/usr/bin/env node

/**
 * Generate secure secrets for production deployment
 * Run: node generate-secrets.js
 */

import crypto from 'crypto';

console.log('\n🔐 Generating Secure Secrets for Production\n');
console.log('=' .repeat(60));

// Generate JWT Secret (64 characters)
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('\n📝 JWT_SECRET (copy to .env):');
console.log(`JWT_SECRET=${jwtSecret}`);

// Generate Database Password (32 characters, alphanumeric + symbols)
const dbPassword = crypto.randomBytes(24).toString('base64').replace(/[\/\+\=]/g, '_');
console.log('\n📝 DB_PASSWORD (copy to .env):');
console.log(`DB_PASSWORD=${dbPassword}`);

// Sample .env file
console.log('\n' + '='.repeat(60));
console.log('\n📄 Sample .env file for VPS (/root/.env):\n');
console.log(`NODE_ENV=production
PORT=5000

# Database
DB_USER=bisindo_user
DB_PASSWORD=${dbPassword}
DB_NAME=card_game_bisindo

# Client URL
CLIENT_URL=https://card-bisindo.yoo.ga

# JWT Secret
JWT_SECRET=${jwtSecret}

# Docker Registry
DOCKER_USERNAME=your_dockerhub_username
`);

console.log('=' .repeat(60));
console.log('\n✅ Secrets generated successfully!');
console.log('⚠️  IMPORTANT: Keep these secrets secure and never commit to Git\n');

