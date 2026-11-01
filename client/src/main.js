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
import { AirplaneModel, ParachuteModel } from "./airplane.js";

// ==========================================
// 1. SETUP SOCKET CONNECTION
// ==========================================
const isDevVite = window.location.port === "5173";
const socket = isDevVite
  ? io(`http://${window.location.hostname || "localhost"}:3001`)
  : io();

// ==========================================
// 2. THREE.JS SCENE, CAMERA & RENDERER
// ==========================================
const container = document.getElementById("gameContainer");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x74b9ff);
scene.fog = new THREE.FogExp2(0x74b9ff, 0.0018);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1500);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
container.appendChild(renderer.domElement);

// Dynamic Lighting
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x4a6547, 1.8);
scene.add(hemiLight);

const sun = new THREE.DirectionalLight(0xfffae6, 2.6);
sun.position.set(180, 320, 140);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 700;
const d = 220;
sun.shadow.camera.left = -d;
sun.shadow.camera.right = d;
sun.shadow.camera.top = d;
sun.shadow.camera.bottom = -d;
sun.shadow.bias = -0.0004;
scene.add(sun);

// ==========================================
// 3. GAME SUBSYSTEMS & MODELS
// ==========================================
const islandMap = new IslandMap(scene);
const safeZone = new SafeZoneMesh(scene);
const fxManager = new FXManager(scene);
const vehicleManager = new VehicleManager(scene, islandMap);
const lootManager = new LootManager(scene, islandMap);
const airplane = new AirplaneModel(scene);
const localParachute = new ParachuteModel(scene);

// ==========================================
// 4. LOCAL PLAYER STATE
// ==========================================
let myId = null;
let playerName = "Soldier_1";
let playerCharacterSkin = "kelly";
let localPlayerMesh = null;

const playerState = {
  x: -330,
  y: 2.0,
  z: -330,
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
  // Flight & Parachute States: "LANDED" | "IN_PLANE" | "FREEFALL" | "PARACHUTE"
  flightState: "LANDED",
  currentWeapon: "fist",
  ammo: {
    ak47: { clip: 30, reserve: 90 },
    m1014: { clip: 6, reserve: 24 },
    awm: { clip: 5, reserve: 15 },
    deagle: { clip: 7, reserve: 28 },
    fist: { clip: 999, reserve: 999 }
  },
  lastShotTime: 0
};

// Remote Entities Maps
const remotePlayers = new Map();
const remoteParachutes = new Map();
let currentMatchData = null;
let lastWarmupSecond = 60;

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
  },
  onJumpFromPlane: () => {
    handleFlightAction();
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

window.addEventListener("keydown", (e) => {
  keys[e.code] = true;

  // Space key triggers Jump from Plane / Parachute deploy when airborne
  if (e.code === "Space") {
    if (playerState.flightState === "IN_PLANE" || playerState.flightState === "FREEFALL") {
      handleFlightAction();
      return;
    }
  }

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

  const maxPitch = 1.3;
  playerState.pitch = Math.max(-maxPitch, Math.min(maxPitch, playerState.pitch));
});

// Mouse Shoot & ADS
window.addEventListener("mousedown", (e) => {
  sounds.ensureContext();
  if (e.button === 0 && isPointerLocked) {
    if (playerState.flightState === "LANDED") {
      playerState.isFiring = true;
      tryShoot();
    }
  } else if (e.button === 2) {
    e.preventDefault();
    if (playerState.flightState === "LANDED") {
      toggleAim(!playerState.isAiming);
    }
  }
});

window.addEventListener("mouseup", (e) => {
  if (e.button === 0) {
    playerState.isFiring = false;
  }
});

window.addEventListener("contextmenu", (e) => e.preventDefault());

// Touch Joystick
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

// Touch Look Aim
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
  if (playerState.flightState === "LANDED") {
    playerState.isFiring = true;
    tryShoot();
  }
});
document.getElementById("btnFire").addEventListener("pointerup", () => {
  playerState.isFiring = false;
});

document.getElementById("btnScope").addEventListener("click", () => {
  if (playerState.flightState === "LANDED") {
    toggleAim(!playerState.isAiming);
  }
});

