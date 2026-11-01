import * as THREE from "three";

export const WEAPON_TYPES = {
  ak47: {
    id: "ak47",
    name: "AK47 Assault Rifle",
    type: "ar",
    fireRate: 110, // ms between shots
    isAuto: true,
    damage: 32,
    clipSize: 30,
    reloadDuration: 2.2,
    zoomFov: 52,
    recoilPitch: 0.04,
    spread: 0.035,
    adsSpread: 0.008,
    sound: "ak47"
  },
  m1014: {
    id: "m1014",
    name: "M1014 Shotgun",
    type: "shotgun",
    fireRate: 650,
    isAuto: false,
    damage: 18,
    pellets: 7,
    clipSize: 6,
    reloadDuration: 2.8,
    zoomFov: 58,
    recoilPitch: 0.09,
    spread: 0.08,
    adsSpread: 0.05,
    sound: "m1014"
  },
  awm: {
    id: "awm",
    name: "AWM Sniper Rifle",
    type: "sniper",
    fireRate: 1200,
    isAuto: false,
    damage: 135,
    clipSize: 5,
    reloadDuration: 3.2,
    zoomFov: 24, // High zoom 8x scope!
    recoilPitch: 0.12,
    spread: 0.04,
    adsSpread: 0.001,
    sound: "awm"
  },
  deagle: {
    id: "deagle",
    name: "Desert Eagle",
    type: "pistol",
    fireRate: 350,
    isAuto: false,
    damage: 45,
    clipSize: 7,
    reloadDuration: 1.8,
    zoomFov: 58,
    recoilPitch: 0.06,
    spread: 0.025,
    adsSpread: 0.01,
    sound: "deagle"
  },
  fist: {
    id: "fist",
    name: "Combat Fists",
    type: "melee",
    fireRate: 400,
    isAuto: false,
    damage: 20,
    clipSize: 999,
    reloadDuration: 0,
    zoomFov: 70,
    recoilPitch: 0.02,
    spread: 0,
    adsSpread: 0,
    sound: "fist"
  }
};

