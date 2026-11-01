import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// MAP CONSTANTS
const MAP_SIZE = 800; // -400 to +400 coordinates
const TICK_RATE = 25; // 25 Hz updates

// WEAPONS DEFINITIONS
const WEAPON_CONFIGS = {
  ak47: { id: "ak47", name: "AK47", type: "ar", damage: 32, fireRate: 110, range: 180, spread: 0.035, clipSize: 30 },
  m1014: { id: "m1014", name: "M1014", type: "shotgun", damage: 18, pellets: 7, fireRate: 650, range: 45, spread: 0.08, clipSize: 6 },
  awm: { id: "awm", name: "AWM", type: "sniper", damage: 135, fireRate: 1200, range: 350, spread: 0.005, clipSize: 5 },
  deagle: { id: "deagle", name: "Desert Eagle", type: "pistol", damage: 45, fireRate: 350, range: 90, spread: 0.025, clipSize: 7 },
  fist: { id: "fist", name: "Fists", type: "melee", damage: 20, fireRate: 400, range: 3, spread: 0, clipSize: 999 }
};

// BOT NAMES FOR BATTLE ROYALE
const BOT_NAMES = [
  "ShadowNinja", "KellySniper", "AlokBeast", "HayatoBlade", "ChronoGod",
  "ViperStrike", "CobraKai", "DesertFox", "GhostRider", "Phoenix99",
  "TitanSlayer", "ApexHunter", "StormBringer", "BlazeKing", "FrostBite",
  "SilentKill", "ThunderBolt", "WarMachine", "AlphaWolf", "RavenEye",
  "ZeroCool", "RogueAgent", "DeathStroke", "NightCrawler", "IronClad"
];

// MATCH STATE
class BattleRoyaleMatch {
  constructor(id, mode = "solo", maxPlayers = 50) {
    this.id = id;
    this.mode = mode;
    this.maxPlayers = maxPlayers;
    this.state = "LOBBY"; // LOBBY, DROPPING, IN_GAME, GAME_OVER
    this.lobbyTimer = 15; // seconds countdown in lobby
    this.matchTime = 0;
    this.players = new Map();
    this.lootItems = new Map();
    this.vehicles = new Map();
    this.airdrops = [];
    this.killFeed = [];

    // Safe Zone Stages
    this.safeZone = {
      x: 0,
      z: 0,
      radius: 360,
      targetX: 0,
      targetZ: 0,
      targetRadius: 360,
      stage: 0,
      timer: 30, // seconds until next shrink
      isShrinking: false,
      shrinkDuration: 40,
      shrinkElapsed: 0,
      initialRadius: 360,
      dps: 2
    };

    this.initWorld();
  }