document.getElementById("btnJump").addEventListener("click", () => {
  if (playerState.flightState === "IN_PLANE" || playerState.flightState === "FREEFALL") {
    handleFlightAction();
    return;
  }
  if (playerState.isGrounded && !playerState.inVehicle) {
    playerState.vy = 8.8;
    playerState.isGrounded = false;
  }
});

document.getElementById("btnCrouch").addEventListener("click", () => {
  if (playerState.flightState === "LANDED") {
    playerState.isCrouching = !playerState.isCrouching;
  }
});

document.getElementById("btnSprint").addEventListener("click", () => {
  isMobileSprinting = !isMobileSprinting;
  document.getElementById("btnSprint").style.borderColor = isMobileSprinting ? "#ffb142" : "";
});

document.getElementById("btnReload").addEventListener("click", reloadWeapon);
document.getElementById("btnDrive").addEventListener("click", handleInteract);
document.getElementById("medkitQuickBtn").addEventListener("click", useMedkit);

// Weapon Slot Click
document.querySelectorAll(".weapon-slot").forEach(slot => {
  slot.addEventListener("click", () => {
    if (playerState.flightState === "LANDED") {
      switchWeapon(slot.dataset.weapon);
    }
  });
});

// ==========================================
// 7. AIRPLANE JUMP & PARACHUTE ACTIONS
// ==========================================
function handleFlightAction() {
  if (playerState.flightState === "IN_PLANE") {
    // Eject from plane!
    playerState.flightState = "FREEFALL";
    sounds.playShoot("deagle", true); // quick release click
    sounds.startWindRush();
    socket.emit("jump_from_plane");
  } else if (playerState.flightState === "FREEFALL") {
    // Deploy parachute
    playerState.flightState = "PARACHUTE";
    sounds.stopWindRush();
    sounds.playParachuteOpen();
    localParachute.setVisible(true);
    socket.emit("open_parachute");
  }
}

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
  if (playerState.flightState !== "LANDED") return;

  // 1. Vehicle enter/exit
  if (playerState.inVehicle) {
    socket.emit("vehicle_interact");
    return;
  }
  const nearestVehicle = vehicleManager.getNearestVehicle(playerState.x, playerState.z, 4.0);
  if (nearestVehicle) {
    socket.emit("vehicle_interact");
    return;
  }

  // 2. Loot pickup
  const nearestLoot = lootManager.getNearestLoot(playerState.x, playerState.z, 3.0);
  if (nearestLoot) {
    socket.emit("pickup_loot", nearestLoot.id);
  }
}

// ==========================================
// 8. WEAPON FIRING & BALLISTICS
// ==========================================
function tryShoot() {
  if (playerState.isReloading || playerState.health <= 0 || playerState.inVehicle || playerState.flightState !== "LANDED") return;

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

  sounds.playShoot(wId, false);
  localPlayerMesh.triggerRecoil();
  playerState.pitch += wConfig.recoilPitch * (playerState.isAiming ? 0.4 : 1.0);

  const spread = playerState.isAiming ? wConfig.adsSpread : wConfig.spread;
  const spreadX = (Math.random() - 0.5) * spread;
  const spreadY = (Math.random() - 0.5) * spread;

  const dir = new THREE.Vector3(0, 0, -1);
  dir.applyEuler(new THREE.Euler(playerState.pitch + spreadY, playerState.yaw + spreadX, 0, "YXZ"));
  dir.normalize();

  const gunSocketPos = new THREE.Vector3();
  localPlayerMesh.weaponSocket.getWorldPosition(gunSocketPos);
  fxManager.createMuzzleFlash(gunSocketPos, dir);

  const tracerEnd = gunSocketPos.clone().add(dir.clone().multiplyScalar(wConfig.range || 150));
  fxManager.createBulletTracer(gunSocketPos, tracerEnd);

  socket.emit("shoot", {
    weaponId: wId,
    dirX: dir.x,
    dirY: dir.y,
    dirZ: dir.z,
    isHeadshot: playerState.pitch > 0.08
  });
}

// ==========================================
// 9. MULTIPLAYER NETWORKING EVENTS
// ==========================================
socket.on("connect", () => {
  const statusEl = document.getElementById("serverStatusText");
  if (statusEl) statusEl.textContent = "ONLINE - BHARAT MAP READY";
});

