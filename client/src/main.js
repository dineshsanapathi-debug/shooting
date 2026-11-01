import * as THREE from "three";
import { io } from "socket.io-client";
import "./style.css";

import { IslandMap } from "./map.js";
import { CharacterModel } from "./character.js";
import { WEAPON_TYPES, createWeaponMesh, FXManager } from "./weapons.js";
import { SafeZoneMesh } from "./zone.js";
import { VehicleManager } from "./vehicle.js";
import { LootManager } from "./loot.js";
import { UIManager } from "./ui.js";
import { sounds } from "./audio.js";

// ==========================================
// 1. SETUP SOCKET CONNECTION
// ==========================================
// Detect server host automatically: works when served from backend (same origin) or Vite dev server
const isDevVite = window.location.port === "5173";
const socket = isDevVite
  ? io(`http://${window.location.hostname || "localhost"}:3001`)
  : io();

// ==========================================
// 2. THREE.JS SCENE, CAMERA & RENDERER
// ==========================================
const container = document.getElementById("gameContainer");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x70a1ff);
scene.fog = new THREE.FogExp2(0x70a1ff, 0.0022);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1200);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);

// Lighting
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x3d5634, 1.8);
scene.add(hemiLight);

const sun = new THREE.DirectionalLight(0xfff5e6, 2.5);
sun.position.set(160, 260, 120);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 600;
const d = 180;
sun.shadow.camera.left = -d;
sun.shadow.camera.right = d;
sun.shadow.camera.top = d;
sun.shadow.camera.bottom = -d;
sun.shadow.bias = -0.0005;
scene.add(sun);

// ==========================================
// 3. GAME SUBSYSTEMS
// ==========================================
const islandMap = new IslandMap(scene);
const safeZone = new SafeZoneMesh(scene);
const fxManager = new FXManager(scene);
const vehicleManager = new VehicleManager(scene, islandMap);
const lootManager = new LootManager(scene, islandMap);

// ==========================================
// 4. LOCAL PLAYER STATE
// ==========================================
let myId = null;
let playerName = "Soldier_1";
let playerCharacterSkin = "kelly";
let localPlayerMesh = null;

const playerState = {
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  pitch: 0,
  vy: 0,
  isGrounded: true,
  health: 100,
  armor: 0,
  helmet: 0,
  medkits: 1,
  kills: 0,
  isCrouching: false,
  isSprinting: false,
  isAiming: false,
  isFiring: false,
  isReloading: false,
  inVehicle: null,
  currentWeapon: "ak47",
  ammo: {
    ak47: { clip: 30, reserve: 90 },
    m1014: { clip: 6, reserve: 24 },
    awm: { clip: 5, reserve: 15 },
    deagle: { clip: 7, reserve: 28 },
    fist: { clip: 999, reserve: 999 }
  },
  lastShotTime: 0
};

// Remote Players map
const remotePlayers = new Map();
let currentMatchData = null;

// ==========================================
// 5. USER INTERFACE
// ==========================================
const ui = new UIManager({
  onSelectCharacter: (char) => {
    playerCharacterSkin = char;
    updateLocalCharacterMesh();
  },
  onStartMatch: (name, char, mode) => {
    playerName = name;
    playerCharacterSkin = char;
    sounds.ensureContext();
    updateLocalCharacterMesh();

    socket.emit("join", { name: playerName, character: playerCharacterSkin, mode });
    ui.showLobby(false);
  },
  onPlayAgain: () => {
    ui.hideEndScreens();
    socket.emit("play_again");
  }
});

function updateLocalCharacterMesh() {
  if (localPlayerMesh) {
    scene.remove(localPlayerMesh.group);
  }
  localPlayerMesh = new CharacterModel(playerCharacterSkin, false);
  scene.add(localPlayerMesh.group);
  attachWeaponMesh(localPlayerMesh, playerState.currentWeapon);
}

function attachWeaponMesh(charModel, weaponId) {
  // Clear previous socket meshes
  while (charModel.weaponSocket.children.length > 0) {
    charModel.weaponSocket.remove(charModel.weaponSocket.children[0]);
  }
  if (weaponId !== "fist") {
    const gun = createWeaponMesh(weaponId);
    charModel.weaponSocket.add(gun);
  }
}

