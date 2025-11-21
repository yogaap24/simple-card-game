# Card Game BISINDO

🎴 Game kartu kata bahasa Indonesia dengan AI opponent - langsung main tanpa login!

🤖 **Bot Mode** - Main melawan 3-6 bot dengan tingkat kesulitan mudah, sedang, atau sulit!

**📖 For complete guide, see [GUIDE.md](GUIDE.md)**

## Tech Stack

- **Backend**: Node.js, Express, Socket.IO, PostgreSQL (Sequelize ORM)
- **Frontend**: React, Socket.IO Client, Vite
- **Real-time Communication**: WebSocket (Socket.IO)
- **Word Validation**: KBBI API (https://kbbi.raf555.dev) + Local Dictionary

## Features

- 🎮 **Instant Play** - Langsung main tanpa login/register
- 🤖 **VS Bot Mode** - Main melawan 3-6 bot pintar
- 🎯 **3 Tingkat Kesulitan** - Mudah, Sedang, Sulit
- 📚 **KBBI API Integration** - 100,000+ kata Indonesia
- 💡 **Educational** - Tampilkan kata turunan dan definisi
- ⚡ **Fast Setup** - Siap dalam 5 menit
- 🏆 **Challenge System** - Voting untuk kata yang meragukan

## Quick Start

```bash
# 1. Install PostgreSQL
brew install postgresql@15          # macOS
sudo apt install postgresql         # Ubuntu

# 2. Create database
psql postgres -c "CREATE DATABASE card_game_bisindo;"

# 3. Install dependencies
npm run install:all

# 4. Start application
npm run dev
```

Open http://localhost:5173 and play!

## Game Mode

### 🤖 VS Bot Mode
- Main solo melawan 3-6 bot
- Pilih tingkat kesulitan: Mudah 😊, Sedang 😎, atau Sulit 🔥
- Tidak perlu menunggu pemain lain
- Sempurna untuk belajar kata-kata Indonesia
- Langsung klik "Mulai Main" tanpa login!

## Documentation

**Complete guide:** See [GUIDE.md](GUIDE.md) for:
- Detailed setup instructions
- How to play
- Bot mode details
- Testing guide
- Deployment instructions
- Troubleshooting
- Development guide

## Tech Stack

- **Backend**: Node.js, Express, Socket.IO, PostgreSQL
- **Frontend**: React, Vite, Socket.IO Client
- **Database**: PostgreSQL (Sequelize ORM)
- **API**: KBBI Dictionary API

## License

ISC

