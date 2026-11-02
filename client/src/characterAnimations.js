// ====================================================================
// FREE FIRE BHARAT 3D - CHARACTER ANIMATION SYSTEM
// Three.js AnimationMixer with GLTF Loader & Procedural Rigged Operators
// Supports: Idle, Walk, Run, Jump, Skydive, Parachute, Landing, Crouch, Shoot, Reload, Death
// ====================================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export async function createAnimatedCharacter(characterId = 'hayato') {
  try {
    // Attempt to load external GLB model if present in /models/character.glb
    const gltf = await loader.loadAsync('/models/character.glb');
    const model = gltf.scene;

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const mixer = new THREE.AnimationMixer(model);
    const actions = {};

    for (const clip of gltf.animations) {
      actions[clip.name.toLowerCase()] = mixer.clipAction(clip);
    }

    let currentAction = null;

    function play(name, fade = 0.2) {
      const lower = name.toLowerCase();
      const action = actions[lower];
      if (!action || currentAction === action) return;

      action.reset();
      action.enabled = true;

      const isLanding = lower === 'landing';
      action.setLoop(isLanding ? THREE.LoopOnce : THREE.LoopRepeat);
      action.clampWhenFinished = isLanding;

      action.fadeIn(fade);
      if (currentAction) {
        currentAction.fadeOut(fade);
      }
      action.play();
      currentAction = action;
    }

    return {
      model,
      mixer,
      play,
      update(delta) {
        mixer.update(delta);
      },
      dispose() {
        mixer.stopAllAction();
        mixer.uncacheRoot(model);
      }
    };
  } catch (err) {
    // Fallback: Build an authentic rigged Free Fire tactical operator with AnimationMixer tracks
    return createRiggedCharacter(characterId);
  }
}

