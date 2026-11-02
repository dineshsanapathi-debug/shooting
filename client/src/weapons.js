// ====================================================================
// FREE FIRE BHARAT 3D - WEAPONS ARSENAL & BALLISTICS
// AK-47, M1014 Shotgun, AWM Sniper (ADS Scope), Desert Eagle, Fists
// ====================================================================

import * as THREE from 'three';
import { sounds } from './audio.js';

export const WEAPON_DEFS = {
  ak47: {
    id: 'ak47',
    name: 'AK-47',
    type: 'rifle',
    damage: 36,
    fireRate: 0.12, // 500 RPM
    magSize: 30,
    maxAmmo: 90,
    reloadTime: 2.2,
    spread: 0.025,
    range: 350,
    pellets: 1,
    zoomFov: 55
  },
  shotgun: {
    id: 'shotgun',
    name: 'M1014',
    type: 'shotgun',
    damage: 18, // per pellet
    pellets: 8,
    fireRate: 0.75,
    magSize: 6,
    maxAmmo: 24,
    reloadTime: 2.8,
    spread: 0.08,
    range: 70,
    zoomFov: 60
  },
  sniper: {
    id: 'sniper',
    name: 'AWM',
    type: 'sniper',
    damage: 150,
    pellets: 1,
    fireRate: 1.4,
    magSize: 5,
    maxAmmo: 15,
    reloadTime: 3.2,
    spread: 0.002,
    range: 600,
    zoomFov: 20 // High magnification ADS telescopic zoom
  },
  pistol: {
    id: 'pistol',
    name: 'Desert Eagle',
    type: 'pistol',
    damage: 54,
    pellets: 1,
    fireRate: 0.35,
    magSize: 7,
    maxAmmo: 28,
    reloadTime: 1.8,
    spread: 0.035,
    range: 160,
    zoomFov: 60
  },
  fists: {
    id: 'fists',
    name: 'Combat Fists',
    type: 'melee',
    damage: 25,
    pellets: 1,
    fireRate: 0.45,
    magSize: Infinity,
    maxAmmo: Infinity,
    reloadTime: 0,
    spread: 0,
    range: 3.2,
    zoomFov: 70
  }
};

