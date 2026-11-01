import * as THREE from "three";

export class SafeZoneMesh {
  constructor(scene) {
    this.scene = scene;
    this.currentRadius = 360;
    this.currentX = 0;
    this.currentZ = 0;
    this.animTime = 0;

    // Outer Blue Storm Cylinder Dome
    const geom = new THREE.CylinderGeometry(this.currentRadius, this.currentRadius, 80, 48, 1, true);
    this.material = new THREE.MeshStandardMaterial({
      color: 0x0984e3,
      emissive: 0x00cec9,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geom, this.material);
    this.mesh.position.set(0, 40, 0);
    this.scene.add(this.mesh);

    // Target Next Safe Circle White Line Ring
    const ringGeom = new THREE.RingGeometry(358, 360, 64);
    ringGeom.rotateX(-Math.PI / 2);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    this.targetRing = new THREE.Mesh(ringGeom, this.ringMat);
    this.targetRing.position.set(0, 0.4, 0);
    this.scene.add(this.targetRing);
  }

  update(delta, zoneData) {
    if (!zoneData) return;

    this.animTime += delta;

    // Lerp radius and position smoothly towards server state
    this.currentRadius = THREE.MathUtils.lerp(this.currentRadius, zoneData.radius, 0.15);
    this.currentX = THREE.MathUtils.lerp(this.currentX, zoneData.x, 0.15);
    this.currentZ = THREE.MathUtils.lerp(this.currentZ, zoneData.z, 0.15);

    // Scale cylinder to match radius
    const scale = this.currentRadius / 360;
    this.mesh.scale.set(scale, 1, scale);
    this.mesh.position.set(this.currentX, 40, this.currentZ);

    // Target Circle Ring position & scale
    const targetScale = (zoneData.targetRadius || zoneData.radius) / 360;
    this.targetRing.scale.set(targetScale, 1, targetScale);
    this.targetRing.position.set(zoneData.targetX || zoneData.x, 0.5, zoneData.targetZ || zoneData.z);

    // Pulsing energy shader simulation
    this.material.opacity = 0.28 + Math.sin(this.animTime * 4.0) * 0.08;
    this.material.emissiveIntensity = 0.4 + Math.sin(this.animTime * 3.0) * 0.15;
  }

  isInside(x, z) {
    const dist = Math.hypot(x - this.currentX, z - this.currentZ);
    return dist <= this.currentRadius;
  }

  getDistToEdge(x, z) {
    const dist = Math.hypot(x - this.currentX, z - this.currentZ);
    return this.currentRadius - dist;
  }
}

