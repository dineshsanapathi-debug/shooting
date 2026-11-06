import * as THREE from "three";
import { io } from "socket.io-client";
import { getCharacters, loadCharacter } from "./characterManager.js";
import { createThirdPersonController } from "./thirdPersonController.js";
import { WeaponInventory } from "./weaponInventory.js";
import { AirDropController } from "./airDropController.js";
import "./style.css";

// ===============================
// MULTIPLAYER CONNECTION
// ===============================

const SERVER_URL = window.location.origin.startsWith("http")
  ? window.location.origin
  : "http://localhost:3001";

const socket = io(SERVER_URL, {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000
});

const connectionStatus =
  document.getElementById("connectionStatus");

socket.on("connect", () => {
  connectionStatus.textContent =
    "Connected to online server";

  connectionStatus.style.background = "green";
});

socket.on("disconnect", () => {
  connectionStatus.textContent =
    "Disconnected - reconnecting...";

  connectionStatus.style.background = "red";
});

socket.on("connect_error", () => {
  connectionStatus.textContent =
    "Server connection failed";

  connectionStatus.style.background = "red";
});

let myId = null;
let myHealth = 100;
let gameStarted = false;
let characterReady = false;

// ===============================
// THREE.JS SCENE
// ===============================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x87ceeb);

scene.fog = new THREE.Fog(0x87ceeb, 80, 250);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 2)
);

renderer.shadowMap.enabled = true;

document.body.appendChild(renderer.domElement);

// ===============================
// LIGHTING
// ===============================

const sunlight = new THREE.DirectionalLight(
  0xffffff,
  2
);

sunlight.position.set(30, 50, 30);

sunlight.castShadow = true;

scene.add(sunlight);

scene.add(
  new THREE.HemisphereLight(
    0xffffff,
    0x445566,
    1.5
  )
);

// ===============================
// GROUND
// ===============================

const groundGeometry = new THREE.PlaneGeometry(
  300,
  300
);

const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x477b36
});

const ground = new THREE.Mesh(
  groundGeometry,
  groundMaterial
);

ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;

scene.add(ground);

// ===============================
// BUILDINGS
// ===============================

for (let i = 0; i < 35; i++) {

  const building = new THREE.Mesh(
    new THREE.BoxGeometry(
      5 + Math.random() * 5,
      4 + Math.random() * 8,
      5 + Math.random() * 5
    ),
    new THREE.MeshStandardMaterial({
      color: 0x888888
    })
  );

  building.position.set(
    Math.random() * 180 - 90,
    building.geometry.parameters.height / 2,
    Math.random() * 180 - 90
  );

  building.castShadow = true;
  building.receiveShadow = true;

  scene.add(building);
}

// ===============================
// TREES
// ===============================

for (let i = 0; i < 70; i++) {

  const tree = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.3,
      0.5,
      3,
      8
    ),
    new THREE.MeshStandardMaterial({
      color: 0x654321
    })
  );

  trunk.position.y = 1.5;

  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(2, 5, 8),
    new THREE.MeshStandardMaterial({
      color: 0x126b25
    })
  );

  leaves.position.y = 5;

  tree.add(trunk);
  tree.add(leaves);

  tree.position.set(
    Math.random() * 250 - 125,
    0,
    Math.random() * 250 - 125
  );

  scene.add(tree);
}

// ===============================
// PLAYER ROOT GROUP
// ===============================

const player = new THREE.Group();
scene.add(player);

// Default Capsule Placeholder until character model is loaded
const placeholderBody = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.5, 1.0, 4, 8),
  new THREE.MeshStandardMaterial({ color: 0x2563eb })
);
placeholderBody.position.y = 1.0;
placeholderBody.castShadow = true;
player.add(placeholderBody);

// ===============================
// SKILL 3D VISUAL EFFECTS BUILDERS
// ===============================

function createAlokHealingAura() {
  const aura = new THREE.Group();
  aura.name = "AlokHealingAura";

  const outerRingGeo = new THREE.RingGeometry(4.8, 5.0, 32);
  outerRingGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00d2ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  const outerRing = new THREE.Mesh(outerRingGeo, ringMat);
  aura.add(outerRing);

  const innerRingGeo = new THREE.RingGeometry(2.3, 2.5, 32);
  innerRingGeo.rotateX(-Math.PI / 2);
  const innerRing = new THREE.Mesh(innerRingGeo, ringMat);
  aura.add(innerRing);

  aura.visible = false;
  return aura;
}

function createChronoForceField() {
  const shieldGeo = new THREE.SphereGeometry(2.2, 24, 24);
  const shieldMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    metalness: 0.6,
    side: THREE.DoubleSide
  });
  const shield = new THREE.Mesh(shieldGeo, shieldMat);
  shield.name = "ChronoShield";
  shield.position.y = 1.0;
  shield.visible = false;
  return shield;
}

