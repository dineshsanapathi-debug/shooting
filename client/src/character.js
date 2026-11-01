import * as THREE from "three";

// CHARACTER PALETTES & THEMES
export const CHARACTER_DATA = {
  kelly: {
    name: "Kelly",
    title: "Swift Sprinter",
    ability: "Dash: Increased sprint speed by +15%",
    primaryColor: 0xf4c430, // Yellow track / military vest
    secondaryColor: 0x1e272e,
    skinColor: 0xedd6c8,
    hairColor: 0x2c3e50,
    vestColor: 0x3d3d3d,
    accentColor: 0xffd32a
  },
  alok: {
    name: "DJ Alok",
    title: "Drop the Beat",
    ability: "Aura: Restores HP and boosts squad morale",
    primaryColor: 0x1e272e, // Tactical Black
    secondaryColor: 0x05c46b, // Neon green trim
    skinColor: 0xd4a373,
    hairColor: 0x111111,
    vestColor: 0x1e272e,
    accentColor: 0x0be881
  },
  hayato: {
    name: "Hayato",
    title: "Bushido Warrior",
    ability: "Bushido: Higher armor penetration at low HP",
    primaryColor: 0xb71540, // Crimson red
    secondaryColor: 0x0a3d62,
    skinColor: 0xf0cbb3,
    hairColor: 0x222f3e,
    vestColor: 0x4b6584,
    accentColor: 0xe55039
  },
  chrono: {
    name: "Chrono",
    title: "Time Turner",
    ability: "Force Shield: Creates a defensive energy dome",
    primaryColor: 0x0c2461, // Deep cyber navy
    secondaryColor: 0x00d2d3, // Cyan glow
    skinColor: 0xe0ac8f,
    hairColor: 0x2f3640,
    vestColor: 0x182c61,
    accentColor: 0x48dbfb
  }
};

export class CharacterModel {
  constructor(charType = "kelly", isEnemy = false) {
    this.charType = charType;
    this.isEnemy = isEnemy;
    this.config = CHARACTER_DATA[charType] || CHARACTER_DATA.kelly;

    this.group = new THREE.Group();
    this.animTime = 0;
    this.animState = "idle";
    this.recoilTime = 0;
    this.reloadProgress = 0;

    this.buildMesh();
  }