// Initial Local Character Mesh
updateLocalCharacterMesh();

// ==========================================
// 6. CONTROLS & INPUT SYSTEM
// ==========================================
const keys = {};
let isPointerLocked = false;
let joyX = 0;
let joyY = 0;
let isMobileSprinting = false;

// PC Keyboard
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;

  if (e.code === "KeyR") reloadWeapon();
  if (e.code === "KeyF") handleInteract();
  if (e.code === "Digit1") switchWeapon("ak47");
  if (e.code === "Digit2") switchWeapon("m1014");
  if (e.code === "Digit3") switchWeapon("deagle");
  if (e.code === "Digit4") switchWeapon("fist");
  if (e.code === "Digit5") useMedkit();
  if (e.code === "KeyH" && playerState.inVehicle) {
    sounds.playHorn();
    socket.emit("vehicle_horn");
  }
  if (e.code === "KeyC") {
    playerState.isCrouching = !playerState.isCrouching;
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

// Pointer Lock (Mouse Look)
renderer.domElement.addEventListener("click", () => {
  if (window.innerWidth > 768 && !isPointerLocked) {
    renderer.domElement.requestPointerLock?.();
  }
  sounds.ensureContext();
});

document.addEventListener("pointerlockchange", () => {
  isPointerLocked = document.pointerLockElement === renderer.domElement;
});

document.addEventListener("mousemove", (e) => {
  if (!isPointerLocked) return;

  const sens = playerState.isAiming ? 0.0012 : 0.0022;
  playerState.yaw -= e.movementX * sens;
  playerState.pitch -= e.movementY * sens;

  // Clamp vertical pitch (-75 to +75 deg)
  const maxPitch = 1.3;
  playerState.pitch = Math.max(-maxPitch, Math.min(maxPitch, playerState.pitch));
});

// Mouse Shoot & ADS
window.addEventListener("mousedown", (e) => {
  sounds.ensureContext();
  if (e.button === 0 && isPointerLocked) {
    playerState.isFiring = true;
    tryShoot();
  } else if (e.button === 2) {
    // RMB: Toggle ADS
    e.preventDefault();
    toggleAim(!playerState.isAiming);
  }
});

window.addEventListener("mouseup", (e) => {
  if (e.button === 0) {
    playerState.isFiring = false;
  }
});

window.addEventListener("contextmenu", (e) => e.preventDefault());

// Mobile Touch Controls
const touchJoystick = document.getElementById("touchJoystick");
const touchKnob = document.getElementById("touchKnob");
let joyActive = false;

touchJoystick.addEventListener("pointerdown", (e) => {
  joyActive = true;
  touchJoystick.setPointerCapture(e.pointerId);
  updateTouchJoystick(e);
});

touchJoystick.addEventListener("pointermove", (e) => {
  if (joyActive) updateTouchJoystick(e);
});

function updateTouchJoystick(e) {
  const rect = touchJoystick.getBoundingClientRect();
  let x = e.clientX - rect.left - rect.width / 2;
  let y = e.clientY - rect.top - rect.height / 2;
  const max = 40;
  const dist = Math.hypot(x, y);
  if (dist > max) {
    x = (x / dist) * max;
    y = (y / dist) * max;
  }
  joyX = x / max;
  joyY = y / max;
  touchKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
}

function resetTouchJoystick() {
  joyActive = false;
  joyX = 0;
  joyY = 0;
  touchKnob.style.transform = "translate(-50%, -50%)";
}

touchJoystick.addEventListener("pointerup", resetTouchJoystick);
touchJoystick.addEventListener("pointercancel", resetTouchJoystick);

// Mobile Right Screen Touch Aiming
let touchLooking = false;
let lastTouchX = 0;
let lastTouchY = 0;

renderer.domElement.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "touch" && e.clientX > window.innerWidth * 0.35) {
    touchLooking = true;
    lastTouchX = e.clientX;
    lastTouchY = e.clientY;
  }
});