function createWukongBush() {
  const bush = new THREE.Group();
  bush.name = "WukongBush";

  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x166534,
    roughness: 0.8,
    metalness: 0.1
  });
  const leafMatLight = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.7
  });

  const parts = [
    [0, 0.7, 0, 1.1, leafMat],
    [0.4, 0.9, 0.3, 0.85, leafMatLight],
    [-0.4, 0.8, -0.2, 0.9, leafMat],
    [0.2, 1.2, -0.3, 0.8, leafMatLight],
    [-0.3, 1.1, 0.3, 0.75, leafMat]
  ];

  for (const [x, y, z, r, mat] of parts) {
    const sphere = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), mat);
    sphere.position.set(x, y, z);
    bush.add(sphere);
  }

  bush.visible = false;
  return bush;
}

function createMocoMarker() {
  const marker = new THREE.Group();
  marker.name = "MocoMarker";

  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.35),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  diamond.position.y = 2.4;
  marker.add(diamond);

  marker.visible = false;
  return marker;
}

// Local Player Skill Meshes
const localAlokAura = createAlokHealingAura();
player.add(localAlokAura);

const localChronoShield = createChronoForceField();
player.add(localChronoShield);

const localWukongBush = createWukongBush();
player.add(localWukongBush);

// Camera position
camera.position.set(0, 5, 8);

// Third-Person Controller
const controller = createThirdPersonController(
  player,
  camera,
  renderer
);

// Weapon Inventory System
const weaponInventory = new WeaponInventory(
  scene,
  player,
  camera,
  socket
);

// ===============================
// 3D CARGO AIRPLANE MODEL
// ===============================

function createAirplaneModel() {
  const plane = new THREE.Group();
  plane.name = "CargoAirplane";

  // Fuselage (Body)
  const bodyGeo = new THREE.CylinderGeometry(2.6, 2.9, 26, 16);
  bodyGeo.rotateX(Math.PI / 2);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.35,
    metalness: 0.35
  });
  const fuselage = new THREE.Mesh(bodyGeo, bodyMat);
  fuselage.castShadow = true;
  plane.add(fuselage);

  // Nose Cone (Cockpit)
  const noseGeo = new THREE.ConeGeometry(2.6, 7, 16);
  noseGeo.rotateX(-Math.PI / 2);
  const noseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.25 });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.z = 16.5;
  plane.add(nose);

  // Main Wings
  const wingGeo = new THREE.BoxGeometry(34, 0.45, 6);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.25 });
  const wings = new THREE.Mesh(wingGeo, wingMat);
  wings.position.set(0, 0.8, 2);
  wings.castShadow = true;
  plane.add(wings);

  // Jet Engines under wings
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
  for (const xOff of [-8, 8]) {
    const engGeo = new THREE.CylinderGeometry(0.95, 0.95, 5, 12);
    engGeo.rotateX(Math.PI / 2);
    const eng = new THREE.Mesh(engGeo, engineMat);
    eng.position.set(xOff, -0.6, 2);
    plane.add(eng);

    // Jet Engine Exhaust Glow
    const glowGeo = new THREE.CylinderGeometry(0.75, 0.85, 0.3, 12);
    glowGeo.rotateX(Math.PI / 2);
    const glow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    glow.position.set(xOff, -0.6, -0.6);
    plane.add(glow);
  }

  // Vertical Tail Fin
  const tailFinGeo = new THREE.BoxGeometry(0.4, 6.5, 4.5);
  const tailFin = new THREE.Mesh(tailFinGeo, bodyMat);
  tailFin.position.set(0, 4.5, -10.5);
  plane.add(tailFin);

  // Horizontal Tail Stabilizers
  const tailHorGeo = new THREE.BoxGeometry(11, 0.35, 3.2);
  const tailHor = new THREE.Mesh(tailHorGeo, wingMat);
  tailHor.position.set(0, 1.8, -11);
  plane.add(tailHor);

  return plane;
}

const airplane = createAirplaneModel();
airplane.position.set(-160, 85, -160);
scene.add(airplane);

let currentPlanePos = { x: -160, y: 85, z: -160, rotation: 0 };

socket.on("planeUpdate", data => {
  if (data) {
    currentPlanePos = data;
    airplane.position.set(data.x, data.y, data.z);
    airplane.rotation.y = data.rotation;
  }
});

// ===============================
// AIRDROP & PARACHUTE CONTROLLER
// ===============================

const airDrop = new AirDropController(
  scene,
  player,
  camera,
  socket
);

