import * as THREE from "three";
import { createWeaponMesh } from "./weapons.js";

export class LootManager {
  constructor(scene, islandMap) {
    this.scene = scene;
    this.map = islandMap;
    this.lootMeshes = new Map();
    this.animTime = 0;
  }

  createLootMesh(item) {
    const group = new THREE.Group();

    let color = 0xffffff;
    if (item.type === "weapon") {
      color = item.id === "awm" ? 0xf39c12 : item.id === "ak47" ? 0x9b59b6 : 0x3498db;
    } else if (item.type === "armor" || item.type === "helmet") {
      color = item.id.includes("lv3") ? 0xf1c40f : item.id.includes("lv2") ? 0x9b59b6 : 0x3498db;
    } else if (item.type === "medkit") {
      color = 0x2ecc71;
    } else if (item.type === "death_crate") {
      color = 0xe74c3c;
    }

    // 1. Core Model
    if (item.type === "weapon") {
      const gun = createWeaponMesh(item.id);
      gun.scale.set(0.9, 0.9, 0.9);
      group.add(gun);
    } else if (item.type === "armor" || item.type === "helmet") {
      const vestGeom = new THREE.BoxGeometry(0.5, 0.6, 0.35);
      const vestMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.4 });
      const vest = new THREE.Mesh(vestGeom, vestMat);
      group.add(vest);
    } else if (item.type === "medkit") {
      const kitGeom = new THREE.BoxGeometry(0.5, 0.35, 0.25);
      const kitMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
      const kit = new THREE.Mesh(kitGeom, kitMat);
      // Red Cross on kit
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.02), new THREE.MeshBasicMaterial({ color: 0xe74c3c }));
      crossH.position.z = 0.13;
      kit.add(crossH);
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.02), new THREE.MeshBasicMaterial({ color: 0xe74c3c }));
      crossV.position.z = 0.13;
      kit.add(crossV);
      group.add(kit);
    } else if (item.type === "death_crate") {
      const crateGeom = new THREE.BoxGeometry(0.8, 0.6, 0.8);
      const crateMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.7 });
      const crate = new THREE.Mesh(crateGeom, crateMat);
      // Golden skull icon or band
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.15, 0.82), new THREE.MeshBasicMaterial({ color: 0xf1c40f }));
      crate.add(band);
      group.add(crate);
    } else {
      // Ammo Box
      const ammoGeom = new THREE.BoxGeometry(0.35, 0.25, 0.22);
      const ammoMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.4, metalness: 0.3 });
      const ammoBox = new THREE.Mesh(ammoGeom, ammoMat);
      group.add(ammoBox);
    }

    // 2. Vertical Light Beacon Beam
    const beamGeom = new THREE.CylinderGeometry(0.06, 0.25, 12, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeom, beamMat);
    beam.position.y = 6;
    group.add(beam);

    // 3. Ground Glow Ring
    const ringGeom = new THREE.RingGeometry(0.4, 0.7, 16);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.y = -0.3;
    group.add(ring);

    const groundY = this.map.getHeight(item.x, item.z);
    group.position.set(item.x, groundY + 0.6, item.z);
    group.userData = { ...item, baseGroundY: groundY + 0.6 };

    this.scene.add(group);
    return group;
  }

  syncLoot(lootList) {
    if (!lootList) return;
    const currentIds = new Set();
    for (const item of lootList) {
      currentIds.add(item.id);
      if (!this.lootMeshes.has(item.id)) {
        const mesh = this.createLootMesh(item);
        this.lootMeshes.set(item.id, mesh);
      }
    }

    // Remove despawned loot
    for (const [id, mesh] of this.lootMeshes.entries()) {
      if (!currentIds.has(id)) {
        this.scene.remove(mesh);
        this.lootMeshes.delete(id);
      }
    }
  }

  removeLoot(lootId) {
    const mesh = this.lootMeshes.get(lootId);
    if (mesh) {
      this.scene.remove(mesh);
      this.lootMeshes.delete(lootId);
    }
  }

  update(delta) {
    this.animTime += delta;
    for (const mesh of this.lootMeshes.values()) {
      mesh.rotation.y += delta * 1.8;
      mesh.position.y = mesh.userData.baseGroundY + Math.sin(this.animTime * 3.0) * 0.15;
    }
  }

  getNearestLoot(x, z, maxDist = 2.8) {
    let nearest = null;
    let minDist = maxDist;
    for (const mesh of this.lootMeshes.values()) {
      const d = Math.hypot(mesh.position.x - x, mesh.position.z - z);
      if (d < minDist) {
        minDist = d;
        nearest = mesh.userData;
      }
    }
    return nearest;
  }
}