renderer.domElement.addEventListener("pointermove", (e) => {
  if (touchLooking && e.pointerType === "touch") {
    const dx = e.clientX - lastTouchX;
    const dy = e.clientY - lastTouchY;
    const sens = playerState.isAiming ? 0.0035 : 0.006;
    playerState.yaw -= dx * sens;
    playerState.pitch -= dy * sens;
    playerState.pitch = Math.max(-1.3, Math.min(1.3, playerState.pitch));
    lastTouchX = e.clientX;
    lastTouchY = e.clientY;
  }
});

renderer.domElement.addEventListener("pointerup", () => {
  touchLooking = false;
});

// Mobile Action Buttons
document.getElementById("btnFire").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  playerState.isFiring = true;
  tryShoot();
});
document.getElementById("btnFire").addEventListener("pointerup", () => {
  playerState.isFiring = false;
});

document.getElementById("btnScope").addEventListener("click", () => {
  toggleAim(!playerState.isAiming);
});

document.getElementById("btnJump").addEventListener("click", () => {
  if (playerState.isGrounded && !playerState.inVehicle) {
    playerState.vy = 8.8;
    playerState.isGrounded = false;
  }
});

document.getElementById("btnCrouch").addEventListener("click", () => {
  playerState.isCrouching = !playerState.isCrouching;
});

document.getElementById("btnSprint").addEventListener("click", () => {
  isMobileSprinting = !isMobileSprinting;
  document.getElementById("btnSprint").style.borderColor = isMobileSprinting ? "#ffb142" : "";
});

document.getElementById("btnReload").addEventListener("click", reloadWeapon);
document.getElementById("btnDrive").addEventListener("click", handleInteract);
document.getElementById("medkitQuickBtn").addEventListener("click", useMedkit);

// Weapon Slot Click Switch
document.querySelectorAll(".weapon-slot").forEach(slot => {
  slot.addEventListener("click", () => {
    switchWeapon(slot.dataset.weapon);
  });
});

function toggleAim(aim) {
  playerState.isAiming = aim;
  const scopeEl = document.getElementById("sniperScopeOverlay");
  if (scopeEl) {
    scopeEl.style.display = (aim && playerState.currentWeapon === "awm") ? "block" : "none";
  }
}

function switchWeapon(weaponId) {
  if (!WEAPON_TYPES[weaponId]) return;
  playerState.currentWeapon = weaponId;
  toggleAim(false);
  attachWeaponMesh(localPlayerMesh, weaponId);
  socket.emit("switch_weapon", weaponId);

  const ammo = playerState.ammo[weaponId] || { clip: 0, reserve: 0 };
  ui.updateWeaponHUD(weaponId, ammo.clip, ammo.reserve);
}

function reloadWeapon() {
  const wId = playerState.currentWeapon;
  const wConfig = WEAPON_TYPES[wId];
  if (!wConfig || wId === "fist" || playerState.isReloading) return;

  const ammo = playerState.ammo[wId];
  if (ammo.clip >= wConfig.clipSize || ammo.reserve <= 0) return;

  playerState.isReloading = true;
  sounds.playReload();

  setTimeout(() => {
    const needed = wConfig.clipSize - ammo.clip;
    const added = Math.min(needed, ammo.reserve);
    ammo.clip += added;
    ammo.reserve -= added;
    playerState.isReloading = false;
    ui.updateWeaponHUD(wId, ammo.clip, ammo.reserve);
  }, wConfig.reloadDuration * 1000);
}

function useMedkit() {
  if (playerState.medkits > 0 && playerState.health < 100) {
    sounds.playHeal();
    socket.emit("use_medkit");
  }
}

function handleInteract() {
  // 1. Check vehicle enter/exit
  if (playerState.inVehicle) {
    socket.emit("vehicle_interact");
    return;
  }
  const nearestVehicle = vehicleManager.getNearestVehicle(playerState.x, playerState.z, 4.0);
  if (nearestVehicle) {
    socket.emit("vehicle_interact");
    return;
  }

  // 2. Check nearby loot pickup
  const nearestLoot = lootManager.getNearestLoot(playerState.x, playerState.z, 3.0);
  if (nearestLoot) {
    socket.emit("pickup_loot", nearestLoot.id);
  }
}