const airDropStatusEl = document.getElementById("airDropStatus");
const altimeterEl = document.getElementById("altimeter");
const altitudeValueEl = document.getElementById("altitudeValue");
const airDropControlsEl = document.getElementById("airDropControls");
const jumpPlaneBtn = document.getElementById("jumpPlaneButton");
const parachuteBtn = document.getElementById("parachuteButton");

function updateAirDropUI(state) {
  if (!gameStarted) {
    if (airDropStatusEl) airDropStatusEl.style.display = "none";
    if (altimeterEl) altimeterEl.style.display = "none";
    if (airDropControlsEl) airDropControlsEl.style.display = "none";
    return;
  }

  if (state === "airplane") {
    controller.setEnabled(false);
    if (airDropStatusEl) {
      airDropStatusEl.style.display = "block";
      airDropStatusEl.textContent = "AIRPLANE (PRESS SPACE OR JUMP)";
    }
    if (altimeterEl) {
      altimeterEl.style.display = "block";
      if (altitudeValueEl) altitudeValueEl.textContent = "85";
    }
    if (airDropControlsEl) airDropControlsEl.style.display = "flex";
    if (jumpPlaneBtn) jumpPlaneBtn.style.display = "block";
    if (parachuteBtn) parachuteBtn.style.display = "none";
  } else if (state === "falling") {
    controller.setEnabled(false);
    if (airDropStatusEl) {
      airDropStatusEl.style.display = "block";
      airDropStatusEl.textContent = "FREEFALLING (WASD STEER | SPACE PARACHUTE)";
    }
    if (altimeterEl) altimeterEl.style.display = "block";
    if (airDropControlsEl) airDropControlsEl.style.display = "flex";
    if (jumpPlaneBtn) jumpPlaneBtn.style.display = "none";
    if (parachuteBtn) parachuteBtn.style.display = "block";
  } else if (state === "parachuting") {
    controller.setEnabled(false);
    if (airDropStatusEl) {
      airDropStatusEl.style.display = "block";
      airDropStatusEl.textContent = "PARACHUTING (GLIDING TO TARGET)";
    }
    if (altimeterEl) altimeterEl.style.display = "block";
    if (airDropControlsEl) airDropControlsEl.style.display = "none";
    if (parachuteBtn) parachuteBtn.style.display = "none";
  } else if (state === "landed") {
    controller.setEnabled(true);
    if (airDropStatusEl) airDropStatusEl.style.display = "none";
    if (altimeterEl) altimeterEl.style.display = "none";
    if (airDropControlsEl) airDropControlsEl.style.display = "none";

    if (activeCharacter) {
      activeCharacter.playAnimation("landing");
      setTimeout(() => {
        if (activeCharacter) activeCharacter.playAnimation("idle");
      }, 500);
    }
  }
}

airDrop.onStateChange = newState => {
  updateAirDropUI(newState);
};

jumpPlaneBtn?.addEventListener("click", () => {
  airDrop.jumpFromPlane();
});

parachuteBtn?.addEventListener("click", () => {
  airDrop.openParachute();
});

// Spawn weapons around the map
const weaponSpawnPoints = [
  { id: "weapon_1", type: "rifle", x: 15, y: 0, z: 12 },
  { id: "weapon_2", type: "pistol", x: -20, y: 0, z: 10 },
  { id: "weapon_3", type: "shotgun", x: 30, y: 0, z: -15 },
  { id: "weapon_4", type: "sniper", x: -35, y: 0, z: -25 },
  { id: "weapon_5", type: "smg", x: 5, y: 0, z: 40 }
];

for (const item of weaponSpawnPoints) {
  weaponInventory.addGroundWeapon(
    item.id,
    item.type,
    new THREE.Vector3(item.x, item.y, item.z)
  );
}

// Inventory UI Button Listeners
document.getElementById("slot1")?.addEventListener("click", () => {
  weaponInventory.switchWeapon(0);
});

document.getElementById("slot2")?.addEventListener("click", () => {
  weaponInventory.switchWeapon(1);
});

document.getElementById("slot3")?.addEventListener("click", () => {
  weaponInventory.switchWeapon(2);
});

// ===============================
// CHARACTER SELECTION
// ===============================

let activeCharacter = null;
let selectedCharacterId = "soldier1";

const characterList =
  document.getElementById("characterList");

const characterScreen =
  document.getElementById("characterScreen");

const selectButton =
  document.getElementById("selectCharacter");

