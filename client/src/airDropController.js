import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();

export class AirDropController {
  constructor(scene, player, camera, socket) {
    this.scene = scene;
    this.player = player;
    this.camera = camera;
    this.socket = socket;

    this.state = "airplane"; // "airplane" | "falling" | "parachuting" | "landed"

    this.verticalSpeed = 0;
    this.horizontalSpeed = 0;

    this.fallGravity = 9.8;
    this.freefallSpeed = 24;
    this.parachuteSpeed = 6;

    this.steerSpeed = 14;
    this.parachuteSteerSpeed = 7;

    this.parachute = null;
    this.parachuteLoaded = false;

    this.keys = {};
    this.joystick = { x: 0, y: 0 };

    this.cameraOffset = new THREE.Vector3(0, 5, 10);
    this.cameraTarget = new THREE.Vector3();

    this.direction = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();

    this.yaw = 0;
    this.lastSendTime = 0;

    this.autoOpenAltitude = 35;
    this.minimumOpenAltitude = 15;

    // Wind particles for falling effect
    this.windParticles = null;
    this.createWindParticles();

    // Callbacks
    this.onStateChange = null;

    window.addEventListener("keydown", event => {
      this.keys[event.code] = true;

      if (
        (event.code === "Space" || event.code === "KeyF") &&
        this.state === "airplane"
      ) {
        event.preventDefault();
        this.jumpFromPlane();
      } else if (
        event.code === "Space" &&
        this.state === "falling"
      ) {
        event.preventDefault();
        this.openParachute();
      }
    });

    window.addEventListener("keyup", event => {
      this.keys[event.code] = false;
    });

    // Preload parachute model
    this.loadParachute().catch(console.warn);
  }

