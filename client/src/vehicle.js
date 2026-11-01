import * as THREE from "three";

export class VehicleManager {
  constructor(scene, islandMap) {
    this.scene = scene;
    this.map = islandMap;
    this.vehicles = new Map();
    this.activeVehicle = null; // Currently driven by local player
  }

  createVehicleMesh(id) {
    const group = new THREE.Group();

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x475333, // Military olive green
      roughness: 0.6,
      metalness: 0.3
    });

    const rollCageMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.5,
      metalness: 0.7
    });

    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.95
    });

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.8,
      roughness: 0.3
    });

    // 1. Chassis Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 3.8), frameMat);
    body.position.y = 0.7;
    body.castShadow = true;
    group.add(body);

    // Front Hood Slope
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 1.4), frameMat);
    hood.position.set(0, 0.85, 1.2);
    hood.rotation.x = 0.15;
    hood.castShadow = true;
    group.add(hood);

    // 2. Tubular Roll Cage
    const cageBars = [
      // Left Front to Back
      { x: -0.9, y: 1.6, z: 0, sx: 0.08, sy: 1.2, sz: 2.4 },
      // Right Front to Back
      { x: 0.9, y: 1.6, z: 0, sx: 0.08, sy: 1.2, sz: 2.4 },
      // Top Crossbar
      { x: 0, y: 2.2, z: -0.2, sx: 1.88, sy: 0.08, sz: 0.08 }
    ];
    cageBars.forEach(b => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(b.sx, b.sy, b.sz), rollCageMat);
      bar.position.set(b.x, b.y, b.z);
      bar.castShadow = true;
      group.add(bar);
    });

    // 3. Seats & Steering Wheel
    const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.7, 0.6), rollCageMat);
    driverSeat.position.set(0, 1.0, -0.2);
    group.add(driverSeat);

    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 8, 16), rollCageMat);
    wheel.position.set(0, 1.25, 0.45);
    wheel.rotation.x = -0.5;
    group.add(wheel);

    // 4. Dual Headlights
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });
    [-0.65, 0.65].forEach(lx => {
      const headlightMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 12), lightMat);
      headlightMesh.rotation.x = Math.PI / 2;
      headlightMesh.position.set(lx, 0.85, 1.9);
      group.add(headlightMesh);
    });

    const headlight = new THREE.SpotLight(0xfffa65, 3.5, 35, Math.PI / 6, 0.4);
    headlight.position.set(0, 1.0, 1.8);
    headlight.target.position.set(0, 0, 15);
    group.add(headlight);
    group.add(headlight.target);

    // 5. 4 Wheels (with independent rotation)
    const wheels = [];
    const wheelPositions = [
      { name: "fl", x: -1.15, z: 1.2 },
      { name: "fr", x: 1.15, z: 1.2 },
      { name: "rl", x: -1.15, z: -1.2 },
      { name: "rr", x: 1.15, z: -1.2 }
    ];

    wheelPositions.forEach(wp => {
      const wheelHub = new THREE.Group();
      wheelHub.position.set(wp.x, 0.45, wp.z);

      const tireGeom = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 16);
      tireGeom.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeom, wheelMat);
      tire.castShadow = true;
      wheelHub.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.37, 12), rimMat);
      rim.rotateZ(Math.PI / 2);
      wheelHub.add(rim);

      group.add(wheelHub);
      wheels.push({ hub: wheelHub, tire, isFront: wp.z > 0 });
    });

    group.userData = {
      id,
      wheels,
      speed: 0,
      steeringAngle: 0,
      driverSeatPos: new THREE.Vector3(0, 0.6, -0.2)
    };

    this.scene.add(group);
    return group;
  }

  syncVehicles(vehicleList) {
    if (!vehicleList) return;
    for (const data of vehicleList) {
      let v = this.vehicles.get(data.id);
      if (!v) {
        v = this.createVehicleMesh(data.id);
        this.vehicles.set(data.id, v);
      }

      // If local player is currently driving, we drive authoritatively on client
      if (this.activeVehicle && this.activeVehicle.userData.id === data.id) {
        continue;
      }

      // Remote vehicle lerp
      v.position.x = THREE.MathUtils.lerp(v.position.x, data.x, 0.3);
      v.position.z = THREE.MathUtils.lerp(v.position.z, data.z, 0.3);
      const groundY = this.map.getHeight(v.position.x, v.position.z);
      v.position.y = THREE.MathUtils.lerp(v.position.y, groundY, 0.3);

      v.rotation.y = THREE.MathUtils.lerp(v.rotation.y, data.rot, 0.3);
      v.userData.speed = data.speed || 0;

      // Animate wheels
      v.userData.wheels.forEach(w => {
        w.tire.rotation.x += (v.userData.speed * 0.05);
      });
    }
  }

  // Update physics for locally driven vehicle
  updateLocalDriving(delta, inputForward, inputSteer, onSend) {
    if (!this.activeVehicle) return;

    const v = this.activeVehicle;
    const maxSpeed = 32;
    const accel = 18;
    const reverseSpeed = -10;
    const turnRate = 2.2;

    // Acceleration & Braking
    if (inputForward > 0) {
      v.userData.speed = Math.min(maxSpeed, v.userData.speed + accel * delta);
    } else if (inputForward < 0) {
      v.userData.speed = Math.max(reverseSpeed, v.userData.speed - accel * 1.3 * delta);
    } else {
      // Natural friction
      v.userData.speed = THREE.MathUtils.lerp(v.userData.speed, 0, 1.8 * delta);
    }

    // Steering
    const targetSteer = -inputSteer * 0.55;
    v.userData.steeringAngle = THREE.MathUtils.lerp(v.userData.steeringAngle, targetSteer, 8 * delta);

    // Apply rotation only when moving
    if (Math.abs(v.userData.speed) > 0.5) {
      const dirMult = v.userData.speed >= 0 ? 1 : -1;
      v.rotation.y += inputSteer * turnRate * (Math.abs(v.userData.speed) / maxSpeed) * dirMult * delta;
    }

    // Velocity vector along vehicle forward heading
    const moveDist = v.userData.speed * delta;
    const nx = v.position.x + Math.sin(v.rotation.y) * moveDist;
    const nz = v.position.z + Math.cos(v.rotation.y) * moveDist;

    // Map collision check
    if (!this.map.checkCollision(nx, nz, 1.5)) {
      v.position.x = nx;
      v.position.z = nz;
    } else {
      v.userData.speed *= -0.3; // bounce off obstacle
    }

    // Terrain height tracking
    const groundY = this.map.getHeight(v.position.x, v.position.z);
    v.position.y = THREE.MathUtils.lerp(v.position.y, groundY, 0.25);

    // Suspension tilt & roll
    const frontY = this.map.getHeight(v.position.x + Math.sin(v.rotation.y) * 2, v.position.z + Math.cos(v.rotation.y) * 2);
    const pitchAngle = Math.atan2(frontY - groundY, 2.0);
    v.rotation.x = THREE.MathUtils.lerp(v.rotation.x, pitchAngle, 0.2);

    // Animate wheels
    v.userData.wheels.forEach(w => {
      w.tire.rotation.x += moveDist * 2.2;
      if (w.isFront) {
        w.hub.rotation.y = v.userData.steeringAngle;
      }
    });

    if (onSend) {
      onSend({
        x: v.position.x,
        y: v.position.y,
        z: v.position.z,
        rot: v.rotation.y,
        speed: v.userData.speed
      });
    }
  }

  getNearestVehicle(x, z, maxDist = 3.8) {
    let nearest = null;
    let minDist = maxDist;
    for (const v of this.vehicles.values()) {
      const d = Math.hypot(v.position.x - x, v.position.z - z);
      if (d < minDist) {
        minDist = d;
        nearest = v;
      }
    }
    return nearest;
  }
}