getCharacters().forEach(character => {
  const button = document.createElement("button");

  button.className = "character-card";
  button.innerHTML = `
    <div class="card-badge">${character.badge || "🎖️"}</div>
    <div class="card-name">${character.name}</div>
    <div class="card-role">${character.skillName || character.role}</div>
    <div class="card-type" style="font-size: 0.68rem; color: ${character.skillType === 'active' ? '#f59e0b' : '#38bdf8'}; font-weight: bold; text-transform: uppercase;">${character.skillType || 'passive'}</div>
  `;

  button.addEventListener("click", () => {
    selectedCharacterId = character.id;

    document.querySelectorAll(".character-card")
      .forEach(card => card.classList.remove("selected"));

    button.classList.add("selected");

    socket.emit("selectCharacter", selectedCharacterId);
  });

  characterList.appendChild(button);
});

characterList.firstElementChild?.classList.add("selected");

selectButton.addEventListener("click", async () => {
  selectButton.disabled = true;

  try {
    if (activeCharacter) {
      player.remove(activeCharacter.model);
      activeCharacter.dispose();
    }

    activeCharacter = await loadCharacter(
      selectedCharacterId
    );

    // Remove temporary placeholder
    if (placeholderBody.parent) {
      player.remove(placeholderBody);
    }

    // Keep the existing player root group.
    player.add(activeCharacter.model);

    activeCharacter.model.position.set(0, 0, 0);

    characterReady = true;
    characterScreen.style.display = "none";

  } catch (error) {
    console.error("Character loading failed:", error);
    alert("Unable to load character. Check the GLB model path.");
  } finally {
    selectButton.disabled = false;
  }
});

// Auto-load default character initially so game is playable even before selecting
loadCharacter(selectedCharacterId).then(loaded => {
  activeCharacter = loaded;
  if (placeholderBody.parent) {
    player.remove(placeholderBody);
  }
  player.add(activeCharacter.model);
  characterReady = true;
}).catch(console.warn);

// ===============================
// OTHER PLAYERS
// ===============================

const otherPlayers = {};

function createOtherPlayer(id, charId = "soldier1") {

  const group = new THREE.Group();

  const colors = {
    soldier1: 0x2563eb,
    soldier2: 0xdc2626,
    soldier3: 0x9333ea,
    soldier4: 0x16a34a
  };

  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.5, 1.0, 4, 8),
    new THREE.MeshStandardMaterial({
      color: colors[charId] || 0xff3333
    })
  );

  mesh.position.y = 1.0;
  mesh.castShadow = true;

  group.add(mesh);

  // Parachute for other player
  const remoteParachute = airDrop.createProceduralParachute();
  remoteParachute.position.y = 3.6;
  remoteParachute.visible = false;
  group.add(remoteParachute);
  group.userData.parachute = remoteParachute;

  // Remote player skill effects
  const remoteAlokAura = createAlokHealingAura();
  group.add(remoteAlokAura);
  group.userData.alokAura = remoteAlokAura;

  const remoteChronoShield = createChronoForceField();
  group.add(remoteChronoShield);
  group.userData.chronoShield = remoteChronoShield;

  const remoteWukongBush = createWukongBush();
  group.add(remoteWukongBush);
  group.userData.wukongBush = remoteWukongBush;

  const remoteMocoMarker = createMocoMarker();
  group.add(remoteMocoMarker);
  group.userData.mocoMarker = remoteMocoMarker;

  group.userData.targetPosition = new THREE.Vector3();
  group.userData.targetRotation = 0;

  scene.add(group);

  otherPlayers[id] = group;
}

function removeOtherPlayer(id) {

  if (!otherPlayers[id]) return;

  scene.remove(otherPlayers[id]);
  delete otherPlayers[id];
}

// ===============================
// START GAME
// ===============================

const startButton = document.getElementById("startButton");
if (startButton) {
  startButton.addEventListener("click", async () => {
    startButton.disabled = true;
    startButton.textContent = "ENTERING BATTLEGROUND...";

    try {
      if (activeCharacter) {
        player.remove(activeCharacter.model);
        activeCharacter.dispose();
      }

      activeCharacter = await loadCharacter(selectedCharacterId);
      if (placeholderBody.parent) {
        player.remove(placeholderBody);
      }
      player.add(activeCharacter.model);
      activeCharacter.model.position.set(0, 0, 0);
    } catch (err) {
      console.warn("Character load warning:", err);
    }

    characterReady = true;
    gameStarted = true;

    // Start in airplane drop mode
    airDrop.state = "airplane";
    player.position.set(currentPlanePos.x, currentPlanePos.y, currentPlanePos.z);
    updateAirDropUI("airplane");

    if (characterScreen) {
      characterScreen.style.display = "none";
    }
    startButton.style.display = "none";

    document.body.requestPointerLock();
    socket.emit("joinGame", { characterId: selectedCharacterId });
  });
}

// Respawn Button Handler
const respawnButton = document.getElementById("respawnButton");
if (respawnButton) {
  respawnButton.addEventListener("click", () => {
    const gameOverScreen = document.getElementById("gameOverScreen");
    if (gameOverScreen) {
      gameOverScreen.style.display = "none";
    }
    document.body.requestPointerLock();
    socket.emit("respawnRequest");
  });
}