// ==========================================
// 7. WEAPON FIRING & BALLISTICS
// ==========================================
function tryShoot() {
  if (playerState.isReloading || playerState.health <= 0 || playerState.inVehicle) return;

  const wId = playerState.currentWeapon;
  const wConfig = WEAPON_TYPES[wId] || WEAPON_TYPES.ak47;
  const now = Date.now();

  if (now - playerState.lastShotTime < wConfig.fireRate) return;

  const ammo = playerState.ammo[wId];
  if (ammo.clip <= 0) {
    reloadWeapon();
    return;
  }

  ammo.clip--;
  playerState.lastShotTime = now;
  ui.updateWeaponHUD(wId, ammo.clip, ammo.reserve);

  // Play weapon gunshot sound
  sounds.playShoot(wId, false);

  // Character recoil kick
  localPlayerMesh.triggerRecoil();

  // Screen camera recoil punch
  playerState.pitch += wConfig.recoilPitch * (playerState.isAiming ? 0.4 : 1.0);

  // Calculate bullet direction from camera center
  const spread = playerState.isAiming ? wConfig.adsSpread : wConfig.spread;
  const spreadX = (Math.random() - 0.5) * spread;
  const spreadY = (Math.random() - 0.5) * spread;

  const dir = new THREE.Vector3(0, 0, -1);
  dir.applyEuler(new THREE.Euler(playerState.pitch + spreadY, playerState.yaw + spreadX, 0, "YXZ"));
  dir.normalize();

  // Muzzle Flash
  const gunSocketPos = new THREE.Vector3();
  localPlayerMesh.weaponSocket.getWorldPosition(gunSocketPos);
  fxManager.createMuzzleFlash(gunSocketPos, dir);

  // Bullet Tracer
  const tracerEnd = gunSocketPos.clone().add(dir.clone().multiplyScalar(wConfig.range || 150));
  fxManager.createBulletTracer(gunSocketPos, tracerEnd);

  // Emit shoot to server for authoritative hit detection
  socket.emit("shoot", {
    weaponId: wId,
    dirX: dir.x,
    dirY: dir.y,
    dirZ: dir.z,
    isHeadshot: playerState.pitch > 0.08
  });
}

// ==========================================
// 8. MULTIPLAYER NETWORKING EVENTS
// ==========================================
socket.on("connect", () => {
  const statusEl = document.getElementById("serverStatusText");
  if (statusEl) statusEl.textContent = "ONLINE - SERVER READY";
});

socket.on("welcome", (data) => {
  myId = data.id;
  lootManager.syncLoot(data.loot);
  vehicleManager.syncVehicles(data.vehicles);
});

socket.on("joined", (player) => {
  playerState.x = player.x;
  playerState.z = player.z;
  playerState.health = player.health;
  playerState.armor = player.armor;
  playerState.helmet = player.helmet;
  playerState.medkits = player.medkits;
  playerState.currentWeapon = player.currentWeapon;
  switchWeapon(player.currentWeapon);
});

socket.on("game_state", (state) => {
  currentMatchData = state;

  // Sync Safe Zone
  safeZone.update(0.04, state.safeZone);

  // Sync Remote Players
  const currentIds = new Set();
  for (const p of state.players) {
    if (p.id === myId) {
      // Local player health & armor updates from server
      playerState.health = p.health;
      playerState.armor = p.armor;
      playerState.helmet = p.helmet;
      playerState.medkits = p.medkits;
      playerState.kills = p.kills;
      playerState.inVehicle = p.inVehicle;
      continue;
    }

    currentIds.add(p.id);

    let remoteChar = remotePlayers.get(p.id);
    if (!remoteChar) {
      remoteChar = new CharacterModel(p.character || "kelly", true);
      scene.add(remoteChar.group);
      attachWeaponMesh(remoteChar, p.currentWeapon || "ak47");
      remotePlayers.set(p.id, remoteChar);
    }

    // Interpolate remote player position
    remoteChar.group.position.x = THREE.MathUtils.lerp(remoteChar.group.position.x, p.x, 0.35);
    remoteChar.group.position.y = THREE.MathUtils.lerp(remoteChar.group.position.y, p.y, 0.35);
    remoteChar.group.position.z = THREE.MathUtils.lerp(remoteChar.group.position.z, p.z, 0.35);

    remoteChar.group.rotation.y = THREE.MathUtils.lerp(remoteChar.group.rotation.y, p.yaw, 0.35);

    // Update animations for remote player
    const remoteSpeed = Math.hypot(p.vx || 0, p.vz || 0);
    const animState = !p.alive ? "death" : p.inVehicle ? "drive" : p.isCrouching ? "crouch" : remoteSpeed > 6 ? "run" : "idle";
    remoteChar.updateAnimation(0.04, animState, remoteSpeed, p.isAiming, p.pitch || 0, true);
    remoteChar.group.visible = p.alive;
  }

  // Remove disconnected remote players
  for (const [id, rChar] of remotePlayers.entries()) {
    if (!currentIds.has(id)) {
      scene.remove(rChar.group);
      remotePlayers.delete(id);
    }
  }

  // Sync Vehicles
  vehicleManager.syncVehicles(state.vehicles);

  // Update Kill Feed
  ui.updateKillFeed(state.killFeed);

  // Update HUD
  ui.updateHUD(playerState, state);
  ui.drawMinimap(playerState.x, playerState.z, playerState.yaw, state, state.vehicles);
});

