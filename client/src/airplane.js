import * as THREE from "three";

// 3D MILITARY CARGO AIRPLANE (C-130 HERCULES / AN-32 STYLE)
export class AirplaneModel {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.propellers = [];
    this.trailParticles = [];
    this.propSpeed = 35;

    this.buildAirplane();
    this.scene.add(this.group);
    this.group.visible = false;
  }

  buildAirplane() {
    const camoBodyMat = new THREE.MeshStandardMaterial({
      color: 0x3d4b3c, // Military olive drab / IAF tactical grey-green
      roughness: 0.6,
      metalness: 0.35
    });

    const underbellyMat = new THREE.MeshStandardMaterial({
      color: 0x57606f, // Light grey underbelly
      roughness: 0.7
    });

    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1e272e,
      roughness: 0.5,
      metalness: 0.8
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x48dbfb,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.75
    });

    const saffronMat = new THREE.MeshBasicMaterial({ color: 0xff9933 });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x138808 });
    const blueMat = new THREE.MeshBasicMaterial({ color: 0x000080 });

    // 1. Fuselage Body (Length: 38m)
    const fuselageGeom = new THREE.CylinderGeometry(2.8, 3.1, 34, 16);
    fuselageGeom.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuselageGeom, camoBodyMat);
    fuselage.castShadow = true;
    this.group.add(fuselage);

    // Aerodynamic Nose Radome
    const noseGeom = new THREE.SphereGeometry(2.8, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    noseGeom.rotateX(Math.PI);
    const nose = new THREE.Mesh(noseGeom, darkMetalMat);
    nose.position.z = 17;
    nose.scale.set(1, 0.9, 1.8);
    this.group.add(nose);

    // Cockpit Windows
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 3.2), glassMat);
    cockpit.position.set(0, 1.9, 14.5);
    cockpit.rotation.x = -0.35;
    this.group.add(cockpit);

    // Rear Cargo Ramp (Tapered tail)
    const tailConeGeom = new THREE.ConeGeometry(2.8, 14, 16);
    tailConeGeom.rotateX(-Math.PI / 2);
    const tailCone = new THREE.Mesh(tailConeGeom, camoBodyMat);
    tailCone.position.set(0, 0.6, -21);
    this.group.add(tailCone);

    // Open Cargo Drop Bay Door
    const cargoDoor = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 4.5), darkMetalMat);
    cargoDoor.position.set(0, -1.2, -15);
    cargoDoor.rotation.x = 0.35;
    this.group.add(cargoDoor);

    // Interior Cargo Bay Jump Light (Green jump alert light)
    const jumpLight = new THREE.PointLight(0x2ed573, 4, 15);
    jumpLight.position.set(0, 0.8, -14);
    this.group.add(jumpLight);

    // 2. High-Mounted Main Wings (Span: 46m)
    const wingGeom = new THREE.BoxGeometry(46, 0.45, 6.2);
    const wing = new THREE.Mesh(wingGeom, camoBodyMat);
    wing.position.set(0, 2.7, 2);
    wing.castShadow = true;
    this.group.add(wing);

    // Upward Winglet Tips
    [-23, 23].forEach((wx, idx) => {
      const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 4.2), camoBodyMat);
      winglet.position.set(wx, 3.6, 2);
      winglet.rotation.z = idx === 0 ? 0.3 : -0.3;
      this.group.add(winglet);
    });

    // 3. Indian Air Force Tricolor Fin Flash & Roundel Decals
    const createRoundel = (radius = 1.2) => {
      const rGroup = new THREE.Group();
      const ringS = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), saffronMat);
      const ringW = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.66, 24), whiteMat);
      const ringG = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.33, 24), greenMat);
      ringW.position.z = 0.01;
      ringG.position.z = 0.02;
      rGroup.add(ringS, ringW, ringG);
      return rGroup;
    };

    // Wings Roundels (Top of left & right wings)
    [-14, 14].forEach(rx => {
      const r = createRoundel(1.6);
      r.rotation.x = -Math.PI / 2;
      r.position.set(rx, 2.95, 2);
      this.group.add(r);
    });

    // 4. Massive T-Tail Vertical Stabilizer & Rudder
    const vertFin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9.5, 7.5), camoBodyMat);
    vertFin.position.set(0, 6.5, -20);
    vertFin.rotation.x = -0.35;
    vertFin.castShadow = true;
    this.group.add(vertFin);

    // Tail Tricolor Fin Flash (Saffron, White, Green vertical bars)
    const finFlash = new THREE.Group();
    const barS = new THREE.Mesh(new THREE.BoxGeometry(0.44, 2.5, 0.6), saffronMat);
    const barW = new THREE.Mesh(new THREE.BoxGeometry(0.44, 2.5, 0.6), whiteMat);
    const barG = new THREE.Mesh(new THREE.BoxGeometry(0.44, 2.5, 0.6), greenMat);
    barS.position.z = 0.6;
    barG.position.z = -0.6;
    finFlash.add(barS, barW, barG);
    finFlash.position.set(0, 8.2, -21);
    this.group.add(finFlash);

    // Horizontal Elevators
    const elev = new THREE.Mesh(new THREE.BoxGeometry(16, 0.35, 3.8), camoBodyMat);
    elev.position.set(0, 10.5, -23.5);
    this.group.add(elev);

    // 5. 4 Turboprop Engine Nacelles & Rotating Propellers
    const enginePositions = [-15, -7.5, 7.5, 15];
    enginePositions.forEach(ex => {
      const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 6.5, 12), darkMetalMat);
      nacelle.rotation.x = Math.PI / 2;
      nacelle.position.set(ex, 1.9, 3.5);
      nacelle.castShadow = true;
      this.group.add(nacelle);

      // Propeller Hub
      const propHub = new THREE.Group();
      propHub.position.set(ex, 1.9, 6.8);

      const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 12), darkMetalMat);
      spinner.rotation.x = Math.PI / 2;
      propHub.add(spinner);

      // Semi-transparent rotating Propeller Blur Disc (Fast motion look)
      const propDisc = new THREE.Mesh(
        new THREE.CircleGeometry(2.3, 16),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide
        })
      );
      propHub.add(propDisc);

      // 4 Physical Propeller Blades
      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 0.08), darkMetalMat);
        blade.position.y = 1.1;
        const bGroup = new THREE.Group();
        bGroup.rotation.z = (b * Math.PI) / 2;
        bGroup.add(blade);
        propHub.add(bGroup);
      }

      this.group.add(propHub);
      this.propellers.push(propHub);
    });

    // Scale entire plane to grand military scale
    this.group.scale.set(1.4, 1.4, 1.4);
  }

  update(delta, flightProgress, flightPath) {
    if (!flightPath) return;

    // Spin Propellers
    this.propellers.forEach(p => {
      p.rotation.z += this.propSpeed * delta;
    });

    // Interpolate plane position along flight path
    const p = Math.max(0, Math.min(1, flightProgress));
    const currX = flightPath.startX + (flightPath.endX - flightPath.startX) * p;
    const currZ = flightPath.startZ + (flightPath.endZ - flightPath.startZ) * p;
    const currY = flightPath.altitude || 115;

    this.group.position.set(currX, currY, currZ);

    // Calculate heading rotation along path
    const dx = flightPath.endX - flightPath.startX;
    const dz = flightPath.endZ - flightPath.startZ;
    const heading = Math.atan2(dx, dz);
    this.group.rotation.set(0, heading, 0);

    // Slight aerodynamic bank/bob
    this.group.position.y = currY + Math.sin(flightProgress * 15) * 0.8;
  }
}

