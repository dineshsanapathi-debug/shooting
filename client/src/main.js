import * as THREE from "three";
import { io } from "socket.io-client";
import { getCharacters, loadCharacter } from "./characterManager.js";
import { createThirdPersonController } from "./thirdPersonController.js";
import "./style.css";

// ===============================
// MULTIPLAYER CONNECTION
// ===============================

const SERVER_URL = import.meta.env.DEV
  ? "http://localhost:3001"
  : window.location.origin;

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

// Camera position
camera.position.set(0, 5, 8);

// Third-Person Controller
const controller = createThirdPersonController(
  player,
  camera,
  renderer
);

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
  button.textContent = character.name;

  button.addEventListener("click", () => {
    selectedCharacterId = character.id;

    document.querySelectorAll(".character-card")
      .forEach(card => card.classList.remove("selected"));

    button.classList.add("selected");
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

document.getElementById("startButton")
  .addEventListener("click", () => {

    gameStarted = true;

    document.getElementById("startButton").style.display =
      "none";

    document.body.requestPointerLock();

    socket.emit("joinGame", { characterId: selectedCharacterId });
  });

// ===============================
// SHOOTING
// ===============================

let lastShootTime = 0;

function shoot() {

  if (!gameStarted || myHealth <= 0) return;

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
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function resetJoystickTouch() {
    activeTouch = null;
    controller.setJoystick(0, 0);
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

socket.on("hit", data => {

  if (data.targetId === myId) {

    myHealth = data.health;

    document.getElementById("health").textContent =
      "Health: " + myHealth;
  }
});

socket.on("eliminated", () => {

  document.getElementById("message").textContent =
    "YOU WERE ELIMINATED!";

  myHealth = 0;
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

  if (gameStarted && characterReady && myHealth > 0) {
    const state = controller.update(delta);

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

  for (const remote of Object.values(otherPlayers)) {
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
