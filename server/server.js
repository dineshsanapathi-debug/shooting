const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const skills = require("./characterSkills");

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
// AIRPLANE FLIGHT PATH
// ===============================

const PLANE_START = { x: -160, y: 85, z: -160 };
const PLANE_END = { x: 160, y: 85, z: 160 };
const planeRotation = Math.atan2(-(PLANE_END.x - PLANE_START.x), -(PLANE_END.z - PLANE_START.z));

function getPlanePosition() {
  const elapsed = (Date.now() / 1000 * 18) % 360;
  const factor = elapsed / 360;
  return {
    x: PLANE_START.x + (PLANE_END.x - PLANE_START.x) * factor,
    y: 85,
    z: PLANE_START.z + (PLANE_END.z - PLANE_START.z) * factor,
    rotation: planeRotation
  };
}

// ===============================
// PLAYER CREATION
// ===============================

function createPlayer(id, characterId = "hayato") {
  const plane = getPlanePosition();

  const player = {
    id,
    characterId,
    character: characterId,

    state: "airplane", // "airplane" | "falling" | "parachuting" | "landed"

    x: plane.x,
    y: 85,
    z: plane.z,

    rotation: plane.rotation,

    health: MAX_HEALTH,
    maxHealth: MAX_HEALTH,
    forceFieldHP: 0,
    isCamouflaged: false,
    teamId: "solo",

    alive: true,
    moving: false,
    running: false,
    jumping: false,
    crouching: false,
    aiming: false
  };

  try {
    skills.initializeCharacter(player, characterId);
  } catch (e) {
    skills.initializeCharacter(player, "hayato");
  }

  return player;
}

// ===============================
// CONNECTION
// ===============================

