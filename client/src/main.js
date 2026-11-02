import * as THREE from "three";
import { io } from "socket.io-client";
import "./style.css";

// ===============================
// MULTIPLAYER CONNECTION
// ===============================

const socket = io(
  window.location.port === "5173"
    ? "http://localhost:3001"
    : (window.location.origin.startsWith("http") ? window.location.origin : "http://localhost:3001")
);

let myId = null;
let myHealth = 100;
let gameStarted = false;

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
// PLAYER ROOT
// ===============================

const player = new THREE.Group();

const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.6, 1.2, 4, 8),
  new THREE.MeshStandardMaterial({
    color: 0x2255ff
  })
);

body.position.y = 1.2;
body.castShadow = true;

player.add(body);
scene.add(player);

// Camera position
camera.position.set(0, 5, 8);

// ===============================
// OTHER PLAYERS
// ===============================

const otherPlayers = {};

function createOtherPlayer(id) {

  const group = new THREE.Group();

  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.6, 1.2, 4, 8),
    new THREE.MeshStandardMaterial({
      color: 0xff3333
    })
  );

  mesh.position.y = 1.2;

  group.add(mesh);
  scene.add(group);

  otherPlayers[id] = group;
}

function removeOtherPlayer(id) {

  if (!otherPlayers[id]) return;

  scene.remove(otherPlayers[id]);
  delete otherPlayers[id];
}

// ===============================
// KEYBOARD CONTROLS
// ===============================

const keys = {};

window.addEventListener("keydown", event => {
  keys[event.key.toLowerCase()] = true;
});

window.addEventListener("keyup", event => {
  keys[event.key.toLowerCase()] = false;
});

// ===============================
// CAMERA ROTATION
// ===============================

let cameraYaw = 0;
let cameraPitch = 0.3;

document.addEventListener("mousemove", event => {

  if (!gameStarted ||
      document.pointerLockElement !== renderer.domElement) {
    return;
  }

  cameraYaw -= event.movementX * 0.002;

  cameraPitch -= event.movementY * 0.002;

  cameraPitch = THREE.MathUtils.clamp(
    cameraPitch,
    -0.3,
    1
  );
});

// ===============================
// START GAME
// ===============================

document.getElementById("startButton")
  .addEventListener("click", () => {

    gameStarted = true;

    document.getElementById("startButton").style.display =
      "none";

    renderer.domElement.requestPointerLock();

    socket.emit("joinGame");
  });

// ===============================
// PLAYER MOVEMENT
// ===============================

const clock = new THREE.Clock();

let moveTimer = 0;

function updateMovement(delta) {

  if (!gameStarted) return;

  const speed = 9 * delta;

  const forward = new THREE.Vector3(
    -Math.sin(cameraYaw),
    0,
    -Math.cos(cameraYaw)
  );

  const right = new THREE.Vector3(
    Math.cos(cameraYaw),
    0,
    -Math.sin(cameraYaw)
  );

  if (keys.w) {
    player.position.addScaledVector(forward, speed);
  }

  if (keys.s) {
    player.position.addScaledVector(forward, -speed);
  }

  if (keys.a) {
    player.position.addScaledVector(right, -speed);
  }

  if (keys.d) {
    player.position.addScaledVector(right, speed);
  }

  player.position.x = THREE.MathUtils.clamp(
    player.position.x, -145, 145
  );

  player.position.z = THREE.MathUtils.clamp(
    player.position.z, -145, 145
  );

  moveTimer += delta;

  if (moveTimer > 0.05) {

    socket.emit("move", {
      x: player.position.x,
      z: player.position.z,
      rotation: player.rotation.y
    });

    moveTimer = 0;
  }
}

// ===============================
// CAMERA FOLLOW
// ===============================

function updateCamera() {

  const distance = 8;

  const offset = new THREE.Vector3(
    Math.sin(cameraYaw) * distance,
    4 + cameraPitch * 2,
    Math.cos(cameraYaw) * distance
  );

  camera.position.copy(
    player.position.clone().add(offset)
  );

  camera.lookAt(
    player.position.x,
    player.position.y + 1.5,
    player.position.z
  );
}

// ===============================
// SHOOTING
// ===============================

function shoot() {

  if (!gameStarted || myHealth <= 0) return;

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

renderer.domElement.addEventListener("click", () => {

  if (gameStarted &&
      document.pointerLockElement === renderer.domElement) {
    shoot();
  }
});

document.getElementById("shootButton")
  .addEventListener("click", shoot);

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

      player.position.set(
        item.x,
        0,
        item.z
      );

      continue;
    }

    if (!otherPlayers[item.id]) {
      createOtherPlayer(item.id);
    }

    otherPlayers[item.id].position.set(
      item.x,
      0,
      item.z
    );

    otherPlayers[item.id].rotation.y =
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

function animate() {

  requestAnimationFrame(animate);

  const delta = Math.min(
    clock.getDelta(),
    0.05
  );

  updateMovement(delta);

  if (gameStarted) {
    updateCamera();
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