// ===============================
// SHOOTING
// ===============================

let lastShootTime = 0;

function shoot() {

  if (!gameStarted || myHealth <= 0 || airDrop.state !== "landed") return;

  const now = performance.now();
  if (now - lastShootTime < 200) return; // Cooldown
  lastShootTime = now;

  const direction = new THREE.Vector3();

  camera.getWorldDirection(direction);

  socket.emit("shoot", {
    origin: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    },

    direction: {
      x: direction.x,
      y: direction.y,
      z: direction.z
    }
  });
}

window.addEventListener("click", () => {
  if (gameStarted && document.pointerLockElement) {
    shoot();
  }
});

// ===============================
// MOBILE CONTROLS
// ===============================

const jumpBtn = document.getElementById("jumpButton");
if (jumpBtn) {
  jumpBtn.addEventListener("pointerdown", () => {
    controller.jump();
  });
}

const crouchBtn = document.getElementById("crouchButton");
let crouchingState = false;
if (crouchBtn) {
  crouchBtn.addEventListener("pointerdown", () => {
    crouchingState = !crouchingState;
    controller.setCrouching(crouchingState);
  });
}

const aimBtn = document.getElementById("aimButton");
let aimingState = false;
if (aimBtn) {
  aimBtn.addEventListener("pointerdown", () => {
    aimingState = !aimingState;
    controller.setAiming(aimingState);
  });
}

const shootBtn = document.getElementById("shootButton");
if (shootBtn) {
  shootBtn.addEventListener("pointerdown", () => {
    shoot();
  });
}

const reloadBtn = document.getElementById("reloadButton");
if (reloadBtn) {
  reloadBtn.addEventListener("pointerdown", () => {
    socket.emit("reload");
  });
}

// Mobile joystick touch handlers
const joystickElement = document.getElementById("joystick");
const knob = document.getElementById("joystickKnob");

if (joystickElement && knob) {
  let activeTouch = null;

  joystickElement.addEventListener("pointerdown", event => {
    activeTouch = event.pointerId;
    joystickElement.setPointerCapture(activeTouch);
    updateJoystickTouch(event);
  });

  joystickElement.addEventListener("pointermove", event => {
    if (event.pointerId === activeTouch) {
      updateJoystickTouch(event);
    }
  });

  function updateJoystickTouch(event) {
    const rect = joystickElement.getBoundingClientRect();
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);

    const maxDistance = 35;
    const length = Math.hypot(dx, dy);

    if (length > maxDistance) {
      dx = (dx / length) * maxDistance;
      dy = (dy / length) * maxDistance;
    }

    controller.setJoystick(dx / maxDistance, dy / maxDistance);
    airDrop.setJoystick(dx / maxDistance, dy / maxDistance);
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function resetJoystickTouch() {
    activeTouch = null;
    controller.setJoystick(0, 0);
    airDrop.setJoystick(0, 0);
    knob.style.transform = "translate(0px, 0px)";
  }

  joystickElement.addEventListener("pointerup", resetJoystickTouch);
  joystickElement.addEventListener("pointercancel", resetJoystickTouch);
}

// ===============================
// SERVER EVENTS
// ===============================

socket.on("connect", () => {
  myId = socket.id;
});

socket.on("playersUpdate", data => {

  const connectedIds = new Set(
    data.map(item => item.id)
  );

  for (const item of data) {

    if (item.id === myId) {
      myHealth = item.health;
      continue;
    }

    if (!otherPlayers[item.id]) {
      createOtherPlayer(item.id, item.characterId);
    }

    const remote = otherPlayers[item.id];
    remote.userData.targetPosition.set(
      item.x,
      item.y || 0,
      item.z
    );

    remote.userData.targetRotation =
      item.rotation || 0;

    if (remote.userData.parachute) {
      remote.userData.parachute.visible = (item.state === "parachuting");
    }
    if (item.state === "falling") {
      remote.rotation.x = 0.6;
    } else {
      remote.rotation.x = 0;
    }
  }

  for (const id of Object.keys(otherPlayers)) {

    if (!connectedIds.has(id)) {
      removeOtherPlayer(id);
    }
  }

  document.getElementById("playerCount").textContent =
    "Players: " + data.length;

  document.getElementById("health").textContent =
    "Health: " + myHealth;
});

socket.on("playerAirState", data => {
  if (data.id === myId) {
    if (data.state === "parachuting" && airDrop.state === "falling") {
      airDrop.openParachute();
    }
  } else if (otherPlayers[data.id]) {
    const remote = otherPlayers[data.id];
    if (remote.userData.parachute) {
      remote.userData.parachute.visible = (data.state === "parachuting");
    }
  }
});