io.on("connection", socket => {

  console.log("Player connected:", socket.id);

  // =============================
  // CHARACTER SELECTION & SKILLS
  // =============================

  socket.on("selectCharacter", characterId => {
    const player = players[socket.id];
    if (!player) return;

    try {
      const selected = skills.initializeCharacter(player, characterId);
      socket.emit("characterSelected", {
        character: player.character,
        skillName: selected.skillName,
        skillType: selected.type,
        cooldown: selected.cooldown || 0,
        description: selected.description || ""
      });
    } catch (error) {
      socket.emit("characterSelectionError", {
        message: error.message
      });
    }
  });

  socket.on("activateSkill", () => {
    const player = players[socket.id];
    if (!player) return;

    const result = skills.activateSkill(socket.id, player);
    socket.emit("skillResult", result);

    if (result.success) {
      io.emit("playerSkillActivated", {
        playerId: socket.id,
        skill: result.skill,
        duration: result.duration,
        shield: result.shield || 0,
        camouflaged: Boolean(result.camouflaged)
      });
    }
  });

  // =============================
  // JOIN GAME
  // =============================

  socket.on("joinGame", data => {

    const charId = (data && data.characterId) ? data.characterId : "hayato";

    if (!players[socket.id]) {
      players[socket.id] = createPlayer(socket.id, charId);
    } else {
      try {
        skills.initializeCharacter(players[socket.id], charId);
      } catch (e) {
        skills.initializeCharacter(players[socket.id], "hayato");
      }
    }

    const currentSkill = skills.CHARACTER_SKILLS[players[socket.id].character];
    if (currentSkill) {
      socket.emit("characterSelected", {
        character: players[socket.id].character,
        skillName: currentSkill.skillName,
        skillType: currentSkill.type,
        cooldown: currentSkill.cooldown || 0,
        description: currentSkill.description || ""
      });
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
  // AIRDROP & PARACHUTE EVENTS
  // =============================

  socket.on("jumpFromPlane", () => {
    const player = players[socket.id];

    if (!player || !player.alive) return;
    if (player.state !== "airplane") return;

    player.state = "falling";

    io.emit("playerAirState", {
      id: socket.id,
      state: player.state
    });
  });

  socket.on("openParachute", () => {
    const player = players[socket.id];

    if (!player || !player.alive) return;
    if (player.state !== "falling") return;
    if (player.y <= 15) return;

    player.state = "parachuting";

    io.emit("playerAirState", {
      id: socket.id,
      state: player.state
    });
  });

  socket.on("airMovement", data => {
    const player = players[socket.id];

    if (!player || !player.alive) return;
    if (player.state !== "falling" && player.state !== "parachuting") return;

    if (Number.isFinite(data.x) && Number.isFinite(data.z)) {
      player.x = Math.max(-145, Math.min(145, data.x));
      player.z = Math.max(-145, Math.min(145, data.z));
    }
    if (Number.isFinite(data.y)) {
      player.y = Math.max(0, Math.min(95, data.y));
    }
    if (Number.isFinite(data.rotation)) {
      player.rotation = data.rotation;
    }

    // Server-side altitude checks
    if (player.state === "falling" && player.y <= 35 && player.y > 0) {
      player.state = "parachuting";
      io.emit("playerAirState", {
        id: socket.id,
        state: "parachuting"
      });
    }

    if (player.y <= 0) {
      player.y = 0;
      player.state = "landed";
      io.emit("playerAirState", {
        id: socket.id,
        state: "landed"
      });
    }
  });

  socket.on("playerLanded", data => {
    const player = players[socket.id];

    if (!player || !player.alive) return;

    if (
      player.state !== "falling" &&
      player.state !== "parachuting"
    ) return;

    player.y = 0;
    if (data && Number.isFinite(data.x) && Number.isFinite(data.z)) {
      player.x = Math.max(-145, Math.min(145, data.x));
      player.z = Math.max(-145, Math.min(145, data.z));
    }
    player.state = "landed";

    io.emit("playerAirState", {
      id: socket.id,
      state: "landed"
    });
  });

  // =============================
  // WEAPON PICKUP
  // =============================

  socket.on("pickupWeapon", ({ weaponId }) => {
    const player = players[socket.id];
    const weapon = weaponSpawns.get(weaponId);

    if (!player || !player.alive || !weapon) return;
    // Rule: Weapons can only be picked up after landing
    if (player.state !== "landed") return;

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
    // Ground movement only accepted once player has landed
    if (player.state !== "landed") return;

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

    // Movement multiplier based on skills (e.g. Kelly, Alok, Chrono)
    player.movementMultiplier = skills.getMovementMultiplier(
      socket.id,
      player,
      player.running
    );
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
    // Rule: Shooting only allowed after landing
    if (shooter.state !== "landed") return;

    if (
      !data ||
      !data.origin ||
      !data.direction
    ) return;

    const origin = data.origin;
    const direction = data.direction;
    const weaponType = data.weaponType || "rifle";

    // Rafael: silenced sniper / marksman shots
    const isSilent = skills.isWeaponSilent(shooter, weaponType);
    if (!isSilent) {
      io.emit("gunshotSound", { shooterId: socket.id, position: origin });
    }

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

        // Calculate skill-aware damage (Hayato penetration, Chrono force-field)
        const damageResult = skills.applyDamage(shooter, target, 25);

        // Moco: Hacker's eye reveal mark
        skills.onWeaponHit(socket.id, shooter, target.id);

        io.emit("hit", {
          targetId: target.id,
          health: target.health,
          shield: target.forceFieldHP || 0,
          attackerId: socket.id
        });

        io.to(target.id).emit("healthUpdate", {
          health: target.health,
          shield: target.forceFieldHP || 0
        });

        if (damageResult.eliminated) {

          // Jota healing & Wukong takedown CD reset
          skills.onElimination(socket.id, shooter, target, weaponType);

          io.emit("playerEliminated", {
            playerId: target.id,
            killerId: socket.id
          });

          io.to(target.id).emit("eliminated");

          io.to(socket.id).emit("eliminationConfirmed", {
            victimId: target.id,
            healed: shooter.character === "jota"
          });

          // Simple automatic respawn for testing.
          setTimeout(() => {

            if (!players[target.id]) return;

            target.x = Math.random() * 20 - 10;
            target.z = Math.random() * 20 - 10;

            target.health = MAX_HEALTH;
            target.forceFieldHP = 0;
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

    skills.cleanupPlayer(socket.id);

    delete players[socket.id];

    io.emit(
      "playersUpdate",
      Object.values(players)
    );
  });
});

// ===============================
// PLAYER & AIRPLANE BROADCAST
// ===============================

setInterval(() => {

  const plane = getPlanePosition();

  // Skills tick: Alok healing & active effect expiration
  skills.tick(players, io);

  // Moco Enemy Reveal: send to attacker privately
  for (const [attackerId, attacker] of Object.entries(players)) {
    if (attacker.character === "moco" && attacker.alive) {
      for (const [enemyId, enemy] of Object.entries(players)) {
        if (enemy.alive && enemyId !== attackerId && skills.isEnemyRevealed(attackerId, enemyId)) {
          io.to(attackerId).emit("enemyRevealed", {
            id: enemyId,
            x: enemy.x,
            y: enemy.y,
            z: enemy.z,
            duration: 5000
          });
        }
      }
    }
  }

  // Keep any players currently aboard the airplane locked to its position
  for (const p of Object.values(players)) {
    if (p.state === "airplane") {
      p.x = plane.x;
      p.y = plane.y;
      p.z = plane.z;
      p.rotation = plane.rotation;
    }
  }

  io.emit(
    "playersUpdate",
    Object.values(players)
  );

  io.emit("planeUpdate", plane);

}, 50);

// ===============================
// SERVER START
// ===============================

const PORT = process.env.PORT || 3001;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Game server running on port ${PORT}`);
});
