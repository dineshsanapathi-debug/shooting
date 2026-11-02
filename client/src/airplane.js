// ====================================================================
// FREE FIRE BHARAT 3D - AIRPLANE SYSTEM
// Military Cargo Transport Aircraft flying at altitude 160m with jump ejection
// ====================================================================

import * as THREE from 'three';
import { sounds } from './audio.js';

export function createMilitaryAirplane(scene) {
  const planeGroup = new THREE.Group();
  planeGroup.name = 'MilitaryCargoAircraft';

  // Fuselage Body
  const bodyGeo = new THREE.CylinderGeometry(4.5, 4.5, 38, 16);
  bodyGeo.rotateX(Math.PI / 2);
  const camoMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.5,
    metalness: 0.4
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, camoMat);
  bodyMesh.castShadow = true;
  planeGroup.add(bodyMesh);

  // Cockpit Nose Cone
  const noseGeo = new THREE.ConeGeometry(4.5, 9, 16);
  noseGeo.rotateX(-Math.PI / 2);
  const noseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
  const noseMesh = new THREE.Mesh(noseGeo, noseMat);
  noseMesh.position.z = 23.5;
  planeGroup.add(noseMesh);

  // Main Wings (Span 46m)
  const wingGeo = new THREE.BoxGeometry(46, 0.8, 8);
  const wingMesh = new THREE.Mesh(wingGeo, camoMat);
  wingMesh.position.set(0, 1.2, 4);
  wingMesh.castShadow = true;
  planeGroup.add(wingMesh);

  // Vertical Tail Fin
  const tailGeo = new THREE.BoxGeometry(1.2, 10, 8);
  const tailMesh = new THREE.Mesh(tailGeo, camoMat);
  tailMesh.position.set(0, 6.5, -16);
  planeGroup.add(tailMesh);

  // Horizontal Tail Stabilizers
  const stabGeo = new THREE.BoxGeometry(16, 0.6, 5);
  const stabMesh = new THREE.Mesh(stabGeo, camoMat);
  stabMesh.position.set(0, 3, -16);
  planeGroup.add(stabMesh);

  // Twin Turboprop Engines & Spinners
  const engines = [];
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
  const propMat = new THREE.MeshBasicMaterial({ color: 0xffbe0b, transparent: true, opacity: 0.7 });

  [-12, 12].forEach((xOff) => {
    const nacelleGeo = new THREE.CylinderGeometry(1.8, 1.8, 8, 12);
    nacelleGeo.rotateX(Math.PI / 2);
    const nacelle = new THREE.Mesh(nacelleGeo, engineMat);
    nacelle.position.set(xOff, 0.2, 5);
    planeGroup.add(nacelle);

    // Propeller Disc
    const propGeo = new THREE.BoxGeometry(7, 0.3, 0.1);
    const prop = new THREE.Mesh(propGeo, propMat);
    prop.position.set(xOff, 0.2, 9.2);
    planeGroup.add(prop);
    engines.push(prop);
  });

  // Navigation Wing Lights (Red Left, Green Right)
  const redLight = new THREE.PointLight(0xff0055, 3, 20);
  redLight.position.set(-23, 1.2, 4);
  planeGroup.add(redLight);

  const greenLight = new THREE.PointLight(0x00f5d4, 3, 20);
  greenLight.position.set(23, 1.2, 4);
  planeGroup.add(greenLight);

  // Flight Route across Bharat Island
  // From South (z = 450) to North (z = -450), crossing x = 0 at altitude 160m
  const startPos = new THREE.Vector3(0, 160, 440);
  const endPos = new THREE.Vector3(0, 160, -440);
  const flightDuration = 32; // 32 seconds total flyover
  let flightTimer = 0;
  let active = false;
  let hasPlayerJumped = false;

  planeGroup.position.copy(startPos);
  planeGroup.rotation.y = Math.PI; // Heading North
  planeGroup.visible = false;
  scene.add(planeGroup);

  return {
    group: planeGroup,
    altitude: 160,
    isActive() { return active; },
    hasJumped() { return hasPlayerJumped; },
    setJumped(val) { hasPlayerJumped = val; },

    startFlight() {
      active = true;
      hasPlayerJumped = false;
      flightTimer = 0;
      planeGroup.position.copy(startPos);
      planeGroup.visible = true;
      sounds.startAirplaneEngine();
    },

    stopFlight() {
      active = false;
      planeGroup.visible = false;
      sounds.stopAirplaneEngine();
    },

    update(delta, onAutoJump) {
      if (!active) return;

      flightTimer += delta;
      const progress = Math.min(flightTimer / flightDuration, 1.0);

      // Spin propellers
      engines.forEach((p) => (p.rotation.z += delta * 35));

      // Interpolate flight position
      planeGroup.position.lerpVectors(startPos, endPos, progress);

      // Gentle aerodynamic banking/pitch
      planeGroup.rotation.z = Math.sin(flightTimer * 1.5) * 0.02;

      // Telemetry updates for UI
      const hudSpeed = 220; // km/h
      const hudProgressPct = Math.floor(progress * 100);

      const pb = document.getElementById('flightProgressBarFill');
      if (pb) pb.style.width = hudProgressPct + '%';

      // Auto-jump player before flight ends if they haven't manually jumped
      if (progress >= 0.88 && !hasPlayerJumped) {
        if (typeof onAutoJump === 'function') {
          onAutoJump(planeGroup.position.clone());
        }
      }

      if (progress >= 1.0) {
        this.stopFlight();
      }
    }
  };
}

