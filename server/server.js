const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));

app.use(express.json());

// Serve the built frontend
const distPath = path.join(__dirname, "../client/dist");
const publicPath = path.join(__dirname, "../client/public");
app.use(express.static(distPath));
app.use(express.static(publicPath));

// Fallback to index.html for client-side routing
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/socket.io")) {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  next();
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const players = {};

const MAX_HEALTH = 100;

// Shared Ground Weapon Spawns
const weaponSpawns = new Map([
  ["weapon_1", { type: "rifle", x: 15, y: 0, z: 12 }],
  ["weapon_2", { type: "pistol", x: -20, y: 0, z: 10 }],
  ["weapon_3", { type: "shotgun", x: 30, y: 0, z: -15 }],
  ["weapon_4", { type: "sniper", x: -35, y: 0, z: -25 }],
  ["weapon_5", { type: "smg", x: 5, y: 0, z: 40 }]
]);

// ===============================
// PLAYER CREATION
// ===============================

function createPlayer(id, characterId = "soldier1") {

  return {
    id,

    characterId,

    x: Math.random() * 20 - 10,
    y: 0,
    z: Math.random() * 20 - 10,

    rotation: 0,

    health: MAX_HEALTH,

    alive: true,
    moving: false,
    running: false,
    jumping: false,
    crouching: false,
    aiming: false
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

  socket.on("joinGame", data => {

    const charId = (data && data.characterId) ? data.characterId : "soldier1";

    if (!players[socket.id]) {
      players[socket.id] = createPlayer(socket.id, charId);
    } else {
      players[socket.id].characterId = charId;
    }

    socket.emit(
      "playersUpdate",
      Object.values(players)
    );

    io.emit(
      "playersUpdate",
      Object.values(players)
    );

    // Send existing ground weapons to player
    socket.emit(
      "initialWeapons",
      Array.from(weaponSpawns.entries()).map(([id, w]) => ({ id, ...w }))
    );
  });

  // =============================
  // WEAPON PICKUP
  // =============================

  socket.on("pickupWeapon", ({ weaponId }) => {
    const player = players[socket.id];
    const weapon = weaponSpawns.get(weaponId);

    if (!player || !player.alive || !weapon) return;

    const distance = Math.hypot(
      player.x - weapon.x,
      player.z - weapon.z
    );

    if (distance > 3.8) return;

    weaponSpawns.delete(weaponId);

    socket.emit("weaponPickupConfirmed", {
      weaponId,
      type: weapon.type
    });

    io.emit("weaponRemoved", { weaponId });
  });

  // =============================
  // WEAPON RELOAD
  // =============================

  socket.on("reloadWeapon", ({ slot }) => {
    socket.emit("weaponReloadConfirmed", { slot });
  });

  // =============================
  // MOVEMENT
  // =============================

  socket.on("move", data => {
    const player = players[socket.id];

    if (!player || !player.alive) return;

    if (
      !Number.isFinite(data.x) ||
      !Number.isFinite(data.z) ||
      !Number.isFinite(data.rotation)
    ) return;

    player.x = Math.max(-145, Math.min(145, data.x));
    player.y = Number.isFinite(data.y) ? data.y : 0;
    player.z = Math.max(-145, Math.min(145, data.z));

    player.rotation = data.rotation;
    player.moving = Boolean(data.moving);
    player.running = Boolean(data.running);
    player.jumping = Boolean(data.jumping);
    player.crouching = Boolean(data.crouching);
    player.aiming = Boolean(data.aiming);
    if (data.characterId) player.characterId = data.characterId;
  });

  // =============================
  // RELOAD
  // =============================

  socket.on("reload", () => {
    io.emit("playerReload", { id: socket.id });
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

const PORT = process.env.PORT || 3001;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Game server running on port ${PORT}`);
});