  initWorld() {
    // Generate initial loot items across compound locations
    let lootId = 1;
    const lootTypes = [
      { type: "weapon", id: "ak47", name: "AK47", ammo: 90 },
      { type: "weapon", id: "m1014", name: "M1014", ammo: 24 },
      { type: "weapon", id: "awm", name: "AWM", ammo: 15 },
      { type: "weapon", id: "deagle", name: "Desert Eagle", ammo: 28 },
      { type: "ammo", id: "ar_ammo", name: "Rifle Ammo", count: 60 },
      { type: "ammo", id: "sg_ammo", name: "Shotgun Shells", count: 18 },
      { type: "ammo", id: "sniper_ammo", name: "Sniper Ammo", count: 10 },
      { type: "armor", id: "vest_lv1", name: "Vest Lv1", armor: 50 },
      { type: "armor", id: "vest_lv2", name: "Vest Lv2", armor: 75 },
      { type: "armor", id: "vest_lv3", name: "Vest Lv3", armor: 100 },
      { type: "helmet", id: "helmet_lv1", name: "Helmet Lv1", armor: 40 },
      { type: "helmet", id: "helmet_lv2", name: "Helmet Lv2", armor: 70 },
      { type: "medkit", id: "medkit", name: "Medkit", count: 1 },
      { type: "medkit", id: "inhaler", name: "Energy Inhaler", count: 2 }
    ];

    // Compound hotspots
    const POIs = [
      { x: 0, z: 0, spread: 60, count: 25 },       // Clock Tower / Central Outpost
      { x: 120, z: -100, spread: 50, count: 18 },  // Factory / Hangar
      { x: -140, z: 110, spread: 50, count: 18 },  // Mill / Village
      { x: 130, z: 120, spread: 45, count: 15 },   // Bimasakti Strip
      { x: -110, z: -130, spread: 45, count: 15 }, // Peak / Watchtower
      { x: -220, z: 0, spread: 40, count: 12 },    // Coast Port
      { x: 220, z: 40, spread: 40, count: 12 },    // Plantation
      { x: 0, z: 220, spread: 40, count: 12 },     // Riverside
      { x: 0, z: -220, spread: 40, count: 12 }     // Rim Nam Village
    ];

    POIs.forEach(poi => {
      for (let i = 0; i < poi.count; i++) {
        const itemType = lootTypes[Math.floor(Math.random() * lootTypes.length)];
        const lx = poi.x + (Math.random() - 0.5) * poi.spread * 2;
        const lz = poi.z + (Math.random() - 0.5) * poi.spread * 2;
        this.lootItems.set(lootId, {
          id: lootId,
          ...itemType,
          x: Math.round(lx * 10) / 10,
          y: 0.5,
          z: Math.round(lz * 10) / 10
        });
        lootId++;
      }
    });

    // Spawn 8 drivable vehicles across roads and settlements
    const vehicleSpawns = [
      { id: "v1", x: 25, z: 15, rot: 0.4 },
      { id: "v2", x: -120, z: 90, rot: 1.2 },
      { id: "v3", x: 100, z: -80, rot: -0.7 },
      { id: "v4", x: -90, z: -110, rot: 2.1 },
      { id: "v5", x: 110, z: 110, rot: -1.5 },
      { id: "v6", x: -190, z: 20, rot: 0.8 },
      { id: "v7", x: 190, z: -30, rot: -2.3 },
      { id: "v8", x: 10, z: 180, rot: 3.1 }
    ];

    vehicleSpawns.forEach(v => {
      this.vehicles.set(v.id, {
        id: v.id,
        type: "military_buggy",
        x: v.x,
        y: 0,
        z: v.z,
        rot: v.rot,
        speed: 0,
        health: 400,
        driverId: null,
        passengers: []
      });
    });
  }

  addPlayer(socketId, name = "Soldier", character = "kelly", isBot = false) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 50 + Math.random() * 180;
    const spawnX = Math.cos(angle) * dist;
    const spawnZ = Math.sin(angle) * dist;

    const player = {
      id: socketId,
      name: String(name || "Soldier").slice(0, 16),
      character: character || "kelly",
      isBot,
      alive: true,
      health: 100,
      maxHealth: 100,
      armor: 0,
      helmet: 0,
      medkits: 1,
      kills: 0,
      damageDealt: 0,
      x: spawnX,
      y: 0,
      z: spawnZ,
      pitch: 0,
      yaw: angle + Math.PI,
      vx: 0,
      vz: 0,
      isGrounded: true,
      isCrouching: false,
      isSprinting: false,
      isAiming: false,
      isFiring: false,
      inVehicle: null,
      currentWeapon: "fist",
      weapons: {
        fist: { id: "fist", ammo: 999, reserve: 999 },
        primary: null,
        secondary: null,
        pistol: null
      },
      lastShotTime: 0,
      teamId: socketId, // solo default
      // Bot behavior states
      botTargetId: null,
      botState: "LOOTING",
      botTimer: 0
    };

    // If bot, give initial primary weapon
    if (isBot) {
      const botGuns = ["ak47", "m1014", "deagle", "ak47"];
      const chosen = botGuns[Math.floor(Math.random() * botGuns.length)];
      player.weapons.primary = { id: chosen, ammo: WEAPON_CONFIGS[chosen].clipSize, reserve: 90 };
      player.currentWeapon = chosen;
      player.armor = 25;
      player.helmet = 25;
    }

