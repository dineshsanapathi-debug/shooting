import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();

export const WEAPON_DATA = {
  pistol: {
    name: "Pistol",
    model: "/models/weapons/pistol.glb",
    damage: 20,
    magazine: 12,
    reserveAmmo: 60,
    fireRate: 300,
    range: 60,
    color: 0x222222
  },

  rifle: {
    name: "Assault Rifle",
    model: "/models/weapons/rifle.glb",
    damage: 28,
    magazine: 30,
    reserveAmmo: 120,
    fireRate: 110,
    range: 150,
    color: 0x334155
  },

  shotgun: {
    name: "Shotgun",
    model: "/models/weapons/shotgun.glb",
    damage: 12,
    magazine: 6,
    reserveAmmo: 36,
    fireRate: 800,
    range: 35,
    color: 0x854d0e
  },

  sniper: {
    name: "Sniper Rifle",
    model: "/models/weapons/sniper.glb",
    damage: 85,
    magazine: 5,
    reserveAmmo: 25,
    fireRate: 1200,
    range: 300,
    color: 0x1e293b
  },

  smg: {
    name: "SMG",
    model: "/models/weapons/smg.glb",
    damage: 18,
    magazine: 32,
    reserveAmmo: 128,
    fireRate: 90,
    range: 90,
    color: 0x475569
  }
};

export async function createWeapon(type) {
  const data = WEAPON_DATA[type];

  if (!data) {
    throw new Error("Unknown weapon: " + type);
  }

  try {
    const gltf = await loader.loadAsync(data.model);
    const model = gltf.scene;

    model.traverse(object => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    model.scale.setScalar(1);

    return {
      type,
      data,
      model
    };
  } catch (err) {
    // Procedural 3D Weapon Model Fallback
    return createProceduralWeapon(type, data);
  }
}

function createProceduralWeapon(type, data) {
  const group = new THREE.Group();
  group.name = "Weapon_" + type;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: data.color || 0x222222,
    roughness: 0.4,
    metalness: 0.8
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.7
  });

  if (type === "pistol") {
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.38), bodyMat);
    slide.position.set(0, 0.05, 0);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.1), darkMat);
    grip.position.set(0, -0.1, -0.1);
    grip.rotation.x = 0.2;
    group.add(slide, grip);
  } else if (type === "shotgun") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.95), bodyMat);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.35), darkMat);
    stock.position.set(0, -0.04, -0.45);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), bodyMat);
    barrel.rotateX(Math.PI / 2);
    barrel.position.set(0, 0.02, 0.35);
    group.add(body, stock, barrel);
  } else if (type === "sniper") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 1.25), bodyMat);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), darkMat);
    scope.rotateX(Math.PI / 2);
    scope.position.set(0, 0.12, 0.05);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 8), bodyMat);
    barrel.rotateX(Math.PI / 2);
    barrel.position.set(0, 0.02, 0.6);
    group.add(body, scope, barrel);
  } else if (type === "smg") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.55), bodyMat);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.09), darkMat);
    mag.position.set(0, -0.16, 0.08);
    group.add(body, mag);
  } else { // rifle (Assault Rifle)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.82), bodyMat);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.3), darkMat);
    stock.position.set(0, -0.03, -0.42);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.12), darkMat);
    mag.position.set(0, -0.15, 0.06);
    mag.rotation.x = 0.25;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8), bodyMat);
    barrel.rotateX(Math.PI / 2);
    barrel.position.set(0, 0.02, 0.45);
    group.add(body, stock, mag, barrel);
  }

  group.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return {
    type,
    data,
    model: group
  };
}
