// ====================================================================
// FREE FIRE BHARAT 3D - PARACHUTE & SKYDIVING GLIDE SYSTEM
// Canopy deployment, suspension cords, aerodynamic steering & landing trigger
// ====================================================================

import * as THREE from 'three';
import { sounds } from './audio.js';

export function createParachuteRig() {
  const chuteGroup = new THREE.Group();
  chuteGroup.name = 'TricolorTacticalParachute';

  // Aerodynamic Ram-Air Rectangular / Elliptical Canopy (Free Fire style)
  const canopyGeo = new THREE.BoxGeometry(10, 1.2, 5, 8, 2, 4);
  // Curve the canopy downwards on edges
  const pos = canopyGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const curve = -(Math.pow(x / 5, 2) * 1.2 + Math.pow(z / 2.5, 2) * 0.4);
    pos.setY(i, pos.getY(i) + curve + 6.5);
  }
  canopyGeo.computeVertexNormals();

  // Indian Tricolor Accent Parachute Fabric (Saffron, White, Green)
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0xff9933, // Saffron
    roughness: 0.6,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
  canopyMesh.castShadow = true;
  chuteGroup.add(canopyMesh);

  // Center White Stripe Mesh
  const stripeGeo = new THREE.BoxGeometry(3.5, 1.25, 5.1);
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.y = 6.4;
  chuteGroup.add(stripe);

  // Suspension Riser Cords connecting canopy to operator harness
  const cordMat = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 });
  const corners = [
    [-4.5, 5.8, -2.2],
    [4.5, 5.8, -2.2],
    [-4.5, 5.8, 2.2],
    [4.5, 5.8, 2.2],
    [-1.8, 6.4, -2.4],
    [1.8, 6.4, -2.4],
    [-1.8, 6.4, 2.4],
    [1.8, 6.4, 2.4]
  ];

  corners.forEach(([cx, cy, cz]) => {
    const cordPoints = [
      new THREE.Vector3(cx, cy, cz),
      new THREE.Vector3(0, 1.2, 0) // Harness connection point
    ];
    const cordGeo = new THREE.BufferGeometry().setFromPoints(cordPoints);
    const cordLine = new THREE.Line(cordGeo, cordMat);
    chuteGroup.add(cordLine);
  });

  chuteGroup.visible = false;

  let deployed = false;
  let deployProgress = 0;

  return {
    group: chuteGroup,
    isDeployed() { return deployed; },

    deploy() {
      if (deployed) return;
      deployed = true;
      deployProgress = 0;
      chuteGroup.visible = true;
      chuteGroup.scale.set(0.1, 0.1, 0.1);
      sounds.playParachuteOpen();
    },

    cutaway() {
      deployed = false;
      chuteGroup.visible = false;
      chuteGroup.scale.set(1, 1, 1);
    },

    update(delta, steerX = 0, steerZ = 0) {
      if (!deployed) return;

      // Canopy inflation scale animation
      if (deployProgress < 1.0) {
        deployProgress += delta * 3.5;
        const s = Math.min(deployProgress, 1.0);
        chuteGroup.scale.set(s, s, s);
      }

      // Steering tilt and bank
      chuteGroup.rotation.z = THREE.MathUtils.lerp(chuteGroup.rotation.z, -steerX * 0.35, delta * 6);
      chuteGroup.rotation.x = THREE.MathUtils.lerp(chuteGroup.rotation.x, steerZ * 0.25, delta * 6);
      // Gentle wind flutter
      chuteGroup.rotation.y = Math.sin(performance.now() * 0.003) * 0.04;
    }
  };
}