socket.on("hit", (data) => {
  if (data.shooter === myId) {
    // We hit an enemy! Show hitmarker & play hit sound
    ui.showHitmarker(data.isHeadshot);
    sounds.playHit(data.isHeadshot);
  } else if (data.target === myId) {
    // We took damage! Show red damage arc
    ui.showDamageDirection(Math.random() * Math.PI * 2);
  }
});

socket.on("shot", (data) => {
  if (data.shooterId !== myId) {
    // Remote player shot
    sounds.playShoot(data.weaponId, true);
    if (data.origin && data.dir) {
      const orig = new THREE.Vector3(data.origin.x, data.origin.y, data.origin.z);
      const d = new THREE.Vector3(data.dir.x, data.dir.y, data.dir.z);
      fxManager.createMuzzleFlash(orig, d);
      const tEnd = data.hitPoint ? new THREE.Vector3(data.hitPoint.x, data.hitPoint.y, data.hitPoint.z) : orig.clone().add(d.clone().multiplyScalar(100));
      fxManager.createBulletTracer(orig, tEnd);
    }
  }
});

socket.on("loot_picked_up", (data) => {
  lootManager.removeLoot(data.lootId);
  if (data.playerId === myId) {
    const item = data.item;
    if (item.type === "weapon") {
      playerState.ammo[item.id] = { clip: WEAPON_TYPES[item.id].clipSize, reserve: item.ammo || 60 };
      switchWeapon(item.id);
    } else if (item.type === "medkit") {
      playerState.medkits = (playerState.medkits || 0) + (item.count || 1);
    }
  }
});

socket.on("loot_spawned", (loot) => {
  lootManager.createLootMesh(loot);
});

socket.on("victory", (data) => {
  sounds.playBooyah();
  ui.showVictory(data);
});

socket.on("eliminated", (data) => {
  if (data.victimId === myId) {
    ui.showDefeat({ rank: data.remainingAlive + 1, killer: data.killerName });
  }
});

socket.on("match_reset", () => {
  ui.hideEndScreens();
  ui.showLobby(true);
});

// ==========================================
// 9. LOCAL PHYSICS & MOVEMENT LOOP
// ==========================================
let lastMoveSend = 0;
let footstepTimer = 0;