    this.players.set(socketId, player);
    return player;
  }

  removePlayer(socketId) {
    // If in vehicle, exit vehicle
    const p = this.players.get(socketId);
    if (p && p.inVehicle) {
      const v = this.vehicles.get(p.inVehicle);
      if (v && v.driverId === socketId) {
        v.driverId = null;
      }
    }
    this.players.delete(socketId);
  }

  // Populate remaining slots with smart AI bots up to maxPlayers (or standard 20-30 for active matches)
  fillWithBots(targetCount = 25) {
    let currentCount = this.players.size;
    let botIndex = 0;
    while (currentCount < targetCount) {
      const botName = BOT_NAMES[botIndex % BOT_NAMES.length] + "_" + (Math.floor(Math.random() * 89) + 10);
      const characters = ["kelly", "alok", "hayato", "chrono"];
      const charSkin = characters[botIndex % characters.length];
      const botId = `bot_${Date.now()}_${botIndex}`;
      this.addPlayer(botId, botName, charSkin, true);
      currentCount++;
      botIndex++;
    }
  }

  startMatch() {
    this.state = "IN_GAME";
    this.matchTime = 0;
    this.safeZone.timer = 40;
    this.safeZone.stage = 1;
    this.safeZone.isShrinking = false;
    this.safeZone.radius = 350;
    this.safeZone.targetRadius = 240;
    this.safeZone.targetX = (Math.random() - 0.5) * 60;
    this.safeZone.targetZ = (Math.random() - 0.5) * 60;
  }

  update(delta) {
    if (this.state === "LOBBY") {
      this.lobbyTimer -= delta;
      if (this.lobbyTimer <= 0) {
        // Auto fill bots and start match
        this.fillWithBots(Math.min(this.maxPlayers, 30));
        this.startMatch();
      }
      return;
    }

    if (this.state !== "IN_GAME") return;

    this.matchTime += delta;

    // 1. Update Safe Zone
    this.updateSafeZone(delta);

    // 2. Storm damage to players
    this.applyStormDamage(delta);

    // 3. Update Bots AI
    this.updateBots(delta);

    // 4. Update Vehicles
    this.updateVehicles(delta);

    // 5. Periodic Airdrops
    this.updateAirdrops(delta);

    // 6. Check Win Condition
    this.checkVictory();
  }

  updateSafeZone(delta) {
    const sz = this.safeZone;
    if (!sz.isShrinking) {
      sz.timer -= delta;
      if (sz.timer <= 0) {
        sz.isShrinking = true;
        sz.shrinkElapsed = 0;
        sz.initialRadius = sz.radius;
        sz.initialX = sz.x;
        sz.initialZ = sz.z;
      }
    } else {
      sz.shrinkElapsed += delta;
      const progress = Math.min(1, sz.shrinkElapsed / sz.shrinkDuration);
      sz.radius = sz.initialRadius + (sz.targetRadius - sz.initialRadius) * progress;
      sz.x = sz.initialX + (sz.targetX - sz.initialX) * progress;
      sz.z = sz.initialZ + (sz.targetZ - sz.initialZ) * progress;

      if (progress >= 1) {
        sz.isShrinking = false;
        sz.stage++;
        sz.timer = Math.max(15, 35 - sz.stage * 5);
        sz.shrinkDuration = Math.max(20, 40 - sz.stage * 4);
        sz.dps = 2 + sz.stage * 2;

        // Next target radius and center inside current safe zone
        const nextRadius = Math.max(15, sz.radius * 0.55);
        const maxOffset = Math.max(5, sz.radius - nextRadius);
        const randAngle = Math.random() * Math.PI * 2;
        const randDist = Math.random() * maxOffset * 0.75;
        sz.targetX = sz.x + Math.cos(randAngle) * randDist;
        sz.targetZ = sz.z + Math.sin(randAngle) * randDist;
        sz.targetRadius = nextRadius;
      }
    }
  }

  applyStormDamage(delta) {
    const sz = this.safeZone;
    for (const player of this.players.values()) {
      if (!player.alive) continue;
      const distFromCenter = Math.hypot(player.x - sz.x, player.z - sz.z);
      if (distFromCenter > sz.radius) {
        const damage = sz.dps * delta;
        player.health = Math.max(0, player.health - damage);
        if (player.health <= 0) {
          this.eliminatePlayer(player, null, "The Safe Zone");
        }
      }
    }
  }

  updateBots(delta) {
    const sz = this.safeZone;
    const alivePlayers = Array.from(this.players.values()).filter(p => p.alive);

    for (const bot of alivePlayers) {
      if (!bot.isBot) continue;

      bot.botTimer -= delta;

      // 1. Storm Survival: If outside or near safe zone edge, navigate towards safe zone center
      const distFromZoneCenter = Math.hypot(bot.x - sz.x, bot.z - sz.z);
      const isNearStorm = distFromZoneCenter > sz.radius * 0.85;

      // 2. Find closest enemy
      let nearestEnemy = null;
      let nearestDist = 80;
      for (const other of alivePlayers) {
        if (other.id === bot.id || other.teamId === bot.teamId) continue;
        const d = Math.hypot(other.x - bot.x, other.z - bot.z);
        if (d < nearestDist) {
          nearestDist = d;
          nearestEnemy = other;
        }
      }

      let moveTargetX = bot.x;
      let moveTargetZ = bot.z;
      let shouldShoot = false;

      if (isNearStorm) {
        // Move towards safe zone
        moveTargetX = sz.x + (Math.random() - 0.5) * 30;
        moveTargetZ = sz.z + (Math.random() - 0.5) * 30;
      } else if (nearestEnemy) {
        // Face and engage enemy
        const dx = nearestEnemy.x - bot.x;
        const dz = nearestEnemy.z - bot.z;
        bot.yaw = Math.atan2(dx, dz);
        shouldShoot = nearestDist < 50;

        if (nearestDist > 25) {
          moveTargetX = nearestEnemy.x;
          moveTargetZ = nearestEnemy.z;
        } else if (nearestDist < 8) {
          // Back up a bit
          moveTargetX = bot.x - Math.sin(bot.yaw) * 10;
          moveTargetZ = bot.z - Math.cos(bot.yaw) * 10;
        }
      } else {
        // Wander or seek loot
        if (bot.botTimer <= 0) {
          bot.botTimer = 3 + Math.random() * 4;
          const wanderAngle = Math.random() * Math.PI * 2;
          const wanderDist = 15 + Math.random() * 25;
          moveTargetX = bot.x + Math.sin(wanderAngle) * wanderDist;
          moveTargetZ = bot.z + Math.cos(wanderAngle) * wanderDist;
        }
      }

      // Move bot towards moveTarget
      const mdx = moveTargetX - bot.x;
      const mdz = moveTargetZ - bot.z;
      const mdist = Math.hypot(mdx, mdz);
      if (mdist > 1.5) {
        const speed = 7.5 * delta;
        bot.vx = (mdx / mdist) * speed;
        bot.vz = (mdz / mdist) * speed;
        bot.x += bot.vx;
        bot.z += bot.vz;
        if (!nearestEnemy) {
          bot.yaw = Math.atan2(mdx, mdz);
        }
        bot.isSprinting = mdist > 15;
      } else {
        bot.vx = 0;
        bot.vz = 0;
        bot.isSprinting = false;
      }

      // Bot Shooting Logic
      if (shouldShoot && nearestEnemy) {
        const now = Date.now();
        const weaponConfig = WEAPON_CONFIGS[bot.currentWeapon] || WEAPON_CONFIGS.ak47;
        if (now - bot.lastShotTime >= weaponConfig.fireRate * 1.3) {
          bot.lastShotTime = now;
          // Apply some bot spread inaccuracy
          const spreadX = (Math.random() - 0.5) * 0.12;
          const spreadZ = (Math.random() - 0.5) * 0.12;
          const dirX = Math.sin(bot.yaw) + spreadX;
          const dirZ = Math.cos(bot.yaw) + spreadZ;
          const dirLen = Math.hypot(dirX, dirZ);

          this.handlePlayerShoot(bot.id, {
            dirX: dirX / dirLen,
            dirY: 0,
            dirZ: dirZ / dirLen,
            weaponId: bot.currentWeapon
          });
        }
      }
    }
  }

  updateVehicles(delta) {
    for (const v of this.vehicles.values()) {
      if (!v.driverId) {
        v.speed *= 0.94; // friction
        continue;
      }
      const driver = this.players.get(v.driverId);
      if (!driver || !driver.alive) {
        v.driverId = null;
        continue;
      }
      // Keep vehicle at driver position
      v.x = driver.x;
      v.z = driver.z;
      v.rot = driver.yaw;

      // Roadkill collision with enemies
      if (Math.abs(v.speed) > 12) {
        for (const p of this.players.values()) {
          if (p.id === v.driverId || !p.alive || p.inVehicle) continue;
          const d = Math.hypot(p.x - v.x, p.z - v.z);
          if (d < 3.2) {
            const hitDamage = Math.round(Math.abs(v.speed) * 3);
            p.health = Math.max(0, p.health - hitDamage);
            driver.damageDealt += hitDamage;
            io.emit("hit", { shooter: driver.id, target: p.id, health: p.health, damage: hitDamage });
            if (p.health <= 0) {
              this.eliminatePlayer(p, driver, "Military Buggy");
            }
          }
        }
      }
    }
  }

  updateAirdrops(delta) {
    // Drop legendary crate every 90 seconds during match
    if (this.matchTime > 40 && Math.floor(this.matchTime) % 90 === 0 && this.airdrops.length < 3) {
      const dropAngle = Math.random() * Math.PI * 2;
      const dropDist = Math.random() * this.safeZone.radius * 0.6;
      const dropX = this.safeZone.x + Math.cos(dropAngle) * dropDist;
      const dropZ = this.safeZone.z + Math.sin(dropAngle) * dropDist;
      const airdrop = {
        id: `airdrop_${Date.now()}`,
        x: dropX,
        y: 40,
        z: dropZ,
        targetY: 0.5,
        loot: { weapon: "awm", ammo: 25, vest: 100, medkits: 3 },
        smoke: true
      };
      this.airdrops.push(airdrop);
      io.emit("airdrop_incoming", airdrop);
    }

    // Animate falling airdrops
    for (const ad of this.airdrops) {
      if (ad.y > ad.targetY) {
        ad.y = Math.max(ad.targetY, ad.y - delta * 5);
      }
    }
  }

  handlePlayerShoot(shooterId, data) {
    const shooter = this.players.get(shooterId);
    if (!shooter || !shooter.alive) return;

    const weaponId = data.weaponId || shooter.currentWeapon || "ak47";
    const weaponConfig = WEAPON_CONFIGS[weaponId] || WEAPON_CONFIGS.ak47;

    const dx = Number(data.dirX);
    const dy = Number(data.dirY || 0);
    const dz = Number(data.dirZ);
    if (!Number.isFinite(dx) || !Number.isFinite(dz)) return;

    const length = Math.hypot(dx, dz);
    if (length < 0.001) return;
    const dirX = dx / length;
    const dirZ = dz / length;

    // Check hit against all other alive players
    let hitTarget = null;
    let hitDistance = weaponConfig.range;
    let isHeadshot = false;

    for (const target of this.players.values()) {
      if (target.id === shooterId || !target.alive) continue;
      if (shooter.teamId && shooter.teamId === target.teamId && this.mode !== "solo") continue;

      const vx = target.x - shooter.x;
      const vz = target.z - shooter.z;
      const forwardDist = vx * dirX + vz * dirZ;
      const lateralDist = Math.abs(vx * dirZ - vz * dirX);

      // Bounding cylinder check (width ~1.8m, height ~2.0m)
      if (forwardDist > 0.8 && forwardDist < hitDistance && lateralDist < 1.6) {
        hitTarget = target;
        hitDistance = forwardDist;
        // Check if aiming at head (pitch / vertical offset)
        if (data.isHeadshot || Math.random() < 0.2) {
          isHeadshot = true;
        }
      }
    }

    if (hitTarget) {
      let rawDamage = weaponConfig.damage;
      if (isHeadshot) rawDamage *= 1.9;

      // Apply Armor / Helmet mitigation
      let actualDamage = rawDamage;
      if (isHeadshot && hitTarget.helmet > 0) {
        const absorption = Math.min(hitTarget.helmet, rawDamage * 0.45);
        hitTarget.helmet = Math.max(0, hitTarget.helmet - absorption * 0.8);
        actualDamage -= absorption;
      } else if (hitTarget.armor > 0) {
        const absorption = Math.min(hitTarget.armor, rawDamage * 0.4);
        hitTarget.armor = Math.max(0, hitTarget.armor - absorption * 0.8);
        actualDamage -= absorption;
      }

      actualDamage = Math.max(5, Math.round(actualDamage));
      hitTarget.health = Math.max(0, hitTarget.health - actualDamage);
      shooter.damageDealt += actualDamage;

      io.emit("hit", {
        shooter: shooter.id,
        target: hitTarget.id,
        damage: actualDamage,
        health: hitTarget.health,
        armor: hitTarget.armor,
        helmet: hitTarget.helmet,
        isHeadshot
      });

      if (hitTarget.health <= 0) {
        this.eliminatePlayer(hitTarget, shooter, weaponConfig.name);
      }
    }

    // Broadcast shot event for muzzle flash, sound & bullet tracer
    io.emit("shot", {
      shooterId,
      weaponId,
      origin: { x: shooter.x, y: shooter.y + 1.4, z: shooter.z },
      dir: { x: dirX, y: dy, z: dirZ },
      hitPoint: hitTarget ? { x: hitTarget.x, y: hitTarget.y + 1.2, z: hitTarget.z } : null
    });
  }

  eliminatePlayer(victim, killer = null, weaponName = "Unknown") {
    victim.alive = false;
    victim.health = 0;

    if (killer) {
      killer.kills++;
    }

    const killEntry = {
      killerName: killer ? killer.name : "The Safe Zone",
      killerId: killer ? killer.id : null,
      victimName: victim.name,
      victimId: victim.id,
      weaponName,
      time: Date.now()
    };
    this.killFeed.unshift(killEntry);
    if (this.killFeed.length > 8) this.killFeed.pop();

    io.emit("eliminated", {
      victimId: victim.id,
      victimName: victim.name,
      killerId: killer ? killer.id : null,
      killerName: killer ? killer.name : "Safe Zone",
      weaponName,
      remainingAlive: this.getAliveCount()
    });

    // Drop Death Crate with victim's loot
    const crateId = `crate_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const droppedLoot = {
      id: crateId,
      type: "death_crate",
      name: `${victim.name}'s Crate`,
      x: victim.x,
      y: 0.5,
      z: victim.z,
      medkits: victim.medkits || 1,
      weapon: victim.currentWeapon !== "fist" ? victim.currentWeapon : "ak47"
    };
    this.lootItems.set(crateId, droppedLoot);
    io.emit("loot_spawned", droppedLoot);
  }

  getAliveCount() {
    let count = 0;
    for (const p of this.players.values()) {
      if (p.alive) count++;
    }
    return count;
  }

  checkVictory() {
    const alivePlayers = Array.from(this.players.values()).filter(p => p.alive);
    if (alivePlayers.length === 1 && this.players.size > 1) {
      const winner = alivePlayers[0];
      this.state = "GAME_OVER";
      io.emit("victory", {
        winnerId: winner.id,
        winnerName: winner.name,
        kills: winner.kills,
        damage: winner.damageDealt
      });
    } else if (alivePlayers.length === 0 && this.players.size > 0) {
      this.state = "GAME_OVER";
      io.emit("game_over", { message: "All players eliminated!" });
    }
  }

  getSnapshot() {
    const playersList = [];
    for (const p of this.players.values()) {
      playersList.push({
        id: p.id,
        name: p.name,
        character: p.character,
        isBot: p.isBot,
        alive: p.alive,
        health: p.health,
        maxHealth: p.maxHealth,
        armor: p.armor,
        helmet: p.helmet,
        medkits: p.medkits,
        kills: p.kills,
        x: Math.round(p.x * 100) / 100,
        y: Math.round(p.y * 100) / 100,
        z: Math.round(p.z * 100) / 100,
        pitch: Math.round(p.pitch * 100) / 100,
        yaw: Math.round(p.yaw * 100) / 100,
        isCrouching: p.isCrouching,
        isSprinting: p.isSprinting,
        isAiming: p.isAiming,
        inVehicle: p.inVehicle,
        currentWeapon: p.currentWeapon
      });
    }

    const vehiclesList = [];
    for (const v of this.vehicles.values()) {
      vehiclesList.push({
        id: v.id,
        type: v.type,
        x: Math.round(v.x * 10) / 10,
        y: Math.round(v.y * 10) / 10,
        z: Math.round(v.z * 10) / 10,
        rot: Math.round(v.rot * 100) / 100,
        speed: Math.round(v.speed * 10) / 10,
        health: v.health,
        driverId: v.driverId
      });
    }

    return {
      state: this.state,
      lobbyTimer: Math.ceil(this.lobbyTimer),
      matchTime: Math.floor(this.matchTime),
      aliveCount: this.getAliveCount(),
      totalPlayers: this.players.size,
      safeZone: {
        x: Math.round(this.safeZone.x * 10) / 10,
        z: Math.round(this.safeZone.z * 10) / 10,
        radius: Math.round(this.safeZone.radius * 10) / 10,
        targetRadius: Math.round(this.safeZone.targetRadius * 10) / 10,
        targetX: Math.round(this.safeZone.targetX * 10) / 10,
        targetZ: Math.round(this.safeZone.targetZ * 10) / 10,
        stage: this.safeZone.stage,
        timer: Math.ceil(this.safeZone.timer),
        isShrinking: this.safeZone.isShrinking
      },
      players: playersList,
      vehicles: vehiclesList,
      killFeed: this.killFeed
    };
  }
}

