import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CHARACTER_DATA } from "./character.js";

const gltfLoader = new GLTFLoader();

// Helper to create QuaternionKeyframeTrack from Euler angle keyframes
function createRotTrack(nodeName, times, eulerKeyframes) {
  const quatValues = [];
  const euler = new THREE.Euler();
  const quat = new THREE.Quaternion();

  for (const rot of eulerKeyframes) {
    euler.set(rot[0], rot[1], rot[2], "YXZ");
    quat.setFromEuler(euler);
    quatValues.push(quat.x, quat.y, quat.z, quat.w);
  }

  return new THREE.QuaternionKeyframeTrack(`${nodeName}.quaternion`, times, quatValues);
}

// Helper to create VectorKeyframeTrack
function createPosTrack(nodeName, times, posKeyframes) {
  const values = [];
  for (const pos of posKeyframes) {
    values.push(pos[0], pos[1], pos[2]);
  }
  return new THREE.VectorKeyframeTrack(`${nodeName}.position`, times, values);
}

// Procedural Rigged 3D Character Model with AnimationMixer
function buildRiggedCharacterMesh(charSkin = "kelly", isEnemy = false) {
  const cfg = CHARACTER_DATA[charSkin] || CHARACTER_DATA.kelly;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x9e2a2b : cfg.primaryColor,
    roughness: 0.65,
    metalness: 0.2
  });

  const vestMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x3d0c0c : cfg.vestColor,
    roughness: 0.8
  });

  const skinMat = new THREE.MeshStandardMaterial({
    color: cfg.skinColor,
    roughness: 0.85
  });

  const pantsMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x333333 : cfg.secondaryColor,
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

  const root = new THREE.Group();
  root.name = "characterRoot";

  // Pelvis / Hips (Root bone of animation hierarchy)
  const pelvis = new THREE.Group();
  pelvis.name = "pelvis";
  pelvis.position.y = 1.0;
  root.add(pelvis);

  // Torso / Spine
  const torso = new THREE.Group();
  torso.name = "torso";
  torso.position.y = 0.22;
  pelvis.add(torso);

  const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.32), bodyMat);
  chestMesh.position.y = 0.3;
  chestMesh.castShadow = true;
  torso.add(chestMesh);

  // Tactical Vest
  const vestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.45, 0.36), vestMat);
  vestMesh.position.y = 0.32;
  vestMesh.castShadow = true;
  torso.add(vestMesh);

  // Tactical Pouches
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.08), vestMat);
  p1.position.set(-0.16, 0.25, 0.21);
  torso.add(p1);
  const p2 = p1.clone();
  p2.position.set(0.16, 0.25, 0.21);
  torso.add(p2);

  // Tactical Backpack
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.22), vestMat);
  backpack.position.set(0, 0.35, -0.24);
  backpack.castShadow = true;
  torso.add(backpack);

  // Head & Neck
  const head = new THREE.Group();
  head.name = "head";
  head.position.y = 0.68;
  torso.add(head);

  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.15, 8), skinMat);
  neckMesh.position.y = 0.05;
  head.add(neckMesh);

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.34), skinMat);
  headMesh.position.y = 0.25;
  headMesh.castShadow = true;
  head.add(headMesh);

  // Headgear per Operator
  if (charSkin === "kelly") {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.36), accentMat);
    band.position.y = 0.32;
    head.add(band);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.36), new THREE.MeshStandardMaterial({ color: cfg.hairColor }));
    hair.position.set(0, 0.43, -0.04);
    head.add(hair);
  } else if (charSkin === "alok") {
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.1), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1 }));
    shades.position.set(0, 0.27, 0.18);
    head.add(shades);
    const earL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8), accentMat);
    earL.rotation.z = Math.PI / 2;
    earL.position.set(-0.19, 0.26, 0);
    head.add(earL);
    const earR = earL.clone();
    earR.position.x = 0.19;
    head.add(earR);
  } else if (charSkin === "chrono") {
    const cyberVisor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.2), accentMat);
    cyberVisor.position.set(0, 0.28, 0.12);
    head.add(cyberVisor);
  } else {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.1, 10), vestMat);
    cap.position.set(0, 0.44, -0.02);
    head.add(cap);
  }

  // Left Arm Hierarchy
  const leftArm = new THREE.Group();
  leftArm.name = "leftArm";
  leftArm.position.set(-0.35, 0.52, 0);
  torso.add(leftArm);

  const lUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.32, 0.15), bodyMat);
  lUpperArm.position.y = -0.16;
  lUpperArm.castShadow = true;
  leftArm.add(lUpperArm);

  const leftForearm = new THREE.Group();
  leftForearm.name = "leftForearm";
  leftForearm.position.y = -0.32;
  leftArm.add(leftForearm);

  const lLowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.3, 0.13), skinMat);
  lLowerArm.position.y = -0.15;
  leftForearm.add(lLowerArm);

  const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), vestMat);
  lHand.position.y = -0.32;
  leftForearm.add(lHand);

  // Right Arm Hierarchy (Holds weapon)
  const rightArm = new THREE.Group();
  rightArm.name = "rightArm";
  rightArm.position.set(0.35, 0.52, 0);
  torso.add(rightArm);

  const rUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.32, 0.15), bodyMat);
  rUpperArm.position.y = -0.16;
  rUpperArm.castShadow = true;
  rightArm.add(rUpperArm);

  const rightForearm = new THREE.Group();
  rightForearm.name = "rightForearm";
  rightForearm.position.y = -0.32;
  rightArm.add(rightForearm);

  const rLowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.3, 0.13), skinMat);
  rLowerArm.position.y = -0.15;
  rightForearm.add(rLowerArm);

  const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), vestMat);
  rHand.position.y = -0.32;
  rightForearm.add(rHand);

  // Weapon Attachment Socket
  const weaponSocket = new THREE.Group();
  weaponSocket.name = "weaponSocket";
  weaponSocket.position.set(0, -0.34, 0.1);
  rightForearm.add(weaponSocket);

  // Left Leg Hierarchy
  const leftLeg = new THREE.Group();
  leftLeg.name = "leftLeg";
  leftLeg.position.set(-0.16, 0, 0);
  pelvis.add(leftLeg);

  const lThigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.18), pantsMat);
  lThigh.position.y = -0.22;
  lThigh.castShadow = true;
  leftLeg.add(lThigh);

  const leftCalf = new THREE.Group();
  leftCalf.name = "leftCalf";
  leftCalf.position.y = -0.44;
  leftLeg.add(leftCalf);

  const lShin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.16), pantsMat);
  lShin.position.y = -0.21;
  leftCalf.add(lShin);

  const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.28), bootMat);
  lBoot.position.set(0, -0.44, 0.05);
  lBoot.castShadow = true;
  leftCalf.add(lBoot);

  // Right Leg Hierarchy
  const rightLeg = new THREE.Group();
  rightLeg.name = "rightLeg";
  rightLeg.position.set(0.16, 0, 0);
  pelvis.add(rightLeg);

  const rThigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.18), pantsMat);
  rThigh.position.y = -0.22;
  rThigh.castShadow = true;
  rightLeg.add(rThigh);

  const rightCalf = new THREE.Group();
  rightCalf.name = "rightCalf";
  rightCalf.position.y = -0.44;
  rightLeg.add(rightCalf);

  const rShin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.16), pantsMat);
  rShin.position.y = -0.21;
  rightCalf.add(rShin);

  const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.28), bootMat);
  rBoot.position.set(0, -0.44, 0.05);
  rBoot.castShadow = true;
  rightCalf.add(rBoot);

  root.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return { root, weaponSocket };
}

