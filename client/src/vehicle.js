// ====================================================================
// FREE FIRE BHARAT 3D - DRIVABLE MILITARY BUGGY
// Drivable vehicle with physics, steering, headlights & interaction prompt
// ====================================================================

import * as THREE from 'three';

export function createMilitaryBuggy(scene, position = new THREE.Vector3(20, 0.8, -120)) {
  const buggy = new THREE.Group();
  buggy.name = 'MilitaryBuggy';

  // Body Chassis
  const bodyGeo = new THREE.BoxGeometry(2.4, 0.8, 4.2);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x386641, roughness: 0.6 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.6;
  body.castShadow = true;
  buggy.add(body);

  // Roll Cage Bars
  const cageGeo = new THREE.BoxGeometry(2.2, 1.2, 2.4);
  const cageMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, wireframe: true });
  const cage = new THREE.Mesh(cageGeo, cageMat);
  cage.position.set(0, 1.4, -0.2);
  buggy.add(cage);

  // 4 Wheels
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
  wheelGeo.rotateZ(Math.PI / 2);

  const wheelPositions = [
    [-1.2, 0.4, 1.4],
    [1.2, 0.4, 1.4],
    [-1.2, 0.4, -1.4],
    [1.2, 0.4, -1.4]
  ];
  const wheels = wheelPositions.map(([wx, wy, wz]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(wx, wy, wz);
    w.castShadow = true;
    buggy.add(w);
    return w;
  });

  // Headlights
  const lightL = new THREE.SpotLight(0xfff3b0, 4, 35, Math.PI / 4, 0.5);
  lightL.position.set(-0.8, 0.8, 2.1);
  lightL.target.position.set(-0.8, 0, 10);
  buggy.add(lightL, lightL.target);

  const lightR = new THREE.SpotLight(0xfff3b0, 4, 35, Math.PI / 4, 0.5);
  lightR.position.set(0.8, 0.8, 2.1);
  lightR.target.position.set(0.8, 0, 10);
  buggy.add(lightR, lightR.target);

  buggy.position.copy(position);
  scene.add(buggy);

  let speed = 0;
  let steerAngle = 0;
  let isOccupied = false;

  return {
    group: buggy,
    isOccupied() { return isOccupied; },
    setOccupied(val) { isOccupied = val; },

    update(delta, input) {
      if (!isOccupied) {
        speed *= 0.95; // idle friction
        return;
      }

      const accel = 18;
      const maxSpeed = 32;
      const turnSpeed = 2.2;

      if (input.forward) speed = Math.min(speed + accel * delta, maxSpeed);
      else if (input.backward) speed = Math.max(speed - accel * delta, -maxSpeed * 0.4);
      else speed *= 0.96; // coasting friction

      if (input.left) steerAngle += turnSpeed * delta;
      if (input.right) steerAngle -= turnSpeed * delta;

      buggy.rotation.y = steerAngle;

      const forwardVec = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), steerAngle);
      buggy.position.addScaledVector(forwardVec, speed * delta);

      // Rotate wheels
      wheels.forEach((w) => (w.rotation.x += speed * delta * 2));
    }
  };
}
