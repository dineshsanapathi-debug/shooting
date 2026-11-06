import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();

const characters = [
  {
    id: "soldier1",
    name: "Hayato",
    role: "Bushido Assault",
    model: "/models/characters/soldier1.glb",
    color: 0x2563eb,
    accent: 0x38bdf8,
    badge: "⚔️"
  },
  {
    id: "soldier2",
    name: "Kelly",
    role: "Dash Speed",
    model: "/models/characters/soldier2.glb",
    color: 0xdc2626,
    accent: 0xf87171,
    badge: "⚡"
  },
  {
    id: "soldier3",
    name: "Alok",
    role: "Drop the Beat",
    model: "/models/characters/soldier3.glb",
    color: 0x9333ea,
    accent: 0xc084fc,
    badge: "🎧"
  },
  {
    id: "soldier4",
    name: "Chrono",
    role: "Time Turner Shield",
    model: "/models/characters/soldier4.glb",
    color: 0x16a34a,
    accent: 0x4ade80,
    badge: "🛡️"
  }
];

export function getCharacters() {
  return characters;
}

export async function loadCharacter(characterId) {
  const character = characters.find(
    item => item.id === characterId
  );

  if (!character) {
    throw new Error("Character not found");
  }

  try {
    const gltf = await loader.loadAsync(character.model);
    const model = gltf.scene;

    model.traverse(object => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    const mixer = new THREE.AnimationMixer(model);
    const actions = {};

    gltf.animations.forEach(clip => {
      actions[clip.name.toLowerCase()] = mixer.clipAction(clip);
    });

    let currentAction = null;

    function playAnimation(name, fade = 0.2) {
      const nextAction = actions[name.toLowerCase()];
      if (!nextAction || currentAction === nextAction) return;

      nextAction.reset();
      nextAction.enabled = true;
      nextAction.setLoop(THREE.LoopRepeat);
      nextAction.fadeIn(fade);
      nextAction.play();

      if (currentAction) {
        currentAction.fadeOut(fade);
      }

      currentAction = nextAction;
    }

    function update(delta) {
      mixer.update(delta);
    }

    function dispose() {
      mixer.stopAllAction();
    }

    playAnimation("idle");

    return {
      model,
      mixer,
      actions,
      playAnimation,
      update,
      dispose
    };
  } catch (err) {
    // Graceful rigged 3D operator fallback with AnimationMixer if GLB is not yet on disk
    return createRiggedFallback(character);
  }
}

function createRiggedFallback(character) {
  const root = new THREE.Group();
  root.name = "Character_" + character.id;

  // Materials
  const bodyMat = new THREE.MeshStandardMaterial({
    color: character.color,
    roughness: 0.5
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: character.accent,
    roughness: 0.4
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xd4a373,
    roughness: 0.8
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.7
  });

  // Torso / Chest
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), bodyMat);
  torso.position.y = 1.05;
  torso.castShadow = true;
  root.add(torso);

  // Tactical Vest
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.5, 0.36), darkMat);
  vest.position.set(0, 1.05, 0);
  root.add(vest);

  // Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.62, 0);
  root.add(headGroup);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.28), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Tactical Visor / Helmet
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), accentMat);
  visor.position.set(0, 0.05, 0.02);
  headGroup.add(visor);

  // Limbs
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.16), bodyMat);
  leftArm.position.set(0.38, 1.0, 0);
  leftArm.castShadow = true;
  root.add(leftArm);

  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.16), bodyMat);
  rightArm.position.set(-0.38, 1.0, 0);
  rightArm.castShadow = true;
  root.add(rightArm);

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), darkMat);
  leftLeg.position.set(0.16, 0.35, 0);
  leftLeg.castShadow = true;
  root.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), darkMat);
  rightLeg.position.set(-0.16, 0.35, 0);
  rightLeg.castShadow = true;
  root.add(rightLeg);

  // AnimationMixer with procedural keyframe tracks
  const mixer = new THREE.AnimationMixer(root);
  const actions = {};

  const idleClip = new THREE.AnimationClip("idle", 1.5, [
    new THREE.VectorKeyframeTrack(".position", [0, 0.75, 1.5], [0, 0, 0, 0, 0.03, 0, 0, 0, 0])
  ]);
  actions["idle"] = mixer.clipAction(idleClip);

  const walkClip = new THREE.AnimationClip("walk", 0.8, [
    new THREE.VectorKeyframeTrack(".position", [0, 0.4, 0.8], [0, 0, 0, 0, 0.06, 0, 0, 0, 0])
  ]);
  actions["walk"] = mixer.clipAction(walkClip);

  const runClip = new THREE.AnimationClip("run", 0.5, [
    new THREE.VectorKeyframeTrack(".position", [0, 0.25, 0.5], [0, 0, 0, 0, 0.1, 0, 0, 0, 0])
  ]);
  actions["run"] = mixer.clipAction(runClip);

  const jumpClip = new THREE.AnimationClip("jump", 1.0, [
    new THREE.VectorKeyframeTrack(".scale", [0, 0.5, 1.0], [1, 1, 1, 0.9, 1.15, 0.9, 1, 1, 1])
  ]);
  actions["jump"] = mixer.clipAction(jumpClip);

  const crouchClip = new THREE.AnimationClip("crouch", 1.0, [
    new THREE.VectorKeyframeTrack(".scale", [0, 1.0], [1, 0.7, 1, 1, 0.7, 1])
  ]);
  actions["crouch"] = mixer.clipAction(crouchClip);

  const shootClip = new THREE.AnimationClip("shoot", 0.2, [
    new THREE.VectorKeyframeTrack(".position", [0, 0.08, 0.2], [0, 0, 0, 0, 0, -0.05, 0, 0, 0])
  ]);
  actions["shoot"] = mixer.clipAction(shootClip);

  const skydiveClip = new THREE.AnimationClip("skydive", 1.0, [
    new THREE.VectorKeyframeTrack(".scale", [0, 0.5, 1.0], [1.08, 0.92, 1.08, 1.04, 0.96, 1.04, 1.08, 0.92, 1.08])
  ]);
  actions["skydive"] = mixer.clipAction(skydiveClip);

  const parachuteClip = new THREE.AnimationClip("parachute", 1.5, [
    new THREE.VectorKeyframeTrack(".position", [0, 0.75, 1.5], [0, 0, 0, 0, -0.05, 0, 0, 0, 0])
  ]);
  actions["parachute"] = mixer.clipAction(parachuteClip);

  const landingClip = new THREE.AnimationClip("landing", 0.6, [
    new THREE.VectorKeyframeTrack(".scale", [0, 0.25, 0.6], [1, 1, 1, 1.15, 0.65, 1.15, 1, 1, 1])
  ]);
  actions["landing"] = mixer.clipAction(landingClip);

  let currentAction = null;

  function playAnimation(name, fade = 0.15) {
    const nextAction = actions[name.toLowerCase()];
    if (!nextAction || currentAction === nextAction) return;

    nextAction.reset();
    nextAction.enabled = true;
    nextAction.setLoop(THREE.LoopRepeat);
    nextAction.fadeIn(fade);
    nextAction.play();

    if (currentAction) {
      currentAction.fadeOut(fade);
    }
    currentAction = nextAction;
  }

  playAnimation("idle");

  return {
    model: root,
    mixer,
    actions,
    playAnimation,
    update(delta) {
      mixer.update(delta);
    },
    dispose() {
      mixer.stopAllAction();
    }
  };
}