socket.on("welcome", (data) => {
  myId = data.id;
  lootManager.syncLoot(data.loot);
  vehicleManager.syncVehicles(data.vehicles);
});

socket.on("joined", (player) => {
  playerState.x = player.x;
  playerState.y = player.y;
  playerState.z = player.z;
  playerState.health = player.health;
  playerState.flightState = player.flightState || "LANDED";
  playerState.currentWeapon = player.currentWeapon;
  switchWeapon(player.currentWeapon);
});

socket.on("airplane_started", (data) => {
  playerState.flightState = "IN_PLANE";
  sounds.startAirplaneEngine();
});

socket.on("battle_begins", () => {
  sounds.stopAirplaneEngine();
  sounds.stopWindRush();
});

socket.on("game_state", (state) => {
  currentMatchData = state;

  // Warmup countdown audio beeps in final 5 seconds
  if (state.state === "WARMUP" && state.warmupTimer <= 5 && state.warmupTimer !== lastWarmupSecond) {
    lastWarmupSecond = state.warmupTimer;
    sounds.playCountdownBeep(state.warmupTimer === 0);
  }

  // Sync Airplane Model
  if (state.plane && (state.state === "AIRPLANE" || state.plane.active)) {
    airplane.group.visible = true;
    airplane.update(0.04, state.plane.progress, state.plane);
  } else {
    airplane.group.visible = false;
  }

  // Sync Safe Zone
  safeZone.update(0.04, state.safeZone);

  // Sync Remote Players & Remote Parachutes
  const currentIds = new Set();
  for (const p of state.players) {
    if (p.id === myId) {
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

    // Remote Parachute
    let rChute = remoteParachutes.get(p.id);
    if (!rChute) {
      rChute = new ParachuteModel(scene);
      remoteParachutes.set(p.id, rChute);
    }

    // Hide remote player while inside plane
    if (p.flightState === "IN_PLANE") {
      remoteChar.group.visible = false;
      rChute.setVisible(false);
      continue;
    }

    remoteChar.group.visible = p.alive;

    // Interpolate remote player position
    remoteChar.group.position.x = THREE.MathUtils.lerp(remoteChar.group.position.x, p.x, 0.35);
    remoteChar.group.position.y = THREE.MathUtils.lerp(remoteChar.group.position.y, p.y, 0.35);
    remoteChar.group.position.z = THREE.MathUtils.lerp(remoteChar.group.position.z, p.z, 0.35);
    remoteChar.group.rotation.y = THREE.MathUtils.lerp(remoteChar.group.rotation.y, p.yaw, 0.35);

    // Update remote animation & parachute
    if (p.flightState === "PARACHUTE") {
      remoteChar.updateAnimation(0.04, "parachute", 0, false, 0, false);
      rChute.attachTo(remoteChar.group.position, p.yaw, 0, 0);
      rChute.setVisible(true);
    } else if (p.flightState === "FREEFALL") {
      remoteChar.updateAnimation(0.04, "freefall", 0, false, 0, false);
      rChute.setVisible(false);
    } else {
      rChute.setVisible(false);
      const remoteSpeed = Math.hypot(p.vx || 0, p.vz || 0);
      const animState = !p.alive ? "death" : p.inVehicle ? "drive" : p.isCrouching ? "crouch" : remoteSpeed > 6 ? "run" : "idle";
      remoteChar.updateAnimation(0.04, animState, remoteSpeed, p.isAiming, p.pitch || 0, true);
    }
  }

  // Remove disconnected entities
  for (const [id, rChar] of remotePlayers.entries()) {
    if (!currentIds.has(id)) {
      scene.remove(rChar.group);
      remotePlayers.delete(id);
      const rC = remoteParachutes.get(id);
      if (rC) {
        scene.remove(rC.group);
        remoteParachutes.delete(id);
      }
    }
  }

  vehicleManager.syncVehicles(state.vehicles);
  ui.updateKillFeed(state.killFeed);
  ui.updateHUD(playerState, state);
  ui.drawMinimap(playerState.x, playerState.z, playerState.yaw, state, state.vehicles);
});

socket.on("hit", (data) => {
  if (data.shooter === myId) {
    ui.showHitmarker(data.isHeadshot);
    sounds.playHit(data.isHeadshot);
  } else if (data.target === myId) {
    ui.showDamageDirection(Math.random() * Math.PI * 2);
  }
});

socket.on("shot", (data) => {
  if (data.shooterId !== myId) {
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
// 10. LOCAL PHYSICS & MOVEMENT LOOP
// ==========================================
let lastMoveSend = 0;
let footstepTimer = 0;

function updatePlayerMovement(delta) {
  if (playerState.health <= 0) {
    localPlayerMesh.updateAnimation(delta, "death", 0, false, 0, true);
    return;
  }

  // 1. IN AIRPLANE FLIGHT STATE
  if (playerState.flightState === "IN_PLANE") {
    localPlayerMesh.group.visible = false;
    localParachute.setVisible(false);

    if (currentMatchData && currentMatchData.plane) {
      playerState.x = currentMatchData.plane.x;
      playerState.y = currentMatchData.plane.altitude;
      playerState.z = currentMatchData.plane.z;
      playerState.yaw = currentMatchData.plane.heading;
    }
    return;
  }

  localPlayerMesh.group.visible = true;

  // 2. FREEFALL SKYDIVE STATE
  if (playerState.flightState === "FREEFALL") {
    localParachute.setVisible(false);

    // Skydive fall speed (~18 to 26 m/s)
    const diveSpeed = keys["KeyW"] || joyY < -0.2 ? 26 : 18;
    playerState.vy = -diveSpeed;
    playerState.y += playerState.vy * delta;

    // Horizontal steering in freefall
    const steerF = (keys["KeyW"] ? 1 : 0) - (keys["KeyS"] ? 1 : 0) - joyY;
    const steerS = (keys["KeyD"] ? 1 : 0) - (keys["KeyA"] ? 1 : 0) + joyX;
    const hSpeed = 16.0;

    const moveX = (Math.sin(playerState.yaw) * steerF + Math.cos(playerState.yaw) * steerS) * hSpeed * delta;
    const moveZ = (Math.cos(playerState.yaw) * steerF - Math.sin(playerState.yaw) * steerS) * hSpeed * delta;
    playerState.x += moveX;
    playerState.z += moveZ;

    localPlayerMesh.group.position.set(playerState.x, playerState.y, playerState.z);
    localPlayerMesh.group.rotation.y = playerState.yaw;
    localPlayerMesh.updateAnimation(delta, "freefall", 0, false, 0, false);

    sounds.updateWindSpeed(Math.abs(playerState.vy) / 26);

    // Auto-open parachute at 38m altitude
    const groundY = islandMap.getHeight(playerState.x, playerState.z);
    if (playerState.y <= groundY + 38) {
      handleFlightAction(); // Opens parachute
    }

    sendMovement(delta);
    return;
  }

  // 3. PARACHUTE GLIDE STATE
  if (playerState.flightState === "PARACHUTE") {
    // Gentle glide descent speed (~5.5 m/s)
    playerState.vy = -5.5;
    playerState.y += playerState.vy * delta;

    // Horizontal glide control
    const steerF = (keys["KeyW"] ? 1 : 0) - (keys["KeyS"] ? 0.5 : 0) - joyY;
    const steerS = (keys["KeyD"] ? 1 : 0) - (keys["KeyA"] ? 1 : 0) + joyX;
    const glideSpeed = 11.0;

    const moveX = (Math.sin(playerState.yaw) * steerF + Math.cos(playerState.yaw) * steerS) * glideSpeed * delta;
    const moveZ = (Math.cos(playerState.yaw) * steerF - Math.sin(playerState.yaw) * steerS) * glideSpeed * delta;
    playerState.x += moveX;
    playerState.z += moveZ;

    localPlayerMesh.group.position.set(playerState.x, playerState.y, playerState.z);
    localPlayerMesh.group.rotation.y = playerState.yaw;
    localPlayerMesh.updateAnimation(delta, "parachute", 0, false, 0, false);

    // Attach parachute canopy model
    localParachute.attachTo(playerState, playerState.yaw, steerS, steerF);
    localParachute.setVisible(true);

    // Touchdown ground detection
    const groundY = islandMap.getHeight(playerState.x, playerState.z);
    if (playerState.y <= groundY + 0.3) {
      playerState.y = groundY;
      playerState.vy = 0;
      playerState.flightState = "LANDED";
      localParachute.setVisible(false);
      sounds.playLandingThump();
      socket.emit("player_landed");
    }

    sendMovement(delta);
    return;
  }

  // 4. NORMAL BOOTS-ON-THE-GROUND COMBAT & VEHICLE MOVEMENT
  localParachute.setVisible(false);

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

      localPlayerMesh.group.position.set(v.position.x, v.position.y + 0.3, v.position.z);
      localPlayerMesh.group.rotation.y = v.rotation.y;
      localPlayerMesh.updateAnimation(delta, "drive", 0, false, 0, true);
    }
    return;
  } else {
    sounds.stopVehicleEngine();
    vehicleManager.activeVehicle = null;
  }

  const forward = (keys["KeyW"] || keys["ArrowUp"] ? 1 : 0) - (keys["KeyS"] || keys["ArrowDown"] ? 1 : 0) - joyY;
  const sideways = (keys["KeyD"] || keys["ArrowRight"] ? 1 : 0) - (keys["KeyA"] || keys["ArrowLeft"] ? 1 : 0) + joyX;

  const moveLen = Math.hypot(forward, sideways);
  let speed = 0;

  if (moveLen > 0.05) {
    const isSprinting = (keys["ShiftLeft"] || keys["ShiftRight"] || isMobileSprinting) && forward > 0.1 && !playerState.isCrouching && !playerState.isAiming;
    playerState.isSprinting = isSprinting;

    const skillMultiplier = playerCharacterSkin === "kelly" ? 1.15 : 1.0;
    const baseSpeed = playerState.isCrouching ? 3.5 : isSprinting ? 10.5 : 6.8;
    speed = baseSpeed * skillMultiplier;

    const normF = forward / moveLen;
    const normS = sideways / moveLen;

    const moveX = (Math.sin(playerState.yaw) * normF + Math.cos(playerState.yaw) * normS) * speed * delta;
    const moveZ = (Math.cos(playerState.yaw) * normF - Math.sin(playerState.yaw) * normS) * speed * delta;

    const nextX = playerState.x + moveX;
    const nextZ = playerState.z + moveZ;

    if (!islandMap.checkCollision(nextX, nextZ, 0.6)) {
      playerState.x = nextX;
      playerState.z = nextZ;
    }

    footstepTimer += delta * (isSprinting ? 14 : 9);
    if (footstepTimer > 3.0 && playerState.isGrounded) {
      sounds.playFootstep();
      footstepTimer = 0;
    }
  } else {
    playerState.isSprinting = false;
  }

  // Gravity
  const groundAltitude = islandMap.getHeight(playerState.x, playerState.z);

  if (keys["Space"] && playerState.isGrounded) {
    playerState.vy = 8.8;
    playerState.isGrounded = false;
  }

  if (!playerState.isGrounded || playerState.vy !== 0) {
    playerState.y += playerState.vy * delta;
    playerState.vy -= 22 * delta;

    if (playerState.y <= groundAltitude) {
      playerState.y = groundAltitude;
      playerState.vy = 0;
      playerState.isGrounded = true;
    }
  } else {
    playerState.y = groundAltitude;
  }

  localPlayerMesh.group.position.set(playerState.x, playerState.y, playerState.z);
  localPlayerMesh.group.rotation.y = playerState.yaw;

  let animState = "idle";
  if (playerState.isCrouching) animState = "crouch";
  else if (playerState.isSprinting) animState = "sprint";
  else if (moveLen > 0.05) animState = "run";

  localPlayerMesh.updateAnimation(delta, animState, speed, playerState.isAiming, playerState.pitch, playerState.isGrounded);

  if (playerState.isFiring) {
    const wConfig = WEAPON_TYPES[playerState.currentWeapon];
    if (wConfig && wConfig.isAuto) tryShoot();
  }

  sendMovement(delta);
  checkInteractionPrompt();
}

function sendMovement() {
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
      isAiming: playerState.isAiming,
      flightState: playerState.flightState
    });
    lastMoveSend = now;
  }
}