// Global active match (expandable to multiple rooms)
const defaultMatch = new BattleRoyaleMatch("br_island_main", "solo", 50);

// SOCKET.IO REAL-TIME NETWORKING
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Send initial welcome & full loot map
  socket.emit("welcome", {
    id: socket.id,
    matchState: defaultMatch.state,
    loot: Array.from(defaultMatch.lootItems.values()),
    vehicles: Array.from(defaultMatch.vehicles.values())
  });

  // Player joins with custom character skin and name
  socket.on("join", (data) => {
    if (defaultMatch.state === "GAME_OVER") {
      defaultMatch.state = "LOBBY";
      defaultMatch.lobbyTimer = 6;
      defaultMatch.players.clear();
      defaultMatch.initWorld();
      io.emit("match_reset");
    }
    const name = typeof data === "object" ? data.name : data;
    const character = typeof data === "object" ? data.character : "kelly";
    const player = defaultMatch.addPlayer(socket.id, name, character, false);
    console.log(`Player joined: ${player.name} (${character}) [${socket.id}]`);
    socket.emit("joined", player);
  });

  // Client movement update with anti-teleport bounds checking
  socket.on("move", (data) => {
    const player = defaultMatch.players.get(socket.id);
    if (!player || !player.alive) return;

    if (!Number.isFinite(data.x) || !Number.isFinite(data.z)) return;

    // Boundary check (within 450 units from center)
    if (Math.hypot(data.x, data.z) > 450) return;

    // Teleportation protection: max distance per tick
    const deltaMove = Math.hypot(data.x - player.x, data.z - player.z);
    if (deltaMove > 25 && !player.inVehicle) {
      // Speed hack prevention / desync catchup
      return;
    }

    player.x = data.x;
    player.y = Number.isFinite(data.y) ? data.y : player.y;
    player.z = data.z;
    player.yaw = Number.isFinite(data.yaw) ? data.yaw : player.yaw;
    player.pitch = Number.isFinite(data.pitch) ? data.pitch : player.pitch;
    player.isCrouching = !!data.isCrouching;
    player.isSprinting = !!data.isSprinting;
    player.isAiming = !!data.isAiming;
  });

  // Shooting action
  socket.on("shoot", (data) => {
    defaultMatch.handlePlayerShoot(socket.id, data);
  });

  // Weapon switch
  socket.on("switch_weapon", (weaponId) => {
    const player = defaultMatch.players.get(socket.id);
    if (!player || !player.alive) return;
    if (WEAPON_CONFIGS[weaponId]) {
      player.currentWeapon = weaponId;
    }
  });

  // Loot pickup
  socket.on("pickup_loot", (lootId) => {
    const player = defaultMatch.players.get(socket.id);
    if (!player || !player.alive) return;

    const item = defaultMatch.lootItems.get(lootId);
    if (!item) return;

    const dist = Math.hypot(player.x - item.x, player.z - item.z);
    if (dist > 4.5) return; // Too far to pick up

    // Apply item to player inventory
    if (item.type === "weapon") {
      player.currentWeapon = item.id;
      if (!player.weapons.primary) {
        player.weapons.primary = { id: item.id, ammo: WEAPON_CONFIGS[item.id].clipSize, reserve: item.ammo || 60 };
      } else {
        player.weapons.secondary = { id: item.id, ammo: WEAPON_CONFIGS[item.id].clipSize, reserve: item.ammo || 60 };
      }
    } else if (item.type === "armor") {
      player.armor = Math.min(100, item.armor || 75);
    } else if (item.type === "helmet") {
      player.helmet = Math.min(100, item.armor || 60);
    } else if (item.type === "medkit") {
      player.medkits = (player.medkits || 0) + (item.count || 1);
    } else if (item.type === "death_crate") {
      player.armor = Math.min(100, player.armor + 50);
      player.medkits = (player.medkits || 0) + 1;
      if (item.weapon) player.currentWeapon = item.weapon;
    }

    defaultMatch.lootItems.delete(lootId);
    io.emit("loot_picked_up", { lootId, playerId: socket.id, item });
  });

  // Use Medkit
  socket.on("use_medkit", () => {
    const player = defaultMatch.players.get(socket.id);
    if (!player || !player.alive || player.medkits <= 0) return;
    if (player.health >= 100) return;

    player.medkits--;
    player.health = Math.min(100, player.health + 65);
    socket.emit("medkit_used", { health: player.health, medkits: player.medkits });
  });

  // Vehicle Enter / Exit
  socket.on("vehicle_interact", () => {
    const player = defaultMatch.players.get(socket.id);
    if (!player || !player.alive) return;

    if (player.inVehicle) {
      // Exit vehicle
      const v = defaultMatch.vehicles.get(player.inVehicle);
      if (v) {
        v.driverId = null;
        player.x = v.x + 2.5;
        player.z = v.z + 1;
      }
      player.inVehicle = null;
      io.emit("vehicle_update", { vehicleId: v.id, driverId: null });
    } else {
      // Enter nearest vehicle
      for (const v of defaultMatch.vehicles.values()) {
        const d = Math.hypot(player.x - v.x, player.z - v.z);
        if (d < 4.0 && !v.driverId) {
          v.driverId = player.id;
          player.inVehicle = v.id;
          io.emit("vehicle_update", { vehicleId: v.id, driverId: player.id });
          break;
        }
      }
    }
  });

  // Vehicle driving input
  socket.on("vehicle_drive", (data) => {
    const player = defaultMatch.players.get(socket.id);
    if (!player || !player.inVehicle) return;

    const v = defaultMatch.vehicles.get(player.inVehicle);
    if (!v || v.driverId !== socket.id) return;

    v.x = data.x;
    v.y = data.y || 0;
    v.z = data.z;
    v.rot = data.rot;
    v.speed = data.speed;
    player.x = data.x;
    player.z = data.z;
    player.yaw = data.rot;
  });

  // Vehicle Horn
  socket.on("vehicle_horn", () => {
    const player = defaultMatch.players.get(socket.id);
    if (!player || !player.inVehicle) return;
    io.emit("horn_sound", { vehicleId: player.inVehicle, x: player.x, z: player.z });
  });

  // Restart / Play Again
  socket.on("play_again", () => {
    if (defaultMatch.state === "GAME_OVER") {
      defaultMatch.state = "LOBBY";
      defaultMatch.lobbyTimer = 10;
      defaultMatch.initWorld();
      io.emit("match_reset");
    }
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
    defaultMatch.removePlayer(socket.id);
  });
});