// Generate Realistic Three.js AnimationClips for Character
function createCharacterClips() {
  const clips = [];

  // ==========================================
  // 1. IDLE CLIP (Natural breathing & low-ready stance)
  // ==========================================
  const idleTimes = [0, 1.0, 2.0];
  const idleTracks = [
    createPosTrack("pelvis", idleTimes, [[0, 1.0, 0], [0, 1.03, 0], [0, 1.0, 0]]),
    createRotTrack("torso", idleTimes, [[0, 0, 0], [0.03, 0, 0], [0, 0, 0]]),
    createRotTrack("rightArm", idleTimes, [[-0.8, 0.15, -0.1], [-0.82, 0.15, -0.1], [-0.8, 0.15, -0.1]]),
    createRotTrack("rightForearm", idleTimes, [[-0.6, 0, 0], [-0.62, 0, 0], [-0.6, 0, 0]]),
    createRotTrack("leftArm", idleTimes, [[-0.6, -0.2, 0.3], [-0.62, -0.2, 0.3], [-0.6, -0.2, 0.3]]),
    createRotTrack("leftForearm", idleTimes, [[-0.5, 0, 0], [-0.52, 0, 0], [-0.5, 0, 0]]),
    createRotTrack("leftLeg", idleTimes, [[0, 0, -0.05], [0, 0, -0.05], [0, 0, -0.05]]),
    createRotTrack("rightLeg", idleTimes, [[0, 0, 0.05], [0, 0, 0.05], [0, 0, 0.05]])
  ];
  clips.push(new THREE.AnimationClip("idle", 2.0, idleTracks));

  // ==========================================
  // 2. SKYDIVE CLIP (Belly-down horizontal dive, arms & legs spread)
  // ==========================================
  const skydiveTimes = [0, 0.5, 1.0];
  const skydiveTracks = [
    createPosTrack("pelvis", skydiveTimes, [[0, 1.0, 0], [0, 1.02, 0], [0, 1.0, 0]]),
    createRotTrack("pelvis", skydiveTimes, [[-1.35, 0, 0], [-1.32, 0, 0], [-1.35, 0, 0]]),
    createRotTrack("torso", skydiveTimes, [[-0.25, 0, 0], [-0.22, 0, 0], [-0.25, 0, 0]]),
    createRotTrack("head", skydiveTimes, [[0.55, 0, 0], [0.52, 0, 0], [0.55, 0, 0]]),
    createRotTrack("leftArm", skydiveTimes, [[0.35, 0.3, -1.2], [0.38, 0.3, -1.15], [0.35, 0.3, -1.2]]),
    createRotTrack("rightArm", skydiveTimes, [[0.35, -0.3, 1.2], [0.38, -0.3, 1.15], [0.35, -0.3, 1.2]]),
    createRotTrack("leftForearm", skydiveTimes, [[-0.55, 0, 0], [-0.52, 0, 0], [-0.55, 0, 0]]),
    createRotTrack("rightForearm", skydiveTimes, [[-0.55, 0, 0], [-0.52, 0, 0], [-0.55, 0, 0]]),
    createRotTrack("leftLeg", skydiveTimes, [[0.2, 0, -0.25], [0.22, 0, -0.23], [0.2, 0, -0.25]]),
    createRotTrack("rightLeg", skydiveTimes, [[0.2, 0, 0.25], [0.22, 0, 0.23], [0.2, 0, 0.25]]),
    createRotTrack("leftCalf", skydiveTimes, [[1.2, 0, 0], [1.15, 0, 0], [1.2, 0, 0]]),
    createRotTrack("rightCalf", skydiveTimes, [[1.2, 0, 0], [1.15, 0, 0], [1.2, 0, 0]])
  ];
  clips.push(new THREE.AnimationClip("skydive", 1.0, skydiveTracks));

  // ==========================================
  // 3. PARACHUTE CLIP (Upright hanging from harness)
  // ==========================================
  const chuteTimes = [0, 0.6, 1.2];
  const chuteTracks = [
    createPosTrack("pelvis", chuteTimes, [[0, 1.0, 0], [0, 0.98, 0], [0, 1.0, 0]]),
    createRotTrack("pelvis", chuteTimes, [[0, 0, 0], [0, 0, 0.05], [0, 0, 0]]),
    createRotTrack("torso", chuteTimes, [[0.08, 0, 0], [0.08, 0, 0], [0.08, 0, 0]]),
    createRotTrack("leftArm", chuteTimes, [[-2.8, -0.3, 0.3], [-2.75, -0.3, 0.3], [-2.8, -0.3, 0.3]]),
    createRotTrack("rightArm", chuteTimes, [[-2.8, 0.3, -0.3], [-2.75, 0.3, -0.3], [-2.8, 0.3, -0.3]]),
    createRotTrack("leftForearm", chuteTimes, [[-0.3, 0, 0], [-0.3, 0, 0], [-0.3, 0, 0]]),
    createRotTrack("rightForearm", chuteTimes, [[-0.3, 0, 0], [-0.3, 0, 0], [-0.3, 0, 0]]),
    createRotTrack("leftLeg", chuteTimes, [[0.25, 0, -0.08], [0.35, 0, -0.08], [0.25, 0, -0.08]]),
    createRotTrack("rightLeg", chuteTimes, [[0.25, 0, 0.08], [0.15, 0, 0.08], [0.25, 0, 0.08]]),
    createRotTrack("leftCalf", chuteTimes, [[0.35, 0, 0], [0.4, 0, 0], [0.35, 0, 0]]),
    createRotTrack("rightCalf", chuteTimes, [[0.35, 0, 0], [0.4, 0, 0], [0.35, 0, 0]])
  ];
  clips.push(new THREE.AnimationClip("parachute", 1.2, chuteTracks));

  // ==========================================
  // 4. LANDING CLIP (Deep Impact Absorption -> Crouch -> Stand Up with Weapon)
  // ==========================================
  // 0.0s: Touchdown
  // 0.25s: Maximum compression (pelvis drops to 0.35m, hands touch ground)
  // 0.75s: Stabilize in low tactical crouch (pelvis 0.65m, weapon ready)
  // 1.25s: Stand up smoothly (pelvis 1.0m)
  // 1.50s: Combat ready stance!
  const landTimes = [0, 0.25, 0.75, 1.25, 1.5];
  const landTracks = [
    // Pelvis vertical squash and rise
    createPosTrack("pelvis", landTimes, [
      [0, 1.0, 0],
      [0, 0.35, 0], // Deep knee bend compression
      [0, 0.65, 0], // Tactical crouch
      [0, 0.95, 0], // Rising up
      [0, 1.0, 0]   // Fully standing with weapon
    ]),
    createRotTrack("pelvis", landTimes, [
      [0, 0, 0],
      [0.25, 0, 0],
      [0.1, 0, 0],
      [0.02, 0, 0],
      [0, 0, 0]
    ]),
    // Torso forward bend on impact, rising to upright
    createRotTrack("torso", landTimes, [
      [0, 0, 0],
      [0.75, 0, 0],  // Leaned forward absorbing impact
      [0.45, 0, 0],  // Crouched posture
      [0.15, 0, 0],  // Straightening back
      [0, 0, 0]      // Upright
    ]),
    createRotTrack("head", landTimes, [
      [0, 0, 0],
      [0.45, 0, 0],
      [0.15, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ]),
    // Left Arm: reaches down to ground, then holds weapon support
    createRotTrack("leftArm", landTimes, [
      [-0.8, -0.2, 0.3],
      [-0.3, -0.3, 0.6],  // Hand touching ground
      [-0.5, -0.2, 0.4],  // Rising
      [-0.6, -0.2, 0.3],
      [-0.6, -0.2, 0.3]
    ]),
    createRotTrack("leftForearm", landTimes, [
      [-0.5, 0, 0],
      [-0.1, 0, 0], // Arm extended to ground
      [-0.4, 0, 0],
      [-0.5, 0, 0],
      [-0.5, 0, 0]
    ]),
    // Right Arm: holds weapon through landing, raises to ready
    createRotTrack("rightArm", landTimes, [
      [-0.8, 0.15, -0.1],
      [-0.4, 0.2, -0.3],  // Weapon held low to right
      [-0.7, 0.15, -0.1],
      [-0.8, 0.15, -0.1],
      [-0.8, 0.15, -0.1]
    ]),
    createRotTrack("rightForearm", landTimes, [
      [-0.6, 0, 0],
      [-0.3, 0, 0],
      [-0.55, 0, 0],
      [-0.6, 0, 0],
      [-0.6, 0, 0]
    ]),
    // Legs: flex deeply then stand
    createRotTrack("leftLeg", landTimes, [
      [0, 0, -0.05],
      [-1.4, 0, -0.15], // Deep knee bend
      [-0.6, 0, -0.1],  // Crouch
      [-0.15, 0, -0.05],
      [0, 0, -0.05]
    ]),
    createRotTrack("rightLeg", landTimes, [
      [0, 0, 0.05],
      [-1.4, 0, 0.15],  // Deep knee bend
      [-0.6, 0, 0.1],   // Crouch
      [-0.15, 0, 0.05],
      [0, 0, 0.05]
    ]),
    createRotTrack("leftCalf", landTimes, [
      [0, 0, 0],
      [1.5, 0, 0], // Fully bent calf
      [0.9, 0, 0], // Crouch calf
      [0.2, 0, 0],
      [0, 0, 0]
    ]),
    createRotTrack("rightCalf", landTimes, [
      [0, 0, 0],
      [1.5, 0, 0], // Fully bent calf
      [0.9, 0, 0], // Crouch calf
      [0.2, 0, 0],
      [0, 0, 0]
    ])
  ];
  clips.push(new THREE.AnimationClip("landing", 1.5, landTracks));

  // ==========================================
  // 5. CROUCH CLIP
  // ==========================================
  const crouchTimes = [0, 0.75, 1.5];
  const crouchTracks = [
    createPosTrack("pelvis", crouchTimes, [[0, 0.65, 0], [0, 0.66, 0], [0, 0.65, 0]]),
    createRotTrack("torso", crouchTimes, [[0.2, 0, 0], [0.22, 0, 0], [0.2, 0, 0]]),
    createRotTrack("leftLeg", crouchTimes, [[-0.5, 0, -0.1], [-0.5, 0, -0.1], [-0.5, 0, -0.1]]),
    createRotTrack("rightLeg", crouchTimes, [[-0.5, 0, 0.1], [-0.5, 0, 0.1], [-0.5, 0, 0.1]]),
    createRotTrack("leftCalf", crouchTimes, [[0.9, 0, 0], [0.9, 0, 0], [0.9, 0, 0]]),
    createRotTrack("rightCalf", crouchTimes, [[0.9, 0, 0], [0.9, 0, 0], [0.9, 0, 0]]),
    createRotTrack("rightArm", crouchTimes, [[-0.85, 0.15, -0.1], [-0.85, 0.15, -0.1], [-0.85, 0.15, -0.1]]),
    createRotTrack("rightForearm", crouchTimes, [[-0.6, 0, 0], [-0.6, 0, 0], [-0.6, 0, 0]])
  ];
  clips.push(new THREE.AnimationClip("crouch", 1.5, crouchTracks));

  // ==========================================
  // 6. RUN CLIP (Military Sprint with Alternating Strides)
  // ==========================================
  const runTimes = [0, 0.2, 0.4, 0.6, 0.8];
  const runTracks = [
    createPosTrack("pelvis", runTimes, [
      [0, 1.0, 0],
      [0, 1.06, 0],
      [0, 1.0, 0],
      [0, 1.06, 0],
      [0, 1.0, 0]
    ]),
    createRotTrack("torso", runTimes, [
      [0.15, 0.05, 0],
      [0.18, 0, 0],
      [0.15, -0.05, 0],
      [0.18, 0, 0],
      [0.15, 0.05, 0]
    ]),
    createRotTrack("leftLeg", runTimes, [
      [0.85, 0, 0],
      [0, 0, 0],
      [-0.85, 0, 0],
      [0, 0, 0],
      [0.85, 0, 0]
    ]),
    createRotTrack("rightLeg", runTimes, [
      [-0.85, 0, 0],
      [0, 0, 0],
      [0.85, 0, 0],
      [0, 0, 0],
      [-0.85, 0, 0]
    ]),
    createRotTrack("leftCalf", runTimes, [
      [0.1, 0, 0],
      [0.8, 0, 0],
      [0.2, 0, 0],
      [0.8, 0, 0],
      [0.1, 0, 0]
    ]),
    createRotTrack("rightCalf", runTimes, [
      [0.2, 0, 0],
      [0.8, 0, 0],
      [0.1, 0, 0],
      [0.8, 0, 0],
      [0.2, 0, 0]
    ]),
    createRotTrack("leftArm", runTimes, [
      [-0.5, 0, 0],
      [-0.7, 0, 0],
      [0.4, 0, 0],
      [-0.3, 0, 0],
      [-0.5, 0, 0]
    ]),
    createRotTrack("rightArm", runTimes, [
      [-0.8, 0.15, -0.1],
      [-0.85, 0.15, -0.1],
      [-0.75, 0.15, -0.1],
      [-0.85, 0.15, -0.1],
      [-0.8, 0.15, -0.1]
    ]),
    createRotTrack("rightForearm", runTimes, [
      [-0.6, 0, 0],
      [-0.65, 0, 0],
      [-0.55, 0, 0],
      [-0.65, 0, 0],
      [-0.6, 0, 0]
    ])
  ];
  clips.push(new THREE.AnimationClip("run", 0.8, runTracks));

  // ==========================================
  // 7. JUMP CLIP
  // ==========================================
  const jumpTimes = [0, 0.4, 0.8];
  const jumpTracks = [
    createPosTrack("pelvis", jumpTimes, [[0, 1.0, 0], [0, 1.1, 0], [0, 1.0, 0]]),
    createRotTrack("leftLeg", jumpTimes, [[-0.6, 0, 0], [-0.7, 0, 0], [-0.6, 0, 0]]),
    createRotTrack("rightLeg", jumpTimes, [[0.4, 0, 0], [0.35, 0, 0], [0.4, 0, 0]]),
    createRotTrack("leftCalf", jumpTimes, [[0.7, 0, 0], [0.8, 0, 0], [0.7, 0, 0]]),
    createRotTrack("rightCalf", jumpTimes, [[0.3, 0, 0], [0.35, 0, 0], [0.3, 0, 0]])
  ];
  clips.push(new THREE.AnimationClip("jump", 0.8, jumpTracks));

  // ==========================================
  // 8. SHOOT CLIP (Recoil kick)
  // ==========================================
  const shootTimes = [0, 0.08, 0.25];
  const shootTracks = [
    createRotTrack("torso", shootTimes, [[0, 0, 0], [-0.15, 0, 0], [0, 0, 0]]),
    createRotTrack("rightArm", shootTimes, [[-1.4, 0.25, -0.15], [-1.6, 0.25, -0.15], [-1.4, 0.25, -0.15]])
  ];
  clips.push(new THREE.AnimationClip("shoot", 0.25, shootTracks));

  return clips;
}

// MAIN EXPORT: createAnimatedCharacter
export async function createAnimatedCharacter(charSkin = "kelly", isEnemy = false) {
  let model = null;
  let animations = [];
  let weaponSocket = null;

  // 1. Try loading external GLTF model if available
  try {
    const gltf = await gltfLoader.loadAsync("/models/character.glb");
    if (gltf && gltf.scene) {
      model = gltf.scene;
      animations = gltf.animations || [];
      model.traverse(object => {
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      // Find or create weapon attachment socket
      weaponSocket = model.getObjectByName("weaponSocket") || model.getObjectByName("RightHand") || new THREE.Group();
      if (!model.getObjectByName("weaponSocket")) {
        model.add(weaponSocket);
      }
    }
  } catch (err) {
    // Fall back to built-in rigged character model with full clips
    model = null;
  }

  // 2. Fallback to procedurally rigged character if GLB not found
  if (!model) {
    const rigged = buildRiggedCharacterMesh(charSkin, isEnemy);
    model = rigged.root;
    weaponSocket = rigged.weaponSocket;
    animations = createCharacterClips();
  }

  // 3. Initialize Three.js AnimationMixer & Actions Map
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};

  for (const clip of animations) {
    const name = clip.name.toLowerCase();
    actions[name] = mixer.clipAction(clip);
  }

  // Aliases for matching clip names (e.g. falling -> skydive, landed -> idle)
  if (actions["skydive"] && !actions["falling"]) actions["falling"] = actions["skydive"];
  if (actions["idle"] && !actions["landed"]) actions["landed"] = actions["idle"];

  let currentAction = null;
  let currentActionName = "";

  function play(name, fade = 0.2) {
    const key = name.toLowerCase();
    const action = actions[key] || actions["idle"];
    if (!action || currentAction === action) return;

    action.reset();
    action.enabled = true;

    const isLanding = key === "landing";
    const isShoot = key === "shoot";
    const isSingleShot = isLanding || isShoot;

    action.setLoop(isSingleShot ? THREE.LoopOnce : THREE.LoopRepeat);
    action.clampWhenFinished = isLanding;

    action.fadeIn(fade);
    if (currentAction) {
      currentAction.fadeOut(fade);
    }

    action.play();
    currentAction = action;
    currentActionName = key;
  }

  // Play default idle animation
  play("idle", 0.1);

  return {
    model,
    group: model, // Compatibility alias for group-based operations
    mixer,
    actions,
    weaponSocket,
    getCurrentActionName: () => currentActionName,
    play,

    update(delta) {
      mixer.update(delta);
    },

    updateAnimation(delta, state) {
      mixer.update(delta);
      if (state) play(state, 0.15);
    },

    triggerRecoil() {
      play("shoot", 0.05);
      setTimeout(() => {
        if (currentActionName === "shoot") play("idle", 0.1);
      }, 250);
    },

    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
    }
  };
}

// Synchronous factory for instantaneous creation with procedural fallback
export function createRiggedCharacter(charSkin = "kelly", isEnemy = false) {
  const rigged = buildRiggedCharacterMesh(charSkin, isEnemy);
  const model = rigged.root;
  const weaponSocket = rigged.weaponSocket;
  const animations = createCharacterClips();

  const mixer = new THREE.AnimationMixer(model);
  const actions = {};

  for (const clip of animations) {
    const name = clip.name.toLowerCase();
    actions[name] = mixer.clipAction(clip);
  }

  if (actions["skydive"] && !actions["falling"]) actions["falling"] = actions["skydive"];
  if (actions["idle"] && !actions["landed"]) actions["landed"] = actions["idle"];

  let currentAction = null;
  let currentActionName = "";

  function play(name, fade = 0.2) {
    const key = name.toLowerCase();
    const action = actions[key] || actions["idle"];
    if (!action || currentAction === action) return;

    action.reset();
    action.enabled = true;

    const isLanding = key === "landing";
    const isShoot = key === "shoot";
    const isSingleShot = isLanding || isShoot;

    action.setLoop(isSingleShot ? THREE.LoopOnce : THREE.LoopRepeat);
    action.clampWhenFinished = isLanding;

    action.fadeIn(fade);
    if (currentAction) {
      currentAction.fadeOut(fade);
    }

    action.play();
    currentAction = action;
    currentActionName = key;
  }

  play("idle", 0.1);

  return {
    model,
    group: model,
    mixer,
    actions,
    weaponSocket,
    getCurrentActionName: () => currentActionName,
    play,

    update(delta) {
      mixer.update(delta);
    },

    updateAnimation(delta, state) {
      mixer.update(delta);
      if (state) play(state, 0.15);
    },

    triggerRecoil() {
      play("shoot", 0.05);
      setTimeout(() => {
        if (currentActionName === "shoot") play("idle", 0.1);
      }, 250);
    },

    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
    }
  };
}