function checkInteractionPrompt() {
  if (playerState.flightState !== "LANDED") {
    ui.showInteractionPrompt(null);
    return;
  }
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
// 11. CAMERA CONTROLLER (TPS / AIRPLANE / SKYDIVE)
// ==========================================
function updateCamera(delta) {
  // 1. Airplane Flight Camera View
  if (playerState.flightState === "IN_PLANE" && currentMatchData && currentMatchData.plane) {
    const pl = currentMatchData.plane;
    const camDist = 38.0;
    const camHeight = 16.0;

    const targetPos = new THREE.Vector3(
      pl.x - Math.sin(pl.heading) * camDist,
      pl.y + camHeight,
      pl.z - Math.cos(pl.heading) * camDist
    );
    camera.position.lerp(targetPos, 8 * delta);
    camera.lookAt(pl.x + Math.sin(pl.heading) * 15, pl.y, pl.z + Math.cos(pl.heading) * 15);
    camera.fov = 75;
    camera.updateProjectionMatrix();
    return;
  }

  // 2. Freefall Skydive & Parachute Camera View
  if (playerState.flightState === "FREEFALL" || playerState.flightState === "PARACHUTE") {
    const camDist = playerState.flightState === "FREEFALL" ? 6.5 : 8.5;
    const camHeight = playerState.flightState === "FREEFALL" ? 3.0 : 4.5;

    const targetPos = new THREE.Vector3(
      playerState.x - Math.sin(playerState.yaw) * camDist,
      playerState.y + camHeight,
      playerState.z - Math.cos(playerState.yaw) * camDist
    );
    camera.position.lerp(targetPos, 14 * delta);
    camera.lookAt(playerState.x, playerState.y, playerState.z);
    camera.fov = 72;
    camera.updateProjectionMatrix();
    return;
  }

  // 3. Vehicle Chase Camera
  if (playerState.inVehicle) {
    const dist = 9.0;
    const height = 4.0;
    const vPos = new THREE.Vector3(
      playerState.x - Math.sin(playerState.yaw) * dist,
      playerState.y + height,
      playerState.z - Math.cos(playerState.yaw) * dist
    );
    camera.position.lerp(vPos, 14 * delta);
    camera.lookAt(playerState.x, playerState.y + 1.2, playerState.z);
    camera.fov = 70;
    camera.updateProjectionMatrix();
    return;
  }

  // 4. Over-The-Shoulder Third Person TPS Camera
  const wConfig = WEAPON_TYPES[playerState.currentWeapon] || WEAPON_TYPES.ak47;
  const targetFov = playerState.isAiming ? wConfig.zoomFov : 70;
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 12 * delta);
  camera.updateProjectionMatrix();

  const camDist = playerState.isAiming ? 2.4 : 4.8;
  const shoulderOffset = playerState.isAiming ? 0.65 : 0.85;
  const heightOffset = playerState.isCrouching ? 1.2 : 1.7;

  const cosPitch = Math.cos(playerState.pitch);
  const sinPitch = Math.sin(playerState.pitch);

  const backX = -Math.sin(playerState.yaw) * cosPitch * camDist;
  const backZ = -Math.cos(playerState.yaw) * cosPitch * camDist;
  const backY = sinPitch * camDist;

  const rightX = Math.cos(playerState.yaw) * shoulderOffset;
  const rightZ = -Math.sin(playerState.yaw) * shoulderOffset;

  const targetCamPos = new THREE.Vector3(
    playerState.x + backX + rightX,
    playerState.y + heightOffset + backY,
    playerState.z + backZ + rightZ
  );

  const camTerrainY = islandMap.getHeight(targetCamPos.x, targetCamPos.z) + 0.4;
  if (targetCamPos.y < camTerrainY) targetCamPos.y = camTerrainY;

  camera.position.lerp(targetCamPos, 20 * delta);

  const lookDistance = 60;
  const lookTarget = new THREE.Vector3(
    playerState.x + rightX + Math.sin(playerState.yaw) * cosPitch * lookDistance,
    playerState.y + heightOffset - sinPitch * lookDistance,
    playerState.z + rightZ + Math.cos(playerState.yaw) * cosPitch * lookDistance
  );

  camera.lookAt(lookTarget);
  ui.updateCompass(playerState.yaw);
}

// ==========================================
// 12. MAIN RAF GAME LOOP
// ==========================================
let lastFrameTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = Math.min(0.08, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  islandMap.update(delta);
  lootManager.update(delta);
  fxManager.update(delta);

  updatePlayerMovement(delta);
  updateCamera(delta);

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