// 3D PARACHUTE CANOPY MODEL
export class ParachuteModel {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.buildParachute();
    this.scene.add(this.group);
    this.group.visible = false;
  }

  buildParachute() {
    // Saffron, White, Emerald Green tricolor striped canopy
    const segments = 16;
    const canopyGeom = new THREE.SphereGeometry(3.6, segments, 10, 0, Math.PI * 2, 0, Math.PI / 2.2);

    // Color vertices by slice to create vibrant multi-panel goring
    const colors = [];
    const color = new THREE.Color();
    const pos = canopyGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const angle = Math.atan2(vz, vx);
      const slice = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 8) % 3;

      if (slice === 0) color.setHex(0xff9933); // Saffron
      else if (slice === 1) color.setHex(0xf5f6fa); // White
      else color.setHex(0x138808); // Emerald Green

      colors.push(color.r, color.g, color.b);
    }
    canopyGeom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const canopyMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.5,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    const canopyMesh = new THREE.Mesh(canopyGeom, canopyMat);
    canopyMesh.position.y = 5.2;
    canopyMesh.castShadow = true;
    this.group.add(canopyMesh);

    // 8 Suspension Rigging Cords
    const lineMat = new THREE.LineBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 8; i++) {
      const theta = (i / 8) * Math.PI * 2;
      const lx = Math.cos(theta) * 3.4;
      const lz = Math.sin(theta) * 3.4;

      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(lx, 5.2, lz),
        new THREE.Vector3(0, 0.4, 0) // Harness attachment point on character backpack
      ]);
      const cord = new THREE.Line(lineGeom, lineMat);
      this.group.add(cord);
    }
  }

  attachTo(playerPos, yaw = 0, steerX = 0, steerZ = 0) {
    this.group.position.set(playerPos.x, playerPos.y + 0.8, playerPos.z);
    this.group.rotation.y = yaw;

    // Dynamic tilt based on horizontal steering
    const targetTiltX = steerZ * 0.25;
    const targetTiltZ = -steerX * 0.25;
    this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, targetTiltX, 0.2);
    this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, targetTiltZ, 0.2);
  }

  setVisible(visible) {
    this.group.visible = visible;
  }
}