// MAIN SERVER TICK LOOP (25 Hz)
let lastTick = Date.now();
setInterval(() => {
  const now = Date.now();
  const delta = (now - lastTick) / 1000;
  lastTick = now;

  defaultMatch.update(delta);
  io.emit("game_state", defaultMatch.getSnapshot());
}, 1000 / TICK_RATE);

app.get("/", (req, res) => {
  if (req.headers.accept && req.headers.accept.includes("text/html")) {
    const clientHost = req.hostname || "localhost";
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Free Fire 3D - Battle Royale</title>
        <meta http-equiv="refresh" content="1;url=http://${clientHost}:5173" />
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #0c0d10; color: #fff; text-align: center; padding-top: 100px; }
          h1 { font-size: 32px; background: linear-gradient(90deg, #ff9f1a, #ff3838); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          p { color: #a4b0be; font-size: 16px; margin: 16px 0 32px; }
          a { display: inline-block; padding: 18px 36px; background: linear-gradient(135deg, #ff9f1a, #ff3838); color: #fff; font-weight: bold; border-radius: 12px; text-decoration: none; font-size: 20px; box-shadow: 0 8px 24px rgba(255, 56, 56, 0.4); }
        </style>
      </head>
      <body>
        <h1>🔥 Free Fire 3D Server is Online!</h1>
        <p>Redirecting you to the 3D Game Client on Port 5173...</p>
        <a href="http://${clientHost}:5173">👉 CLICK HERE TO OPEN GAME (PORT 5173)</a>
      </body>
      </html>
    `);
  }
  res.send({
    status: "ok",
    game: "Free Fire Style 3D Battle Royale Server",
    playersConnected: io.engine.clientsCount,
    state: defaultMatch.state,
    alivePlayers: defaultMatch.getAliveCount()
  });
});

const PORT = 3001;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Battle Royale Multiplayer Server running on port ${PORT}`);
});