socket.on("hit", data => {

  if (data.targetId === myId) {

    myHealth = data.health;

    document.getElementById("health").textContent =
      "Health: " + Math.round(myHealth);

    const shieldBar = document.getElementById("shieldBar");
    const shieldValue = document.getElementById("shieldValue");
    if (shieldBar && shieldValue) {
      if (data.shield > 0) {
        shieldBar.style.display = "block";
        shieldValue.textContent = Math.round(data.shield);
      } else {
        shieldBar.style.display = "none";
      }
    }
  }
});

socket.on("healthUpdate", data => {
  myHealth = data.health;
  document.getElementById("health").textContent =
    "Health: " + Math.round(myHealth);

  const shieldBar = document.getElementById("shieldBar");
  const shieldValue = document.getElementById("shieldValue");
  if (shieldBar && shieldValue) {
    if (data.shield > 0) {
      shieldBar.style.display = "block";
      shieldValue.textContent = Math.round(data.shield);
    } else {
      shieldBar.style.display = "none";
    }
  }
});

// ===============================
// SKILL HUD & SPECIAL ABILITIES
// ===============================

const skillButton = document.getElementById("skillButton");
const selectedCharNameEl = document.getElementById("selectedCharacterName");
const selectedSkillNameEl = document.getElementById("selectedSkillName");
const skillCooldownEl = document.getElementById("skillCooldown");

let activeSkillCooldownTimer = null;
let currentSkillType = "passive";

if (skillButton) {
  skillButton.addEventListener("click", () => {
    socket.emit("activateSkill");
  });
}

// Press Q to activate skill
window.addEventListener("keydown", event => {
  if (event.code === "KeyQ" && gameStarted && airDrop.state === "landed") {
    socket.emit("activateSkill");
  }
});

socket.on("characterSelected", data => {
  if (selectedCharNameEl) {
    selectedCharNameEl.textContent = data.character.toUpperCase();
  }
  if (selectedSkillNameEl) {
    selectedSkillNameEl.textContent = data.skillName + (data.skillType === "active" ? " (Active)" : " (Passive)");
  }
  currentSkillType = data.skillType;

  if (data.skillType === "passive") {
    if (skillButton) {
      skillButton.textContent = "PASSIVE SKILL";
      skillButton.disabled = true;
    }
    if (skillCooldownEl) {
      skillCooldownEl.textContent = "PASSIVE ACTIVE";
      skillCooldownEl.style.color = "#4ade80";
    }
  } else {
    if (skillButton) {
      skillButton.textContent = "USE SKILL (Q)";
      skillButton.disabled = false;
    }
    if (skillCooldownEl) {
      skillCooldownEl.textContent = "READY";
      skillCooldownEl.style.color = "#6cff8d";
    }
  }
});

socket.on("characterSelectionError", data => {
  alert(data.message || "Character selection error");
});

socket.on("skillResult", result => {
  if (skillCooldownEl) {
    if (result.success) {
      skillCooldownEl.textContent = "SKILL ACTIVATED!";
      skillCooldownEl.style.color = "#38bdf8";
      if (skillButton) skillButton.disabled = true;

      // Start client cooldown countdown
      let remainingSec = Math.round((result.cooldown || 45000) / 1000);
      if (activeSkillCooldownTimer) clearInterval(activeSkillCooldownTimer);
      activeSkillCooldownTimer = setInterval(() => {
        remainingSec--;
        if (remainingSec <= 0) {
          clearInterval(activeSkillCooldownTimer);
          if (skillCooldownEl) {
            skillCooldownEl.textContent = "READY";
            skillCooldownEl.style.color = "#6cff8d";
          }
          if (skillButton && currentSkillType === "active") {
            skillButton.disabled = false;
          }
        } else {
          if (skillCooldownEl) {
            skillCooldownEl.textContent = `COOLDOWN: ${remainingSec}s`;
            skillCooldownEl.style.color = "#f59e0b";
          }
        }
      }, 1000);
    } else {
      skillCooldownEl.textContent = result.message || "CANNOT USE";
      skillCooldownEl.style.color = "#ef4444";
      setTimeout(() => {
        if (skillCooldownEl && currentSkillType === "active") {
          skillCooldownEl.textContent = "READY";
          skillCooldownEl.style.color = "#6cff8d";
        }
      }, 2500);
    }
  }
});

