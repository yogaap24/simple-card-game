#!/usr/bin/env node

/**
 * Setup Verification Script for Card Game BISINDO
 * Run this to check if everything is configured correctly
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

const checks = {
	passed: [],
	failed: [],
	warnings: []
};

console.log('🔍 Verifying Card Game BISINDO Setup...\n');

// Check 1: Project structure
console.log('📁 Checking project structure...');
const requiredDirs = [
	'server',
	'client',
	'shared',
	'data'
];

requiredDirs.forEach(dir => {
	if (existsSync(resolve(dir))) {
		checks.passed.push(`✅ ${dir}/ directory exists`);
	} else {
		checks.failed.push(`❌ ${dir}/ directory missing`);
	}
});

// Check 2: Required files
console.log('📄 Checking required files...');
const requiredFiles = [
	'server/package.json',
	'server/index.js',
	'client/package.json',
	'client/index.html',
	'shared/types.js',
	'shared/constants.js',
	'shared/events.js',
	'data/kbbi-words.json',
	'data/affixes.json',
	'README.md',
	'QUICKSTART.md'
];

requiredFiles.forEach(file => {
	if (existsSync(resolve(file))) {
		checks.passed.push(`✅ ${file} exists`);
	} else {
		checks.failed.push(`❌ ${file} missing`);
	}
});

// Check 3: Node modules
console.log('📦 Checking dependencies...');
if (existsSync(resolve('server/node_modules'))) {
	checks.passed.push('✅ Server dependencies installed');
} else {
	checks.warnings.push('⚠️  Server dependencies not installed - Run: cd server && npm install');
}

if (existsSync(resolve('client/node_modules'))) {
	checks.passed.push('✅ Client dependencies installed');
} else {
	checks.warnings.push('⚠️  Client dependencies not installed - Run: cd client && npm install');
}

// Check 4: Environment files
console.log('🔐 Checking environment configuration...');
if (existsSync(resolve('server/.env.example'))) {
	checks.passed.push('✅ Server .env.example exists');
} else {
	checks.warnings.push('⚠️  Server .env.example missing');
}

if (existsSync(resolve('client/.env.example'))) {
	checks.passed.push('✅ Client .env.example exists');
} else {
	checks.warnings.push('⚠️  Client .env.example missing');
}

// Check 5: Key source files
console.log('🔧 Checking core backend files...');
const backendFiles = [
	'server/game/CardGenerator.js',
	'server/game/GameState.js',
	'server/game/RoomManager.js',
	'server/game/WordValidator.js',
	'server/socket/gameSocket.js',
	'server/models/User.js',
	'server/routes/auth.js'
];

backendFiles.forEach(file => {
	if (existsSync(resolve(file))) {
		checks.passed.push(`✅ ${file} exists`);
	} else {
		checks.failed.push(`❌ ${file} missing`);
	}
});

console.log('⚛️  Checking core frontend files...');
const frontendFiles = [
	'client/src/App.jsx',
	'client/src/main.jsx',
	'client/src/context/AuthContext.jsx',
	'client/src/context/SocketContext.jsx',
	'client/src/pages/Home.jsx',
	'client/src/pages/Lobby.jsx',
	'client/src/pages/Game.jsx',
	'client/src/components/Game/GameBoard.jsx'
];

frontendFiles.forEach(file => {
	if (existsSync(resolve(file))) {
		checks.passed.push(`✅ ${file} exists`);
	} else {
		checks.failed.push(`❌ ${file} missing`);
	}
});

// Print results
console.log('\n' + '='.repeat(60));
console.log('📊 VERIFICATION RESULTS');
console.log('='.repeat(60) + '\n');

if (checks.passed.length > 0) {
	console.log('✅ PASSED CHECKS:');
	console.log(`   ${checks.passed.length} checks passed\n`);
}

if (checks.warnings.length > 0) {
	console.log('⚠️  WARNINGS:');
	checks.warnings.forEach(warning => console.log(`   ${warning}`));
	console.log('');
}

if (checks.failed.length > 0) {
	console.log('❌ FAILED CHECKS:');
	checks.failed.forEach(failure => console.log(`   ${failure}`));
	console.log('');
}

// Final verdict
console.log('='.repeat(60));
if (checks.failed.length === 0) {
	console.log('🎉 SUCCESS! Your project structure is correct!');
	console.log('');

	if (checks.warnings.length > 0) {
		console.log('⚠️  Please address the warnings above.');
		console.log('   Most commonly, you need to install dependencies:');
		console.log('   Run: npm run install:all');
	} else {
		console.log('🚀 Ready to start! Run: npm run dev');
	}
} else {
	console.log('❌ SETUP INCOMPLETE');
	console.log('   Please check the failed items above.');
	console.log('   You may need to re-run the project setup.');
}

console.log('='.repeat(60));
console.log('\n📖 For help:');
console.log('   - Quick Start: Read QUICKSTART.md');
console.log('   - Testing: Read TESTING.md');
console.log('   - Deployment: Read DEPLOYMENT.md');
console.log('   - Summary: Read PROJECT-SUMMARY.md\n');

