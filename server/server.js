// ====================================================================
// FREE FIRE BHARAT 3D - GAME BACKEND SERVER
// Express 5 + Socket.IO: Static Client Hosting, 60s Countdown, Sync & AI
// ====================================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// 1. SERVE FRONTEND CLIENT DIRECTLY AT ROOT
// This ensures visiting http://localhost:3001 displays the 3D Battle Royale game!
const distPath = path.join(__dirname, '../client/dist');
const clientPublicPath = path.join(__dirname, '../client/public');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
} else if (fs.existsSync(clientPublicPath)) {
  app.use(express.static(clientPublicPath));
}

// 2. API HEALTH & STATUS ENDPOINT (Dedicated to /api/status so it never shadows the web client)
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    game: 'Free Fire Style 3D Battle Royale Server',
    playersConnected: players.size,
    state: matchState,
    countdown: lobbyCountdown,
    alivePlayers: Math.max(1, players.size)
  });
});

// Fallback route: Send index.html if dist exists
app.get('*', (req, res, next) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});

// 3. MATCH STATE & SYNCHRONIZATION
const players = new Map();
let matchState = 'WARMUP'; // WARMUP, AIRPLANE, BATTLE, GAME_OVER
let lobbyCountdown = 60;

// Synchronized 60-second lobby countdown timer
setInterval(() => {
  if (matchState === 'WARMUP') {
    lobbyCountdown--;
    io.emit('lobby_countdown', lobbyCountdown);

    if (lobbyCountdown <= 0) {
      matchState = 'AIRPLANE';
      lobbyCountdown = 60;
      io.emit('match_state', { state: 'AIRPLANE' });

      // After 32s flight, transition to BATTLE
      setTimeout(() => {
        matchState = 'BATTLE';
        io.emit('match_state', { state: 'BATTLE' });
      }, 32000);
    }
  }
}, 1000);

// 4. SOCKET.IO EVENT HANDLERS
io.on('connection', (socket) => {
  console.log(`[Connect] Player connected: ${socket.id}`);

  players.set(socket.id, {
    id: socket.id,
    x: 0,
    y: 1.5,
    z: -360,
    yaw: 0,
    state: 'WARMUP',
    anim: 'idle',
    hp: 100
  });

  // Notify new player of current match state
  socket.emit('match_state', { state: matchState });
  socket.emit('lobby_countdown', lobbyCountdown);

  // Send all existing players to the new connection
  players.forEach((p, pid) => {
    if (pid !== socket.id) {
      socket.emit('player_state', p);
    }
  });

  // Handle position & animation updates from player
  socket.on('player_update', (data) => {
    const p = players.get(socket.id);
    if (p) {
      Object.assign(p, data);
      socket.broadcast.emit('player_state', p);
    }
  });

  // Weapon fire event
  socket.on('player_shoot', (data) => {
    socket.broadcast.emit('player_shot', {
      id: socket.id,
      origin: data.origin,
      direction: data.direction,
      weapon: data.weapon
    });
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`[Disconnect] Player left: ${socket.id}`);
    players.delete(socket.id);
    io.emit('player_disconnect', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🔥 Free Fire Bharat 3D Server running on http://0.0.0.0:${PORT}`);
  console.log(`🎮 Game client hosted directly on port ${PORT}`);
});