// Broadcast visual skills effects
socket.on("playerSkillActivated", data => {
  const isMe = (data.playerId === myId);
  const targetGroup = isMe ? player : otherPlayers[data.playerId];
  if (!targetGroup) return;

  if (data.skill === "alok") {
    const aura = isMe ? localAlokAura : targetGroup.userData.alokAura;
    if (aura) aura.visible = true;
  } else if (data.skill === "chrono") {
    const shield = isMe ? localChronoShield : targetGroup.userData.chronoShield;
    if (shield) shield.visible = true;

    if (isMe) {
      const shieldBar = document.getElementById("shieldBar");
      const shieldValue = document.getElementById("shieldValue");
      if (shieldBar && shieldValue) {
        shieldBar.style.display = "block";
        shieldValue.textContent = data.shield || 600;
      }
    }
  } else if (data.skill === "wukong") {
    const bush = isMe ? localWukongBush : targetGroup.userData.wukongBush;
    if (bush) bush.visible = true;
    if (isMe && activeCharacter) {
      activeCharacter.model.visible = false;
    }
  }
});

socket.on("playerSkillExpired", data => {
  const isMe = (data.playerId === myId);
  const targetGroup = isMe ? player : otherPlayers[data.playerId];
  if (!targetGroup) return;

  if (data.skill === "alok") {
    const aura = isMe ? localAlokAura : targetGroup.userData.alokAura;
    if (aura) aura.visible = false;
  } else if (data.skill === "chrono") {
    const shield = isMe ? localChronoShield : targetGroup.userData.chronoShield;
    if (shield) shield.visible = false;
    if (isMe) {
      const shieldBar = document.getElementById("shieldBar");
      if (shieldBar) shieldBar.style.display = "none";
    }
  } else if (data.skill === "wukong") {
    const bush = isMe ? localWukongBush : targetGroup.userData.wukongBush;
    if (bush) bush.visible = false;
    if (isMe && activeCharacter) {
      activeCharacter.model.visible = true;
    }
  }
});

// Moco enemy reveal indicator
socket.on("enemyRevealed", data => {
  const remote = otherPlayers[data.id];
  if (remote && remote.userData.mocoMarker) {
    remote.userData.mocoMarker.visible = true;
    setTimeout(() => {
      if (remote.userData.mocoMarker) remote.userData.mocoMarker.visible = false;
    }, data.duration || 5000);
  }
});

// Jota elimination feedback
socket.on("eliminationConfirmed", data => {
  if (data.healed) {
    const msg = document.getElementById("gameMessage");
    if (msg) {
      msg.textContent = "+20 HP (Sustained Raids)";
      msg.style.display = "block";
      msg.style.color = "#4ade80";
      setTimeout(() => { msg.style.display = "none"; }, 2500);
    }
  }
});

socket.on("eliminated", () => {
  document.getElementById("message").textContent =
    "YOU WERE ELIMINATED!";
  myHealth = 0;

  const gameOverScreen = document.getElementById("gameOverScreen");
  if (gameOverScreen) {
    gameOverScreen.style.display = "flex";
  }
  if (document.exitPointerLock) {
    document.exitPointerLock();
  }
});

socket.on("respawn", data => {
  if (data.id === myId) {
    myHealth = 100;
    player.position.set(
      data.x,
      0,
      data.z
    );

    document.getElementById("message").textContent =
      "RESPAWNED!";

    const gameOverScreen = document.getElementById("gameOverScreen");
    if (gameOverScreen) {
      gameOverScreen.style.display = "none";
    }
  }
});

socket.on("weaponPickupConfirmed", data => {
  weaponInventory.confirmPickup(
    data.weaponId,
    data.type
  );
});

socket.on("weaponRemoved", data => {
  const weapon =
    weaponInventory.groundWeapons.get(data.weaponId);

  if (weapon) {
    scene.remove(weapon.model);
    weaponInventory.groundWeapons.delete(data.weaponId);
  }
});

socket.on("weaponReloadConfirmed", data => {
  const weapon = weaponInventory.inventory[data.slot];
  if (weapon) {
    const needed = weapon.data.magazine - weapon.ammo;
    const taken = Math.min(needed, weapon.reserveAmmo);
    weaponInventory.confirmReload(
      data.slot,
      weapon.ammo + taken,
      weapon.reserveAmmo - taken
    );
  }
});

socket.on("initialWeapons", weaponsList => {
  for (const item of weaponsList) {
    if (!weaponInventory.groundWeapons.has(item.id)) {
      weaponInventory.addGroundWeapon(
        item.id,
        item.type,
        new THREE.Vector3(item.x, item.y, item.z)
      );
    }
  }
});

// ===============================
// GAME LOOP
// ===============================

const clock = new THREE.Clock();
let networkTimer = 0;