  buildMesh() {
    const cfg = this.config;
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.isEnemy ? 0x9e2a2b : cfg.primaryColor,
      roughness: 0.65,
      metalness: 0.2
    });

    const vestMat = new THREE.MeshStandardMaterial({
      color: this.isEnemy ? 0x3d0c0c : cfg.vestColor,
      roughness: 0.8
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: cfg.skinColor,
      roughness: 0.85
    });

    const pantsMat = new THREE.MeshStandardMaterial({
      color: this.isEnemy ? 0x333333 : cfg.secondaryColor,
      roughness: 0.7
    });

    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: cfg.accentColor,
      roughness: 0.3,
      emissive: cfg.accentColor,
      emissiveIntensity: 0.2
    });

    // Root Pelvis
    this.pelvis = new THREE.Group();
    this.pelvis.position.y = 1.0;
    this.group.add(this.pelvis);

    // Torso / Chest
    this.torso = new THREE.Group();
    this.torso.position.y = 0.25;
    this.pelvis.add(this.torso);

    const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.32), bodyMat);
    chestMesh.position.y = 0.3;
    chestMesh.castShadow = true;
    this.torso.add(chestMesh);

    // Tactical Vest
    const vestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.45, 0.36), vestMat);
    vestMesh.position.y = 0.32;
    vestMesh.castShadow = true;
    this.torso.add(vestMesh);

    // Pouches & Tactical Straps
    const pouch1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.08), vestMat);
    pouch1.position.set(-0.16, 0.25, 0.21);
    this.torso.add(pouch1);
    const pouch2 = pouch1.clone();
    pouch2.position.set(0.16, 0.25, 0.21);
    this.torso.add(pouch2);

    // Backpack
    this.backpack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.22), vestMat);
    this.backpack.position.set(0, 0.35, -0.24);
    this.backpack.castShadow = true;
    this.torso.add(this.backpack);

    // Head & Neck
    this.head = new THREE.Group();
    this.head.position.y = 0.68;
    this.torso.add(this.head);

    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.15, 8), skinMat);
    neckMesh.position.y = 0.05;
    this.head.add(neckMesh);

    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.34), skinMat);
    headMesh.position.y = 0.25;
    headMesh.castShadow = true;
    this.head.add(headMesh);

    // Character Headgear / Hair / Visor
    if (this.charType === "kelly") {
      // Tactical Visor / Headband
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.36), accentMat);
      band.position.y = 0.32;
      this.head.add(band);

      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.36), new THREE.MeshStandardMaterial({ color: cfg.hairColor }));
      hair.position.set(0, 0.43, -0.04);
      this.head.add(hair);
    } else if (this.charType === "alok") {
      // Tactical Sunglasses & Headset
      const shades = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.1), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1 }));
      shades.position.set(0, 0.27, 0.18);
      this.head.add(shades);

      const earL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8), accentMat);
      earL.rotation.z = Math.PI / 2;
      earL.position.set(-0.19, 0.26, 0);
      this.head.add(earL);
      const earR = earL.clone();
      earR.position.x = 0.19;
      this.head.add(earR);
    } else if (this.charType === "chrono") {
      // Cyber Helmet Visor
      const cyberVisor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.2), accentMat);
      cyberVisor.position.set(0, 0.28, 0.12);
      this.head.add(cyberVisor);
    } else {
      // Military Beret / Cap
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.1, 10), vestMat);
      cap.position.set(0, 0.44, -0.02);
      cap.rotation.z = 0.15;
      this.head.add(cap);
    }

    // Left Arm
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.35, 0.52, 0);
    this.torso.add(this.leftArm);

    const lUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.32, 0.15), bodyMat);
    lUpperArm.position.y = -0.16;
    lUpperArm.castShadow = true;
    this.leftArm.add(lUpperArm);

    this.leftForearm = new THREE.Group();
    this.leftForearm.position.y = -0.32;
    this.leftArm.add(this.leftForearm);

    const lLowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.3, 0.13), skinMat);
    lLowerArm.position.y = -0.15;
    this.leftForearm.add(lLowerArm);

    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), vestMat);
    lHand.position.y = -0.32;
    this.leftForearm.add(lHand);

    // Right Arm (Weapon Holding Arm)
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.35, 0.52, 0);
    this.torso.add(this.rightArm);

    const rUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.32, 0.15), bodyMat);
    rUpperArm.position.y = -0.16;
    rUpperArm.castShadow = true;
    this.rightArm.add(rUpperArm);

    this.rightForearm = new THREE.Group();
    this.rightForearm.position.y = -0.32;
    this.rightArm.add(this.rightForearm);

    const rLowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.3, 0.13), skinMat);
    rLowerArm.position.y = -0.15;
    this.rightForearm.add(rLowerArm);

    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), vestMat);
    rHand.position.y = -0.32;
    this.rightForearm.add(rHand);

    // Weapon Attachment Socket on Right Hand
    this.weaponSocket = new THREE.Group();
    this.weaponSocket.position.set(0, -0.34, 0.1);
    this.rightForearm.add(this.weaponSocket);

    // Holster Socket on Back
    this.holsterSocket = new THREE.Group();
    this.holsterSocket.position.set(0.2, 0.3, -0.36);
    this.holsterSocket.rotation.set(0, 0, Math.PI * 0.7);
    this.torso.add(this.holsterSocket);

    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.16, 0, 0);
    this.pelvis.add(this.leftLeg);

    const lThigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.18), pantsMat);
    lThigh.position.y = -0.22;
    lThigh.castShadow = true;
    this.leftLeg.add(lThigh);

    this.leftCalf = new THREE.Group();
    this.leftCalf.position.y = -0.44;
    this.leftLeg.add(this.leftCalf);

    const lShin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.16), pantsMat);
    lShin.position.y = -0.21;
    this.leftCalf.add(lShin);

    const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.28), bootMat);
    lBoot.position.set(0, -0.44, 0.05);
    lBoot.castShadow = true;
    this.leftCalf.add(lBoot);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.16, 0, 0);
    this.pelvis.add(this.rightLeg);

    const rThigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.18), pantsMat);
    rThigh.position.y = -0.22;
    rThigh.castShadow = true;
    this.rightLeg.add(rThigh);

    this.rightCalf = new THREE.Group();
    this.rightCalf.position.y = -0.44;
    this.rightLeg.add(this.rightCalf);

    const rShin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.16), pantsMat);
    rShin.position.y = -0.21;
    this.rightCalf.add(rShin);

    const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.28), bootMat);
    rBoot.position.set(0, -0.44, 0.05);
    rBoot.castShadow = true;
    this.rightCalf.add(rBoot);

    // Enable shadows across whole hierarchy
    this.group.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  // Trigger Recoil Animation
  triggerRecoil() {
    this.recoilTime = 0.15;
  }

  // Update Procedural Animations each frame
  updateAnimation(delta, state = "idle", speed = 0, isAiming = false, pitch = 0, isGrounded = true) {
    this.animTime += delta;
    this.animState = state;

    // Head & Torso Aim Pitch
    this.torso.rotation.x = THREE.MathUtils.lerp(this.torso.rotation.x, -pitch * 0.45, 0.2);
    this.head.rotation.x = THREE.MathUtils.lerp(this.head.rotation.x, -pitch * 0.55, 0.2);

    // Recoil decay
    let recoilKick = 0;
    if (this.recoilTime > 0) {
      this.recoilTime -= delta;
      recoilKick = Math.sin((this.recoilTime / 0.15) * Math.PI) * 0.25;
    }

    if (state === "death") {
      // Fall flat backward
      this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, 0.2, 0.15);
      this.pelvis.rotation.x = THREE.MathUtils.lerp(this.pelvis.rotation.x, -Math.PI / 2, 0.15);
      this.pelvis.position.y = 0.3;
      this.leftArm.rotation.set(0.3, 0, -0.5);
      this.rightArm.rotation.set(0.3, 0, 0.5);
      this.leftLeg.rotation.set(0.2, 0, -0.2);
      this.rightLeg.rotation.set(0.2, 0, 0.2);
      return;
    }

    if (state === "drive") {
      // Seated in vehicle posture
      this.pelvis.position.y = 0.55;
      this.torso.rotation.x = 0.1;
      this.leftLeg.rotation.x = -Math.PI / 2.3;
      this.rightLeg.rotation.x = -Math.PI / 2.3;
      this.leftCalf.rotation.x = Math.PI / 2.5;
      this.rightCalf.rotation.x = Math.PI / 2.5;
      this.leftArm.rotation.set(-0.8, -0.2, 0.3);
      this.rightArm.rotation.set(-0.8, 0.2, -0.3);
      return;
    }

    if (!isGrounded) {
      // In mid-air / jumping
      this.pelvis.position.y = 1.0;
      this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, -0.6, 0.2);
      this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0.4, 0.2);
      this.leftCalf.rotation.x = 0.7;
      this.rightCalf.rotation.x = 0.3;

      this.leftArm.rotation.set(-0.5, 0, -0.4);
      this.rightArm.rotation.set(-0.7, 0, 0.2);
      return;
    }

    if (state === "crouch") {
      this.pelvis.position.y = 0.65;
      this.leftLeg.rotation.x = -0.5;
      this.rightLeg.rotation.x = -0.5;
      this.leftCalf.rotation.x = 0.9;
      this.rightCalf.rotation.x = 0.9;
    } else {
      this.pelvis.position.y = 1.0;
    }

    if (state === "run" || state === "sprint") {
      const cycleSpeed = state === "sprint" ? 14 : 9.5;
      const legStride = state === "sprint" ? 0.95 : 0.65;
      const legCycle = Math.sin(this.animTime * cycleSpeed);

      // Legs alternate swing
      this.leftLeg.rotation.x = legCycle * legStride;
      this.rightLeg.rotation.x = -legCycle * legStride;

      // Calves bend naturally on backward swing
      this.leftCalf.rotation.x = Math.max(0, -legCycle * 0.9);
      this.rightCalf.rotation.x = Math.max(0, legCycle * 0.9);

      // Pelvis subtle bounce
      this.pelvis.position.y = (state === "crouch" ? 0.65 : 1.0) + Math.abs(Math.sin(this.animTime * cycleSpeed)) * 0.08;

      if (!isAiming) {
        // Arm swing counter-balancing legs
        this.leftArm.rotation.x = -legCycle * 0.65;
        this.rightArm.rotation.x = (legCycle * 0.4) - 0.4 - recoilKick;
        this.leftForearm.rotation.x = -0.4;
        this.rightForearm.rotation.x = -0.5;
      }
    } else {
      // Idle breathing
      const breath = Math.sin(this.animTime * 2.5) * 0.03;
      this.leftLeg.rotation.set(0, 0, -0.05);
      this.rightLeg.rotation.set(0, 0, 0.05);
      this.leftCalf.rotation.set(0, 0, 0);
      this.rightCalf.rotation.set(0, 0, 0);

      this.pelvis.position.y = (state === "crouch" ? 0.65 : 1.0) + breath * 0.3;
    }

    // Weapon Aiming Posture
    if (isAiming) {
      // High-precision raised 2-handed rifle stance
      this.rightArm.rotation.set(-1.4 - recoilKick, 0.25, -0.15);
      this.rightForearm.rotation.set(-0.35, 0, 0);

      this.leftArm.rotation.set(-1.3, -0.4, 0.5);
      this.leftForearm.rotation.set(-0.7, 0, 0);

      this.torso.rotation.y = -0.25; // Tactical shoulder angle
    } else if (state === "idle") {
      // Low-ready patrol carry
      this.rightArm.rotation.set(-0.8 - recoilKick, 0.15, -0.1);
      this.rightForearm.rotation.set(-0.6, 0, 0);

      this.leftArm.rotation.set(-0.6, -0.2, 0.3);
      this.leftForearm.rotation.set(-0.5, 0, 0);

      this.torso.rotation.y = 0;
    }
  }
}