function updatePlayerMovement(delta) {
  if (playerState.health <= 0) {
    localPlayerMesh.updateAnimation(delta, "death", 0, false, 0, true);
    return;
  }

  // If in vehicle, delegate control to vehicle physics
  if (playerState.inVehicle) {
    const forwardInput = (keys["KeyW"] || keys["ArrowUp"] ? 1 : 0) - (keys["KeyS"] || keys["ArrowDown"] ? 1 : 0) - joyY;
    const steerInput = (keys["KeyA"] || keys["ArrowLeft"] ? -1 : 0) + (keys["KeyD"] || keys["ArrowRight"] ? 1 : 0) + joyX;

    const v = vehicleManager.vehicles.get(playerState.inVehicle);
    if (v) {
      vehicleManager.activeVehicle = v;
      sounds.startVehicleEngine();
      sounds.updateVehicleEngine(v.userData.speed);

      vehicleManager.updateLocalDriving(delta, forwardInput, steerInput, (vData) => {
        socket.emit("vehicle_drive", vData);
        playerState.x = vData.x;
        playerState.y = vData.y;
        playerState.z = vData.z;
        playerState.yaw = vData.rot;
      });

      // Attach player mesh inside vehicle
      localPlayerMesh.group.position.set(v.position.x, v.position.y + 0.3, v.position.z);
      localPlayerMesh.group.rotation.y = v.rotation.y;
      localPlayerMesh.updateAnimation(delta, "drive", 0, false, 0, true);
    }
    return;
  } else {
    sounds.stopVehicleEngine();
    vehicleManager.activeVehicle = null;
  }

  // Keyboard / Joystick movement vectors
  const forward = (keys["KeyW"] || keys["ArrowUp"] ? 1 : 0) - (keys["KeyS"] || keys["ArrowDown"] ? 1 : 0) - joyY;
  const sideways = (keys["KeyD"] || keys["ArrowRight"] ? 1 : 0) - (keys["KeyA"] || keys["ArrowLeft"] ? 1 : 0) + joyX;

  const moveLen = Math.hypot(forward, sideways);
  let speed = 0;

  if (moveLen > 0.05) {
    const isSprinting = (keys["ShiftLeft"] || keys["ShiftRight"] || isMobileSprinting) && forward > 0.1 && !playerState.isCrouching && !playerState.isAiming;
    playerState.isSprinting = isSprinting;

    // Kelly speed boost passive skill (+15%)
    const skillMultiplier = playerCharacterSkin === "kelly" ? 1.15 : 1.0;
    const baseSpeed = playerState.isCrouching ? 3.5 : isSprinting ? 10.5 : 6.8;
    speed = baseSpeed * skillMultiplier;

    const normF = forward / moveLen;
    const normS = sideways / moveLen;

    const moveX = (Math.sin(playerState.yaw) * normF + Math.cos(playerState.yaw) * normS) * speed * delta;
    const moveZ = (Math.cos(playerState.yaw) * normF - Math.sin(playerState.yaw) * normS) * speed * delta;

    const nextX = playerState.x + moveX;
    const nextZ = playerState.z + moveZ;

    // Island boundary & building obstacle collision check
    if (!islandMap.checkCollision(nextX, nextZ, 0.6)) {
      playerState.x = nextX;
      playerState.z = nextZ;
    }

    // Footstep audio cadence
    footstepTimer += delta * (isSprinting ? 14 : 9);
    if (footstepTimer > 3.0 && playerState.isGrounded) {
      sounds.playFootstep();
      footstepTimer = 0;
    }
  } else {
    playerState.isSprinting = false;
  }

  // Gravity & Vertical Physics
  const groundAltitude = islandMap.getHeight(playerState.x, playerState.z);

  if (keys["Space"] && playerState.isGrounded) {
    playerState.vy = 8.8;
    playerState.isGrounded = false;
  }

  if (!playerState.isGrounded || playerState.vy !== 0) {
    playerState.y += playerState.vy * delta;
    playerState.vy -= 22 * delta; // Gravity

    if (playerState.y <= groundAltitude) {
      playerState.y = groundAltitude;
      playerState.vy = 0;
      playerState.isGrounded = true;
    }
  } else {
    playerState.y = groundAltitude;
  }

  // Update local player model transform
  localPlayerMesh.group.position.set(playerState.x, playerState.y, playerState.z);
  localPlayerMesh.group.rotation.y = playerState.yaw;

  // Determine animation state
  let animState = "idle";
  if (playerState.isCrouching) animState = "crouch";
  else if (playerState.isSprinting) animState = "sprint";
  else if (moveLen > 0.05) animState = "run";

  localPlayerMesh.updateAnimation(delta, animState, speed, playerState.isAiming, playerState.pitch, playerState.isGrounded);

  // Continuous automatic fire if holding trigger
  if (playerState.isFiring) {
    const wConfig = WEAPON_TYPES[playerState.currentWeapon];
    if (wConfig && wConfig.isAuto) {
      tryShoot();
    }
  }

  // Send movement update to server at 25Hz
  const now = performance.now();
  if (now - lastMoveSend > 40 && socket.connected) {
    socket.emit("move", {
      x: playerState.x,
      y: playerState.y,
      z: playerState.z,
      yaw: playerState.yaw,
      pitch: playerState.pitch,
      isCrouching: playerState.isCrouching,
      isSprinting: playerState.isSprinting,
      isAiming: playerState.isAiming
    });
    lastMoveSend = now;
  }

  // Check nearby interaction prompt
  checkInteractionPrompt();
}