// Procedural 3D Rigged Operator with Three.js AnimationMixer Tracks
export function createRiggedCharacter(characterId = 'hayato') {
  const root = new THREE.Group();
  root.name = 'RiggedOperator_' + characterId;

  // Color schemes for Free Fire characters
  const palettes = {
    hayato: { skin: 0xd4a373, coat: 0x1b1f24, pants: 0x2b2d42, hair: 0x0d0d0d, accent: 0xff0055 },
    alok:   { skin: 0xc68642, coat: 0x111111, pants: 0x1e232a, hair: 0x1a1a1a, accent: 0xffbe0b },
    kelly:  { skin: 0xfcd5ce, coat: 0xffbe0b, pants: 0x212529, hair: 0xd90429, accent: 0x00f5d4 },
    chrono: { skin: 0xe0a96d, coat: 0x0f172a, pants: 0x1e293b, hair: 0x0284c7, accent: 0x38bdf8 }
  };
  const c = palettes[characterId] || palettes.hayato;

  // Materials
  const skinMat = new THREE.MeshStandardMaterial({ color: c.skin, roughness: 0.7 });
  const coatMat = new THREE.MeshStandardMaterial({ color: c.coat, roughness: 0.5 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: c.pants, roughness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: c.hair, roughness: 0.8 });
  const accentMat = new THREE.MeshStandardMaterial({ color: c.accent, roughness: 0.4, emissive: c.accent, emissiveIntensity: 0.3 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.8 });
  const vestMat = new THREE.MeshStandardMaterial({ color: 0x2b2d42, roughness: 0.5 });

  // Pelvis & Spine Hierarchy
  const pelvis = new THREE.Group();
  pelvis.name = 'Pelvis';
  pelvis.position.y = 0.95;
  root.add(pelvis);

  // Torso / Chest
  const chest = new THREE.Group();
  chest.name = 'Chest';
  chest.position.y = 0.2;
  pelvis.add(chest);

  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.5, 0.28), coatMat);
  torsoMesh.position.y = 0.15;
  torsoMesh.castShadow = true;
  chest.add(torsoMesh);

  // Tactical Vest
  const vestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.42, 0.32), vestMat);
  vestMesh.position.y = 0.14;
  vestMesh.castShadow = true;
  chest.add(vestMesh);

  // Tactical Backpack
  const backpackMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.18), accentMat);
  backpackMesh.position.set(0, 0.15, -0.22);
  backpackMesh.castShadow = true;
  chest.add(backpackMesh);

  // Neck & Head
  const headGroup = new THREE.Group();
  headGroup.name = 'Head';
  headGroup.position.y = 0.52;
  chest.add(headGroup);

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), skinMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.26), hairMat);
  hairMesh.position.y = 0.12;
  headGroup.add(hairMesh);

  // Left & Right Arms
  const leftArm = new THREE.Group();
  leftArm.name = 'LeftArm';
  leftArm.position.set(0.32, 0.36, 0);
  chest.add(leftArm);
  const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), coatMat);
  leftArmMesh.position.y = -0.25;
  leftArmMesh.castShadow = true;
  leftArm.add(leftArmMesh);

  const rightArm = new THREE.Group();
  rightArm.name = 'RightArm';
  rightArm.position.set(-0.32, 0.36, 0);
  chest.add(rightArm);
  const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), coatMat);
  rightArmMesh.position.y = -0.25;
  rightArmMesh.castShadow = true;
  rightArm.add(rightArmMesh);

  // Weapon Mount Hand Slot
  const rightHand = new THREE.Group();
  rightHand.name = 'RightHand';
  rightHand.position.set(0, -0.5, 0);
  rightArm.add(rightHand);

  // Left & Right Legs
  const leftLeg = new THREE.Group();
  leftLeg.name = 'LeftLeg';
  leftLeg.position.set(0.16, 0, 0);
  pelvis.add(leftLeg);
  const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), pantsMat);
  leftLegMesh.position.y = -0.32;
  leftLegMesh.castShadow = true;
  leftLeg.add(leftLegMesh);
  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.24), bootMat);
  leftBoot.position.set(0, -0.65, 0.03);
  leftLeg.add(leftBoot);

  const rightLeg = new THREE.Group();
  rightLeg.name = 'RightLeg';
  rightLeg.position.set(-0.16, 0, 0);
  pelvis.add(rightLeg);
  const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), pantsMat);
  rightLegMesh.position.y = -0.32;
  rightLegMesh.castShadow = true;
  rightLeg.add(rightLegMesh);
  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.24), bootMat);
  rightBoot.position.set(0, -0.65, 0.03);
  rightLeg.add(rightBoot);

  // Keyframed Animation Mixer Setup
  const mixer = new THREE.AnimationMixer(root);
  const actions = {};

  // 1. IDLE CLIP (Breathing & Ready Stance)
  const idleTimes = [0, 1.2, 2.4];
  const idleChestPos = [
    0, 0.2, 0,
    0, 0.22, 0,
    0, 0.2, 0
  ];
  const idleRarmRot = [
    0, 0, 0, 1,
    0.1, 0, 0, 0.99,
    0, 0, 0, 1
  ];
  const idleClip = new THREE.AnimationClip('idle', 2.4, [
    new THREE.VectorKeyframeTrack('Pelvis/Chest.position', idleTimes, idleChestPos),
    new THREE.QuaternionKeyframeTrack('Pelvis/Chest/RightArm.quaternion', idleTimes, idleRarmRot)
  ]);
  actions['idle'] = mixer.clipAction(idleClip);

  // 2. RUN CLIP (Free Fire forward sprint)
  const runTimes = [0, 0.25, 0.5, 0.75, 1.0];
  const qLeftArmRun = [
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.75),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.75),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.75)
  ];
  const qRightArmRun = [
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.75),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.75),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.75)
  ];
  const runClip = new THREE.AnimationClip('run', 1.0, [
    new THREE.QuaternionKeyframeTrack('Pelvis/Chest/LeftArm.quaternion', [0, 0.5, 1.0], [
      qLeftArmRun[0].x, qLeftArmRun[0].y, qLeftArmRun[0].z, qLeftArmRun[0].w,
      qLeftArmRun[1].x, qLeftArmRun[1].y, qLeftArmRun[1].z, qLeftArmRun[1].w,
      qLeftArmRun[2].x, qLeftArmRun[2].y, qLeftArmRun[2].z, qLeftArmRun[2].w
    ]),
    new THREE.QuaternionKeyframeTrack('Pelvis/Chest/RightArm.quaternion', [0, 0.5, 1.0], [
      qRightArmRun[0].x, qRightArmRun[0].y, qRightArmRun[0].z, qRightArmRun[0].w,
      qRightArmRun[1].x, qRightArmRun[1].y, qRightArmRun[1].z, qRightArmRun[1].w,
      qRightArmRun[2].x, qRightArmRun[2].y, qRightArmRun[2].z, qRightArmRun[2].w
    ]),
    new THREE.QuaternionKeyframeTrack('Pelvis/LeftLeg.quaternion', [0, 0.5, 1.0], [
      qRightArmRun[0].x, qRightArmRun[0].y, qRightArmRun[0].z, qRightArmRun[0].w,
      qRightArmRun[1].x, qRightArmRun[1].y, qRightArmRun[1].z, qRightArmRun[1].w,
      qRightArmRun[2].x, qRightArmRun[2].y, qRightArmRun[2].z, qRightArmRun[2].w
    ]),
    new THREE.QuaternionKeyframeTrack('Pelvis/RightLeg.quaternion', [0, 0.5, 1.0], [
      qLeftArmRun[0].x, qLeftArmRun[0].y, qLeftArmRun[0].z, qLeftArmRun[0].w,
      qLeftArmRun[1].x, qLeftArmRun[1].y, qLeftArmRun[1].z, qLeftArmRun[1].w,
      qLeftArmRun[2].x, qLeftArmRun[2].y, qLeftArmRun[2].z, qLeftArmRun[2].w
    ])
  ]);
  actions['run'] = mixer.clipAction(runClip);

  // 3. SKYDIVE CLIP (Horizontal belly-to-earth spread-eagle pose)
  const qLeftArmSky = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 1.2);
  const qRightArmSky = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -1.2);
  const qLegSky = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.4);
  const skydiveClip = new THREE.AnimationClip('skydive', 1.0, [
    new THREE.QuaternionKeyframeTrack('Pelvis/Chest/LeftArm.quaternion', [0, 1], [
      qLeftArmSky.x, qLeftArmSky.y, qLeftArmSky.z, qLeftArmSky.w,
      qLeftArmSky.x, qLeftArmSky.y, qLeftArmSky.z, qLeftArmSky.w
    ]),
    new THREE.QuaternionKeyframeTrack('Pelvis/Chest/RightArm.quaternion', [0, 1], [
      qRightArmSky.x, qRightArmSky.y, qRightArmSky.z, qRightArmSky.w,
      qRightArmSky.x, qRightArmSky.y, qRightArmSky.z, qRightArmSky.w
    ]),
    new THREE.QuaternionKeyframeTrack('Pelvis/LeftLeg.quaternion', [0, 1], [
      qLegSky.x, qLegSky.y, qLegSky.z, qLegSky.w,
      qLegSky.x, qLegSky.y, qLegSky.z, qLegSky.w
    ]),
    new THREE.QuaternionKeyframeTrack('Pelvis/RightLeg.quaternion', [0, 1], [
      qLegSky.x, qLegSky.y, qLegSky.z, qLegSky.w,
      qLegSky.x, qLegSky.y, qLegSky.z, qLegSky.w
    ])
  ]);
  actions['skydive'] = mixer.clipAction(skydiveClip);

  // 4. PARACHUTE CLIP (Arms raised holding toggles, legs dangling)
  const qArmChute = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -2.4);
  const parachuteClip = new THREE.AnimationClip('parachute', 1.0, [
    new THREE.QuaternionKeyframeTrack('Pelvis/Chest/LeftArm.quaternion', [0, 1], [
      qArmChute.x, qArmChute.y, qArmChute.z, qArmChute.w,
      qArmChute.x, qArmChute.y, qArmChute.z, qArmChute.w
    ]),
    new THREE.QuaternionKeyframeTrack('Pelvis/Chest/RightArm.quaternion', [0, 1], [
      qArmChute.x, qArmChute.y, qArmChute.z, qArmChute.w,
      qArmChute.x, qArmChute.y, qArmChute.z, qArmChute.w
    ])
  ]);
  actions['parachute'] = mixer.clipAction(parachuteClip);

  // 5. LANDING CLIP (Free Fire signature impact squash -> knee bend -> crouch touch -> stand up)
  const landTimes = [0, 0.25, 0.6, 1.2];
  const landPelvisPos = [
    0, 0.95, 0,
    0, 0.42, 0,  // Deep squash impact
    0, 0.55, 0,  // Recovery crouch
    0, 0.95, 0   // Stand ready
  ];
  const qKneeBend = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 1.2);
  const qKneeRest = new THREE.Quaternion();
  const landingClip = new THREE.AnimationClip('landing', 1.2, [
    new THREE.VectorKeyframeTrack('Pelvis.position', landTimes, landPelvisPos),
    new THREE.QuaternionKeyframeTrack('Pelvis/LeftLeg.quaternion', landTimes, [
      qKneeRest.x, qKneeRest.y, qKneeRest.z, qKneeRest.w,
      qKneeBend.x, qKneeBend.y, qKneeBend.z, qKneeBend.w,
      qKneeBend.x * 0.7, qKneeBend.y * 0.7, qKneeBend.z * 0.7, qKneeBend.w,
      qKneeRest.x, qKneeRest.y, qKneeRest.z, qKneeRest.w
    ]),
    new THREE.QuaternionKeyframeTrack('Pelvis/RightLeg.quaternion', landTimes, [
      qKneeRest.x, qKneeRest.y, qKneeRest.z, qKneeRest.w,
      qKneeBend.x, qKneeBend.y, qKneeBend.z, qKneeBend.w,
      qKneeBend.x * 0.7, qKneeBend.y * 0.7, qKneeBend.z * 0.7, qKneeBend.w,
      qKneeRest.x, qKneeRest.y, qKneeRest.z, qKneeRest.w
    ])
  ]);
  actions['landing'] = mixer.clipAction(landingClip);

  // 6. CROUCH CLIP
  const crouchClip = new THREE.AnimationClip('crouch', 1.0, [
    new THREE.VectorKeyframeTrack('Pelvis.position', [0, 1], [0, 0.55, 0, 0, 0.55, 0]),
    new THREE.QuaternionKeyframeTrack('Pelvis/LeftLeg.quaternion', [0, 1], [
      qKneeBend.x * 0.7, qKneeBend.y * 0.7, qKneeBend.z * 0.7, qKneeBend.w,
      qKneeBend.x * 0.7, qKneeBend.y * 0.7, qKneeBend.z * 0.7, qKneeBend.w
    ])
  ]);
  actions['crouch'] = mixer.clipAction(crouchClip);

  // 7. SHOOT CLIP (Recoil punch on arms)
  const qShootArm = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -1.57);
  const shootClip = new THREE.AnimationClip('shoot', 0.18, [
    new THREE.QuaternionKeyframeTrack('Pelvis/Chest/RightArm.quaternion', [0, 0.06, 0.18], [
      qShootArm.x, qShootArm.y, qShootArm.z, qShootArm.w,
      qShootArm.x * 0.9, qShootArm.y * 0.9, qShootArm.z * 0.9, qShootArm.w,
      qShootArm.x, qShootArm.y, qShootArm.z, qShootArm.w
    ])
  ]);
  actions['shoot'] = mixer.clipAction(shootClip);

  let currentAction = null;

  function play(name, fade = 0.15) {
    const lower = name.toLowerCase();
    const action = actions[lower];
    if (!action || currentAction === action) return;

    action.reset();
    action.enabled = true;

    const isLanding = lower === 'landing';
    action.setLoop(isLanding ? THREE.LoopOnce : THREE.LoopRepeat);
    action.clampWhenFinished = isLanding;

    action.fadeIn(fade);
    if (currentAction) {
      currentAction.fadeOut(fade);
    }
    action.play();
    currentAction = action;
  }

  // Play default idle animation
  play('idle');

  return {
    model: root,
    rightHand,
    mixer,
    play,
    update(delta) {
      mixer.update(delta);
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    }
  };
}
