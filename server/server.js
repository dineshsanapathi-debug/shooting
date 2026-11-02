const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { Server } = require("socket.io");

const app = express();

app.use(cors());

// Serve client dist if available
const distPath = path.join(__dirname, "../client/dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3001;

const players = {};

const MAX_HEALTH = 100;

// ===============================
// PLAYER CREATION
// ===============================

function createPlayer(id) {

  return {
    id,

    x: Math.random() * 20 - 10,
    y: 0,
    z: Math.random() * 20 - 10,

    rotation: 0,

    health: MAX_HEALTH,

    alive: true
  };
}

// ===============================
// CONNECTION
// ===============================

io.on("connection", socket => {

  console.log("Player connected:", socket.id);

  // =============================
  // JOIN GAME
  // =============================

  socket.on("joinGame", () => {

    if (!players[socket.id]) {
      players[socket.id] = createPlayer(socket.id);
    }

    socket.emit(
      "playersUpdate",
      Object.values(players)
    );

    io.emit(
      "playersUpdate",
      Object.values(players)
    );
  });

  // =============================
  // MOVEMENT
  // =============================

  socket.on("move", data => {

    const player = players[socket.id];

    if (!player || !player.alive) return;

    if (
      typeof data.x !== "number" ||
      typeof data.z !== "number" ||
      !Number.isFinite(data.x) ||
      !Number.isFinite(data.z)
    ) return;

    player.x = Math.max(
      -145,
      Math.min(145, data.x)
    );

    player.z = Math.max(
      -145,
      Math.min(145, data.z)
    );

    if (Number.isFinite(data.rotation)) {
      player.rotation = data.rotation;
    }
  });

  // =============================
  // SHOOTING
  // =============================

  socket.on("shoot", data => {

    const shooter = players[socket.id];

    if (!shooter || !shooter.alive) return;

    if (
      !data ||
      !data.origin ||
      !data.direction
    ) return;

    const origin = data.origin;
    const direction = data.direction;

    const values = [
      origin.x,
      origin.y,
      origin.z,
      direction.x,
      direction.y,
      direction.z
    ];

    if (!values.every(Number.isFinite)) return;

    const length = Math.hypot(
      direction.x,
      direction.y,
      direction.z
    );

    if (length < 0.9 || length > 1.1) return;

    // Basic server-side directional hit check.
    // This is a prototype, not production anti-cheat.

    for (const target of Object.values(players)) {

      if (
        target.id === socket.id ||
        !target.alive
      ) continue;

      const targetX = target.x;
      const targetY = 1.2;
      const targetZ = target.z;

      const dx = targetX - origin.x;
      const dy = targetY - origin.y;
      const dz = targetZ - origin.z;

      const projection =
        dx * direction.x +
        dy * direction.y +
        dz * direction.z;

      if (projection < 0 || projection > 100) continue;

      const closestX =
        origin.x + direction.x * projection;

      const closestY =
        origin.y + direction.y * projection;

      const closestZ =
        origin.z + direction.z * projection;

      const distance = Math.sqrt(
        (targetX - closestX) ** 2 +
        (targetY - closestY) ** 2 +
        (targetZ - closestZ) ** 2
      );

      if (distance < 1.2) {

        target.health -= 25;

        io.emit("hit", {
          targetId: target.id,
          health: target.health
        });

        if (target.health <= 0) {

          target.health = 0;
          target.alive = false;

          io.to(target.id).emit("eliminated");

          // Simple automatic respawn for testing.
          setTimeout(() => {

            if (!players[target.id]) return;

            target.x = Math.random() * 20 - 10;
            target.z = Math.random() * 20 - 10;

            target.health = MAX_HEALTH;
            target.alive = true;

            io.to(target.id).emit("respawn", {
              id: target.id,
              x: target.x,
              z: target.z
            });

          }, 3000);
        }

        break;
      }
    }
  });

  // =============================
  // DISCONNECT
  // =============================

  socket.on("disconnect", () => {

    console.log("Player disconnected:", socket.id);

    delete players[socket.id];

    io.emit(
      "playersUpdate",
      Object.values(players)
    );
  });
});

// ===============================
// PLAYER BROADCAST
// ===============================

setInterval(() => {

  io.emit(
    "playersUpdate",
    Object.values(players)
  );

}, 50);

// ===============================
// SERVER START
// ===============================

server.listen(PORT, "0.0.0.0", () => {

  console.log(
    `Battle Royale server running on port ${PORT}`
  );

});