function checkInteractionPrompt() {
  if (playerState.inVehicle) {
    ui.showInteractionPrompt("[F] EXIT VEHICLE");
    return;
  }
  const v = vehicleManager.getNearestVehicle(playerState.x, playerState.z, 3.8);
  if (v) {
    ui.showInteractionPrompt("[F] DRIVE MILITARY BUGGY");
    return;
  }
  const loot = lootManager.getNearestLoot(playerState.x, playerState.z, 2.8);
  if (loot) {
    ui.showInteractionPrompt(`[F] PICK UP ${loot.name.toUpperCase()}`);
    return;
  }
  ui.showInteractionPrompt(null);
}

// ==========================================
// 10. THIRD-PERSON CAMERA CONTROLLER
// ==========================================
function updateCamera(delta) {
  const wConfig = WEAPON_TYPES[playerState.currentWeapon] || WEAPON_TYPES.ak47;
  const targetFov = playerState.isAiming ? wConfig.zoomFov : 70;
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 12 * delta);
  camera.updateProjectionMatrix();

  if (playerState.inVehicle) {
    // Vehicle Chase Camera
    const dist = 9.0;
    const height = 4.0;
    const vPos = new THREE.Vector3(
      playerState.x - Math.sin(playerState.yaw) * dist,
      playerState.y + height,
      playerState.z - Math.cos(playerState.yaw) * dist
    );
    camera.position.lerp(vPos, 14 * delta);
    camera.lookAt(playerState.x, playerState.y + 1.2, playerState.z);
    return;
  }

  // Over-The-Shoulder Third Person TPS Camera
  const camDist = playerState.isAiming ? 2.4 : 4.8;
  const shoulderOffset = playerState.isAiming ? 0.65 : 0.85;
  const heightOffset = playerState.isCrouching ? 1.2 : 1.7;

  // Calculate target camera position behind player with pitch tilt
  const cosPitch = Math.cos(playerState.pitch);
  const sinPitch = Math.sin(playerState.pitch);

  const backX = -Math.sin(playerState.yaw) * cosPitch * camDist;
  const backZ = -Math.cos(playerState.yaw) * cosPitch * camDist;
  const backY = sinPitch * camDist;

  // Right shoulder lateral offset vector
  const rightX = Math.cos(playerState.yaw) * shoulderOffset;
  const rightZ = -Math.sin(playerState.yaw) * shoulderOffset;

  const targetCamPos = new THREE.Vector3(
    playerState.x + backX + rightX,
    playerState.y + heightOffset + backY,
    playerState.z + backZ + rightZ
  );

  // Prevent camera clipping into terrain
  const camTerrainY = islandMap.getHeight(targetCamPos.x, targetCamPos.z) + 0.4;
  if (targetCamPos.y < camTerrainY) {
    targetCamPos.y = camTerrainY;
  }

  camera.position.lerp(targetCamPos, 20 * delta);

  // Aim Look Target
  const lookDistance = 60;
  const lookTarget = new THREE.Vector3(
    playerState.x + rightX + Math.sin(playerState.yaw) * cosPitch * lookDistance,
    playerState.y + heightOffset - sinPitch * lookDistance,
    playerState.z + rightZ + Math.cos(playerState.yaw) * cosPitch * lookDistance
  );

  camera.lookAt(lookTarget);

  // Update Compass Heading
  ui.updateCompass(playerState.yaw);
}

// ==========================================
// 11. MAIN RAF GAME LOOP
// ==========================================
let lastFrameTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = Math.min(0.08, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  // Update subsystems
  islandMap.update(delta);
  lootManager.update(delta);
  fxManager.update(delta);

  // Update Player & Camera
  updatePlayerMovement(delta);
  updateCamera(delta);

  // Render Scene
  renderer.render(scene, camera);
}

animate();

// Screen Resize Handler
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