function animate() {

  requestAnimationFrame(animate);

  const delta = Math.min(
    clock.getDelta(),
    0.05
  );

  // Update weapon inventory distance & prompt only after landed
  if (airDrop.state === "landed") {
    weaponInventory.update();
  }

  if (gameStarted && characterReady && myHealth > 0) {
    if (airDrop.state === "airplane") {
      // Player rides inside the cargo airplane
      player.position.set(currentPlanePos.x, currentPlanePos.y, currentPlanePos.z);
      player.rotation.y = currentPlanePos.rotation;

      if (activeCharacter) {
        activeCharacter.playAnimation("idle");
        activeCharacter.update(delta);
      }

      // Tactical camera behind the airplane
      const yaw = controller.getYaw();
      camera.position.set(
        player.position.x + Math.sin(yaw) * 16,
        player.position.y + 8,
        player.position.z + Math.cos(yaw) * 16
      );
      camera.lookAt(player.position.x, player.position.y + 1, player.position.z);

    } else if (airDrop.state === "falling" || airDrop.state === "parachuting") {
      const cameraYaw = controller.getYaw();
      airDrop.update(delta, cameraYaw);

      if (altitudeValueEl) {
        altitudeValueEl.textContent = Math.max(0, Math.round(player.position.y));
      }

      if (activeCharacter) {
        const anim = airDrop.state === "falling" ? "skydive" : "parachute";
        activeCharacter.playAnimation(anim);
        activeCharacter.update(delta);
      }
    } else {
      // Landed - normal ground controller is active!

      // Calculate character skills speed multiplier
      let speedMult = 1.0;
      if (selectedCharacterId === "kelly") speedMult *= 1.06;
      if (localAlokAura && localAlokAura.visible) speedMult *= 1.15;
      if (localChronoShield && localChronoShield.visible) speedMult *= 1.15;
      controller.setSpeedMultiplier(speedMult);

      const state = controller.update(delta);

      if (state) {
        if (activeCharacter) {
          let animation = "idle";

          if (state.jumping) {
            animation = "jump";
          } else if (state.crouching) {
            animation = "crouch";
          } else if (state.shooting) {
            animation = "shoot";
          } else if (state.running) {
            animation = "run";
          } else if (state.moving) {
            animation = "walk";
          }

          activeCharacter.playAnimation(animation);
          activeCharacter.update(delta);

          // Hayato Bushido red armor pulse when health < 50%
          if (selectedCharacterId === "hayato" && myHealth < 50) {
            const pulse = (Math.sin(Date.now() * 0.008) + 1) * 0.5;
            activeCharacter.model.traverse(child => {
              if (child.isMesh && child.material && child.material.emissive) {
                child.material.emissive.setRGB(pulse * 0.5, 0, 0);
              }
            });
          }
        }

        if (state.shooting) {
          shoot();
        }

        networkTimer += delta;

        if (networkTimer >= 0.05) {
          socket.emit("move", {
            x: player.position.x,
            y: player.position.y,
            z: player.position.z,
            rotation: player.rotation.y,
            moving: state.moving,
            running: state.running,
            jumping: state.jumping,
            crouching: state.crouching,
            aiming: state.aiming,
            characterId: selectedCharacterId
          });

          networkTimer = 0;
        }
      }
    }
  }

  // Animate skill visual effects
  if (localAlokAura && localAlokAura.visible) {
    localAlokAura.rotation.y += delta * 1.5;
  }
  if (localChronoShield && localChronoShield.visible) {
    const scalePulse = 1.0 + Math.sin(Date.now() * 0.006) * 0.04;
    localChronoShield.scale.setScalar(scalePulse);
  }
  if (localWukongBush && localWukongBush.visible) {
    localWukongBush.rotation.y += delta * 0.5;
  }

  for (const remote of Object.values(otherPlayers)) {
    if (remote.userData.alokAura && remote.userData.alokAura.visible) {
      remote.userData.alokAura.rotation.y += delta * 1.5;
    }
    if (remote.userData.chronoShield && remote.userData.chronoShield.visible) {
      const scalePulse = 1.0 + Math.sin(Date.now() * 0.006) * 0.04;
      remote.userData.chronoShield.scale.setScalar(scalePulse);
    }
    if (remote.userData.mocoMarker && remote.userData.mocoMarker.visible) {
      remote.userData.mocoMarker.rotation.y += delta * 3;
    }

    remote.position.lerp(
      remote.userData.targetPosition,
      Math.min(1, delta * 12)
    );

    let angle =
      remote.userData.targetRotation -
      remote.rotation.y;

    angle = Math.atan2(
      Math.sin(angle),
      Math.cos(angle)
    );

    remote.rotation.y +=
      angle * Math.min(1, delta * 12);
  }

  renderer.render(scene, camera);
}

animate();

// ===============================
// WINDOW RESIZE
// ===============================

window.addEventListener("resize", () => {

  camera.aspect =
    window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );
});