  createWindParticles() {
    const count = 70;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = Math.random() * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.7
    });

    this.windParticles = new THREE.Points(geometry, material);
    this.windParticles.visible = false;
    this.scene.add(this.windParticles);
  }

  createProceduralParachute() {
    const group = new THREE.Group();
    group.name = "ProceduralParachute";

    // Curved Canopy
    const canopyGeo = new THREE.SphereGeometry(3.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2.2);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0xff5500,
      roughness: 0.35,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.scale.set(1.4, 0.7, 1.0);
    canopy.position.y = 3.6;
    group.add(canopy);

    // Decorative inner camo stripe
    const stripeGeo = new THREE.SphereGeometry(3.22, 16, 12, 0, Math.PI, 0, Math.PI / 2.3);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.6,
      side: THREE.DoubleSide
    });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.scale.set(1.4, 0.7, 1.0);
    stripe.position.y = 3.6;
    group.add(stripe);

    // Suspension cords
    const cordMat = new THREE.MeshBasicMaterial({ color: 0xe5e7eb });
    const cordCount = 14;
    for (let i = 0; i < cordCount; i++) {
      const angle = (i / cordCount) * Math.PI * 2;
      const rimX = Math.cos(angle) * (3.2 * 1.4);
      const rimZ = Math.sin(angle) * (3.2 * 1.0);
      const rimY = 3.6 + Math.cos(Math.PI / 2.2) * 3.2 * 0.7;

      const harnessX = rimX > 0 ? 0.35 : -0.35;
      const harnessY = 0;
      const harnessZ = 0;

      const dx = rimX - harnessX;
      const dy = rimY - harnessY;
      const dz = rimZ - harnessZ;
      const length = Math.hypot(dx, dy, dz);

      const cableGeo = new THREE.CylinderGeometry(0.012, 0.012, length, 3);
      const cable = new THREE.Mesh(cableGeo, cordMat);
      cable.position.set((rimX + harnessX) / 2, (rimY + harnessY) / 2, (rimZ + harnessZ) / 2);
      cable.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(dx, dy, dz).normalize()
      );
      group.add(cable);
    }

    return group;
  }

  async loadParachute() {
    if (this.parachuteLoaded) return;

    try {
      const gltf = await loader.loadAsync("/models/parachute.glb");
      this.parachute = gltf.scene;
    } catch (err) {
      console.warn("Using procedural parachute model fallback:", err);
      this.parachute = this.createProceduralParachute();
    }

    this.parachute.scale.setScalar(1.5);
    this.parachute.visible = false;
    this.scene.add(this.parachute);
    this.parachuteLoaded = true;
  }

  setJoystick(x, y) {
    this.joystick.x = THREE.MathUtils.clamp(x, -1, 1);
    this.joystick.y = THREE.MathUtils.clamp(y, -1, 1);
  }

  jumpFromPlane() {
    if (this.state !== "airplane") return;

    this.state = "falling";
    this.verticalSpeed = -this.freefallSpeed;

    if (this.windParticles) {
      this.windParticles.visible = true;
    }

    if (this.onStateChange) {
      this.onStateChange("falling");
    }

    this.socket.emit("jumpFromPlane");
  }

  async openParachute() {
    if (this.state !== "falling") return;

    if (this.player.position.y > this.minimumOpenAltitude) {
      await this.loadParachute();

      this.state = "parachuting";
      this.verticalSpeed = -this.parachuteSpeed;

      if (this.parachute) {
        this.parachute.visible = true;
      }

      if (this.windParticles) {
        this.windParticles.visible = false;
      }

      if (this.onStateChange) {
        this.onStateChange("parachuting");
      }

      this.socket.emit("openParachute");
    }
  }

  update(delta, cameraYaw = 0) {
    if (
      this.state !== "falling" &&
      this.state !== "parachuting"
    ) {
      return;
    }

    const left = (this.keys.KeyA ? 1 : 0) - this.joystick.x;
    const rightInput = (this.keys.KeyD ? 1 : 0) + this.joystick.x;

    const forwardInput = (this.keys.KeyW ? 1 : 0) - this.joystick.y;
    const backwardInput = (this.keys.KeyS ? 1 : 0) + this.joystick.y;

    const xInput = rightInput - left;
    const zInput = forwardInput - backwardInput;

    this.forward.set(
      -Math.sin(cameraYaw),
      0,
      -Math.cos(cameraYaw)
    );

    this.right.set(
      Math.cos(cameraYaw),
      0,
      -Math.sin(cameraYaw)
    );

    this.direction.set(0, 0, 0);
    this.direction.addScaledVector(this.forward, zInput);
    this.direction.addScaledVector(this.right, xInput);

    if (this.direction.lengthSq() > 1) {
      this.direction.normalize();
    }

    const speed =
      this.state === "parachuting"
        ? this.parachuteSteerSpeed
        : this.steerSpeed;

    this.player.position.addScaledVector(
      this.direction,
      speed * delta
    );

    // Dynamic Character Body Tilting
    if (this.state === "falling") {
      this.verticalSpeed = Math.max(
        -this.freefallSpeed,
        this.verticalSpeed - this.fallGravity * delta
      );

      // Skydive tilt: face fall direction, tilt forward
      this.player.rotation.y = cameraYaw;
      this.player.rotation.x = THREE.MathUtils.lerp(
        this.player.rotation.x,
        zInput > 0 ? 0.7 : 0.45,
        delta * 6
      );
      this.player.rotation.z = THREE.MathUtils.lerp(
        this.player.rotation.z,
        -xInput * 0.4,
        delta * 6
      );

      // Animate wind streaks around player
      if (this.windParticles && this.windParticles.visible) {
        this.windParticles.position.set(
          this.player.position.x,
          this.player.position.y - 2,
          this.player.position.z
        );
      }
    } else {
      this.verticalSpeed = -this.parachuteSpeed;

      // Parachute tilt: upright with gentle bank
      this.player.rotation.x = THREE.MathUtils.lerp(this.player.rotation.x, 0, delta * 6);
      this.player.rotation.z = THREE.MathUtils.lerp(this.player.rotation.z, -xInput * 0.2, delta * 6);
      this.player.rotation.y = cameraYaw;

      if (this.parachute) {
        this.parachute.position.set(
          this.player.position.x,
          this.player.position.y + 3.8,
          this.player.position.z
        );
        this.parachute.rotation.y = cameraYaw;
        this.parachute.rotation.z = THREE.MathUtils.lerp(
          this.parachute.rotation.z,
          -xInput * 0.15,
          delta * 5
        );
      }
    }

    this.player.position.y += this.verticalSpeed * delta;

    // Automatically deploy at low altitude
    if (
      this.state === "falling" &&
      this.player.position.y <= this.autoOpenAltitude
    ) {
      this.openParachute();
    }

    // Landing detection
    if (this.player.position.y <= 0) {
      this.player.position.y = 0;
      this.player.rotation.x = 0;
      this.player.rotation.z = 0;
      this.state = "landed";

      if (this.parachute) {
        this.parachute.visible = false;
      }

      if (this.windParticles) {
        this.windParticles.visible = false;
      }

      if (this.onStateChange) {
        this.onStateChange("landed");
      }

      this.socket.emit("playerLanded", {
        x: this.player.position.x,
        z: this.player.position.z
      });
    }

    // Camera behind player
    const camDist = this.state === "parachuting" ? 11 : 8;
    const camHeight = this.state === "parachuting" ? 3.5 : 4.5;

    this.cameraOffset.set(
      Math.sin(cameraYaw) * camDist,
      camHeight,
      Math.cos(cameraYaw) * camDist
    );

    const desiredCamera = this.player.position.clone().add(this.cameraOffset);
    this.camera.position.lerp(desiredCamera, Math.min(1, delta * 7));

    this.cameraTarget.set(
      this.player.position.x,
      this.player.position.y + 1.2,
      this.player.position.z
    );

    this.camera.lookAt(this.cameraTarget);

    // Send state updates at 10 updates per second
    this.lastSendTime += delta;
    if (this.lastSendTime >= 0.1) {
      this.socket.emit("airMovement", {
        x: this.player.position.x,
        y: this.player.position.y,
        z: this.player.position.z,
        state: this.state,
        rotation: cameraYaw
      });

      this.lastSendTime = 0;
    }
  }

  dispose() {
    if (this.parachute && this.parachute.parent) {
      this.scene.remove(this.parachute);
    }
    if (this.windParticles && this.windParticles.parent) {
      this.scene.remove(this.windParticles);
    }
  }
}