export class WeaponManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.currentId = 'ak47';
    this.lastFireTime = 0;
    this.isReloading = false;
    this.isADS = false;

    this.ammo = {
      ak47: { mag: 30, reserve: 90 },
      shotgun: { mag: 6, reserve: 24 },
      sniper: { mag: 5, reserve: 15 },
      pistol: { mag: 7, reserve: 28 },
      fists: { mag: 999, reserve: 999 }
    };

    // 3D Visual Mesh for Equipped Weapon
    this.weaponGroup = new THREE.Group();
    this.weaponGroup.name = 'EquippedWeaponMesh';
    this.createWeaponMeshes();
    this.scene.add(this.weaponGroup);

    // Bullet Tracers Pool
    this.tracers = [];
    this.tracerMat = new THREE.LineBasicMaterial({ color: 0xffbe0b, linewidth: 2 });

    // Muzzle Flash Light
    this.muzzleLight = new THREE.PointLight(0xffbe0b, 0, 15);
    this.scene.add(this.muzzleLight);
  }

  createWeaponMeshes() {
    this.meshes = {};

    // 1. AK-47 3D Model
    const akGroup = new THREE.Group();
    const akBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.8), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    const akStock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.28), new THREE.MeshStandardMaterial({ color: 0x8b4513 }));
    akStock.position.set(0, -0.02, -0.42);
    const akMag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.12), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    akMag.position.set(0, -0.14, 0.05);
    akMag.rotation.x = 0.25;
    akGroup.add(akBody, akStock, akMag);
    this.meshes.ak47 = akGroup;

    // 2. Shotgun M1014 3D Model
    const sgGroup = new THREE.Group();
    const sgBody = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.9), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    const sgPump = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.22), new THREE.MeshStandardMaterial({ color: 0x3a3a3a }));
    sgPump.position.set(0, -0.04, 0.2);
    sgGroup.add(sgBody, sgPump);
    this.meshes.shotgun = sgGroup;

    // 3. AWM Sniper 3D Model (with Scope)
    const awmGroup = new THREE.Group();
    const awmBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 1.1), new THREE.MeshStandardMaterial({ color: 0x2e4057 }));
    const awmScope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 12), new THREE.MeshStandardMaterial({ color: 0x050505 }));
    awmScope.rotateX(Math.PI / 2);
    awmScope.position.set(0, 0.1, 0.05);
    awmGroup.add(awmBody, awmScope);
    this.meshes.sniper = awmGroup;

    // 4. Pistol Desert Eagle 3D Model
    const deGroup = new THREE.Group();
    const deSlide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.35), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 }));
    const deGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.08), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    deGrip.position.set(0, -0.1, -0.08);
    deGroup.add(deSlide, deGrip);
    this.meshes.pistol = deGroup;

    // 5. Fists (empty)
    this.meshes.fists = new THREE.Group();

    Object.values(this.meshes).forEach((m) => {
      m.visible = false;
      this.weaponGroup.add(m);
    });
    this.switchWeapon(this.currentId);
  }

  getCurrentDef() {
    return WEAPON_DEFS[this.currentId];
  }

  switchWeapon(id) {
    if (!WEAPON_DEFS[id] || this.isReloading) return;
    this.currentId = id;
    Object.keys(this.meshes).forEach((k) => {
      this.meshes[k].visible = k === id;
    });
    this.updateHUD();
  }

  setADS(enabled) {
    const def = this.getCurrentDef();
    if (def.id === 'fists') return;
    this.isADS = enabled;
    const scopeEl = document.getElementById('sniperScopeOverlay');
    if (scopeEl) {
      scopeEl.style.display = enabled && def.id === 'sniper' ? 'block' : 'none';
    }
  }

  canShoot() {
    if (this.isReloading) return false;
    const def = this.getCurrentDef();
    const now = performance.now() / 1000;
    if (now - this.lastFireTime < def.fireRate) return false;
    const curAmmo = this.ammo[this.currentId];
    if (curAmmo.mag <= 0 && def.id !== 'fists') {
      this.reload();
      return false;
    }
    return true;
  }

  shoot(origin, direction, targetObjects, onHit) {
    if (!this.canShoot()) return false;

    const def = this.getCurrentDef();
    this.lastFireTime = performance.now() / 1000;

    if (def.id !== 'fists') {
      this.ammo[this.currentId].mag--;
    }

    sounds.playShoot(def.id);
    this.triggerMuzzleFlash(origin);

    // Ballistic Raycasting with Pellets Spread
    const hits = [];
    for (let p = 0; p < def.pellets; p++) {
      const spreadDir = direction.clone();
      if (def.spread > 0 && !this.isADS) {
        spreadDir.x += (Math.random() - 0.5) * def.spread;
        spreadDir.y += (Math.random() - 0.5) * def.spread;
        spreadDir.z += (Math.random() - 0.5) * def.spread;
        spreadDir.normalize();
      }

      const raycaster = new THREE.Raycaster(origin, spreadDir, 0.5, def.range);
      const intersects = raycaster.intersectObjects(targetObjects, true);

      let hitPoint = origin.clone().add(spreadDir.clone().multiplyScalar(def.range));
      if (intersects.length > 0) {
        hitPoint = intersects[0].point;
        hits.push(intersects[0]);
      }
      this.createTracer(origin, hitPoint);
    }

    // Process hits
    if (hits.length > 0) {
      const firstHit = hits[0];
      sounds.playHitmarker();
      const marker = document.getElementById('hitmarker');
      if (marker) {
        marker.classList.remove('active');
        void marker.offsetWidth; // Trigger reflow
        marker.classList.add('active');
      }
      if (typeof onHit === 'function') {
        onHit(firstHit, def.damage * hits.length);
      }
    }

    this.updateHUD();
    return true;
  }

  triggerMuzzleFlash(pos) {
    this.muzzleLight.position.copy(pos);
    this.muzzleLight.intensity = 5;
    setTimeout(() => {
      this.muzzleLight.intensity = 0;
    }, 45);
  }

  createTracer(start, end) {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const line = new THREE.Line(geo, this.tracerMat);
    this.scene.add(line);
    setTimeout(() => {
      this.scene.remove(line);
      geo.dispose();
    }, 60);
  }

  reload() {
    const def = this.getCurrentDef();
    if (this.isReloading || def.id === 'fists') return;
    const curAmmo = this.ammo[this.currentId];
    if (curAmmo.mag >= def.magSize || curAmmo.reserve <= 0) return;

    this.isReloading = true;
    sounds.playReload();

    setTimeout(() => {
      const needed = def.magSize - curAmmo.mag;
      const taken = Math.min(needed, curAmmo.reserve);
      curAmmo.mag += taken;
      curAmmo.reserve -= taken;
      this.isReloading = false;
      this.updateHUD();
    }, def.reloadTime * 1000);
  }

  updateHUD() {
    const def = this.getCurrentDef();
    const curAmmo = this.ammo[this.currentId];

    const nameEl = document.getElementById('currentWeaponName');
    const countEl = document.getElementById('currentAmmoCount');
    if (nameEl) nameEl.textContent = def.name;
    if (countEl) {
      countEl.textContent = def.id === 'fists' ? '∞' : `${curAmmo.mag} / ${curAmmo.reserve}`;
    }

    // Update slots active class
    const slots = document.querySelectorAll('.weapon-slot');
    slots.forEach((s) => {
      s.classList.toggle('active', s.dataset.weapon === def.id);
    });
  }
}