// Procedural 3D Weapon Meshes
export function createWeaponMesh(weaponId) {
  const group = new THREE.Group();

  const gunMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1f2421,
    metalness: 0.85,
    roughness: 0.35
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a21,
    roughness: 0.7
  });

  const greenStockMat = new THREE.MeshStandardMaterial({
    color: 0x3d4e38, // AWM military olive drab
    roughness: 0.6
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.9,
    roughness: 0.2
  });

  if (weaponId === "ak47") {
    // AK47 Receiver & Barrel
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.38), gunMetalMat);
    group.add(receiver);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.45, 8), gunMetalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.4);
    group.add(barrel);

    // Gas Tube & Wooden Handguard
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.24), woodMat);
    handguard.position.set(0, 0.02, 0.28);
    group.add(handguard);

    // Wooden Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.3), woodMat);
    stock.position.set(0, -0.02, -0.32);
    group.add(stock);

    // Curved Banana Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.1), gunMetalMat);
    mag.position.set(0, -0.15, 0.1);
    mag.rotation.x = -0.3;
    group.add(mag);

    // Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.07), woodMat);
    grip.position.set(0, -0.12, -0.1);
    grip.rotation.x = 0.3;
    group.add(grip);

    // Front Iron Sight
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.04, 0.02), gunMetalMat);
    sight.position.set(0, 0.06, 0.6);
    group.add(sight);

  } else if (weaponId === "m1014") {
    // Shotgun Receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.35), gunMetalMat);
    group.add(receiver);

    // Heavy Double Barrel & Tubular Mag
    const topBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.52, 8), gunMetalMat);
    topBarrel.rotation.x = Math.PI / 2;
    topBarrel.position.set(0, 0.03, 0.42);
    group.add(topBarrel);

    const tubeMag = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.45, 8), gunMetalMat);
    tubeMag.rotation.x = Math.PI / 2;
    tubeMag.position.set(0, -0.02, 0.38);
    group.add(tubeMag);

    // Ribbed Pump Slide
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.2), gunMetalMat);
    pump.position.set(0, -0.02, 0.3);
    group.add(pump);

    // Stock & Pistol Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.08), gunMetalMat);
    grip.position.set(0, -0.12, -0.12);
    grip.rotation.x = 0.35;
    group.add(grip);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.28), gunMetalMat);
    stock.position.set(0, 0, -0.3);
    group.add(stock);

  } else if (weaponId === "awm") {
    // AWM Long Chassis (Olive Green)
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.65), greenStockMat);
    group.add(chassis);

    // Long Fluted Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.75, 8), gunMetalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, 0.65);
    group.add(barrel);

    // Large Muzzle Brake
    const muzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.1), gunMetalMat);
    muzzleBrake.position.set(0, 0.04, 1.05);
    group.add(muzzleBrake);

    // 8x Telescopic Sniper Scope
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.3, 12), gunMetalMat);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.14, 0.05);
    group.add(scopeTube);

    const scopeLens = new THREE.Mesh(new THREE.CircleGeometry(0.033, 12), new THREE.MeshBasicMaterial({ color: 0x48dbfb }));
    scopeLens.position.set(0, 0.14, -0.1);
    scopeLens.rotation.y = Math.PI;
    group.add(scopeLens);

    // Thumbhole Sniper Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.38), greenStockMat);
    stock.position.set(0, -0.03, -0.48);
    group.add(stock);

    // Box Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.12), gunMetalMat);
    mag.position.set(0, -0.12, 0.05);
    group.add(mag);

  } else if (weaponId === "deagle") {
    // Desert Eagle Slide & Heavy Triangular Barrel
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.32), gunMetalMat);
    group.add(slide);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.18, 0.1), gunMetalMat);
    grip.position.set(0, -0.11, -0.06);
    grip.rotation.x = 0.25;
    group.add(grip);
  }

  // Muzzle Flash Pivot Point at Gun Tip
  const muzzleTip = new THREE.Group();
  let tipZ = 0.65;
  if (weaponId === "awm") tipZ = 1.1;
  else if (weaponId === "m1014") tipZ = 0.7;
  else if (weaponId === "deagle") tipZ = 0.22;
  muzzleTip.position.set(0, 0.03, tipZ);
  group.add(muzzleTip);
  group.userData.muzzleTip = muzzleTip;

  group.scale.set(1.25, 1.25, 1.25);
  return group;
}

// Particle & FX Manager (Muzzle Flashes, Tracers, Impacts)
export class FXManager {
  constructor(scene) {
    this.scene = scene;
    this.flashes = [];
    this.tracers = [];
  }

  createMuzzleFlash(position, direction) {
    const flashGroup = new THREE.Group();

    // Starburst geometry
    const starGeom = new THREE.OctahedronGeometry(0.22, 0);
    const starMat = new THREE.MeshBasicMaterial({
      color: 0xffeaa7,
      transparent: true,
      opacity: 0.95
    });
    const star = new THREE.Mesh(starGeom, starMat);
    flashGroup.add(star);

    // Warm Light
    const light = new THREE.PointLight(0xffa502, 3.5, 8);
    flashGroup.add(light);

    flashGroup.position.copy(position);
    this.scene.add(flashGroup);

    this.flashes.push({
      mesh: flashGroup,
      life: 0.045
    });
  }

  createBulletTracer(start, target) {
    const dir = new THREE.Vector3().subVectors(target, start);
    const length = dir.length();
    const geom = new THREE.CylinderGeometry(0.025, 0.025, length, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfff200,
      transparent: true,
      opacity: 0.85
    });
    const tracer = new THREE.Mesh(geom, mat);

    // Align cylinder to trajectory
    tracer.position.copy(start).add(dir.clone().multiplyScalar(0.5));
    tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());

    this.scene.add(tracer);
    this.tracers.push({
      mesh: tracer,
      life: 0.075
    });
  }

  update(delta) {
    // Update Muzzle Flashes
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= delta;
      if (f.life <= 0) {
        this.scene.remove(f.mesh);
        this.flashes.splice(i, 1);
      }
    }

    // Update Tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= delta;
      t.mesh.material.opacity = (t.life / 0.075);
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        this.tracers.splice(i, 1);
      }
    }
  }
}

