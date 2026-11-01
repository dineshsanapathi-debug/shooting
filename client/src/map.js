import * as THREE from "three";

export class IslandMap {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.waterTime = 0;
    this.waterMesh = null;

    this.buildTerrain();
    this.buildOcean();
    this.buildRoads();
    this.buildCompounds();
    this.buildInstancedVegetation();
  }

  // Height function for terrain
  getHeight(x, z) {
    const dist = Math.hypot(x, z);
    if (dist > 380) return -4; // under sea level

    // Rolling tropical hills
    let h = Math.sin(x * 0.012) * Math.cos(z * 0.012) * 5;
    h += Math.sin(x * 0.03 + z * 0.02) * 3;

    // Peak mountain in north-west
    const peakDist = Math.hypot(x - (-110), z - (-130));
    if (peakDist < 90) {
      h += Math.cos((peakDist / 90) * (Math.PI / 2)) * 26;
    }

    // Coastal beaches slope down to ocean
    if (dist > 280) {
      const beachBlend = (dist - 280) / 100;
      h = THREE.MathUtils.lerp(h, -2, beachBlend);
    }

    return Math.max(-4, h);
  }

  buildTerrain() {
    const segments = 120;
    const size = 800;
    const geom = new THREE.PlaneGeometry(size, size, segments, segments);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const colors = [];
    const color = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.getHeight(x, z);
      pos.setY(i, y);

      // Tropical biome coloring based on altitude
      if (y < 0.5) {
        // Sandy beach
        color.setHex(0xeccc68);
      } else if (y > 18) {
        // Mountain rocky peak
        color.setHex(0x57606f);
      } else if (y > 8) {
        // Highlands grass
        color.setHex(0x2ed573);
      } else {
        // Lush lowland turf
        color.setHex(0x20bf6b);
      }
      colors.push(color.r, color.g, color.b);
    }

    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.05
    });

    const terrain = new THREE.Mesh(geom, mat);
    terrain.receiveShadow = true;
    this.scene.add(terrain);
    this.terrainMesh = terrain;
  }

  buildOcean() {
    const waterGeom = new THREE.PlaneGeometry(1600, 1600, 32, 32);
    waterGeom.rotateX(-Math.PI / 2);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x00a8ff,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.82
    });

    this.waterMesh = new THREE.Mesh(waterGeom, waterMat);
    this.waterMesh.position.y = -0.5;
    this.scene.add(this.waterMesh);
  }

  buildRoads() {
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x2f3542,
      roughness: 0.8
    });

    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.6
    });

    // Main East-West Highway
    const road1 = new THREE.Mesh(new THREE.PlaneGeometry(12, 550), roadMat);
    road1.rotateX(-Math.PI / 2);
    road1.position.set(0, 0.06, 0);
    road1.receiveShadow = true;
    this.scene.add(road1);

    // North-South Crossroad
    const road2 = new THREE.Mesh(new THREE.PlaneGeometry(550, 12), roadMat);
    road2.rotateX(-Math.PI / 2);
    road2.position.set(0, 0.07, 0);
    road2.receiveShadow = true;
    this.scene.add(road2);

    // Center Roundabout / Plaza
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(26, 24), roadMat);
    plaza.rotateX(-Math.PI / 2);
    plaza.position.set(0, 0.08, 0);
    plaza.receiveShadow = true;
    this.scene.add(plaza);

    const islandCenter = new THREE.Mesh(new THREE.CircleGeometry(8, 24), new THREE.MeshStandardMaterial({ color: 0x2ed573 }));
    islandCenter.rotateX(-Math.PI / 2);
    islandCenter.position.set(0, 0.12, 0);
    this.scene.add(islandCenter);
  }

  buildCompounds() {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, roughness: 0.85 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xc23616, roughness: 0.7 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x718093, metalness: 0.6, roughness: 0.4 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.9 });

    // Compound 1: Central Military Base (0, 0)
    this.createMilitaryHangar(25, -25, 24, 34, 11);
    this.createWatchtower(-35, 30);
    this.createWatchtower(35, 45);
    this.createResidentialHouse(-25, -35, 14, 12, 2);

    // Compound 2: Factory Zone (120, -100)
    this.createFactory(120, -100);
    this.createShippingContainerStack(145, -85);
    this.createShippingContainerStack(95, -115);

    // Compound 3: Tropical Village (-140, 110)
    this.createResidentialHouse(-130, 100, 15, 12, 1);
    this.createResidentialHouse(-160, 110, 18, 14, 2);
    this.createResidentialHouse(-135, 135, 12, 12, 1);
    this.createWatchtower(-170, 130);

    // Compound 4: Peak Outpost (-110, -130)
    const peakY = this.getHeight(-110, -130);
    this.createWatchtower(-110, -130, peakY);
    this.createResidentialHouse(-130, -115, 16, 12, 1, peakY);

    // Compound 5: Bimasakti Strip (130, 120)
    this.createResidentialHouse(120, 110, 16, 14, 2);
    this.createResidentialHouse(145, 135, 14, 12, 1);
    this.createShippingContainerStack(115, 140);
  }

  createResidentialHouse(x, z, width = 14, depth = 12, stories = 1, baseAltitude = 0) {
    const y = (baseAltitude || this.getHeight(x, z));
    const h = stories * 4.2;

    const houseGroup = new THREE.Group();
    houseGroup.position.set(x, y + h / 2, z);

    // Walls
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(width, h, depth),
      new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.85 })
    );
    walls.castShadow = true;
    walls.receiveShadow = true;
    houseGroup.add(walls);

    // Pitched Roof
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(width, depth) * 0.72, 3.5, 4),
      new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.6 })
    );
    roof.position.y = h / 2 + 1.75;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    houseGroup.add(roof);

    // Doorway opening highlight
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 3.0, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x2d3436 })
    );
    door.position.set(0, -h / 2 + 1.5, depth / 2 + 0.1);
    houseGroup.add(door);

    this.scene.add(houseGroup);

    // Add Box Collider
    this.colliders.push({
      minX: x - width / 2 - 0.5,
      maxX: x + width / 2 + 0.5,
      minZ: z - depth / 2 - 0.5,
      maxZ: z + depth / 2 + 0.5,
      height: h + 3
    });
  }

  createMilitaryHangar(x, z, width = 24, depth = 34, height = 11) {
    const y = this.getHeight(x, z);
    const hangar = new THREE.Mesh(
      new THREE.CylinderGeometry(width / 2, width / 2, depth, 16, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x747d8c, metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide })
    );
    hangar.rotation.z = Math.PI / 2;
    hangar.rotation.y = Math.PI / 2;
    hangar.position.set(x, y + width / 4, z);
    hangar.castShadow = true;
    hangar.receiveShadow = true;
    this.scene.add(hangar);

    this.colliders.push({
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
      height
    });
  }

  createWatchtower(x, z, baseAltitude = 0) {
    const y = (baseAltitude || this.getHeight(x, z));
    const tower = new THREE.Group();
    tower.position.set(x, y, z);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x474787, metalness: 0.6, roughness: 0.4 });

    // 4 Steel legs
    const legGeom = new THREE.CylinderGeometry(0.18, 0.22, 12, 6);
    [-2.2, 2.2].forEach(lx => {
      [-2.2, 2.2].forEach(lz => {
        const leg = new THREE.Mesh(legGeom, metalMat);
        leg.position.set(lx, 6, lz);
        leg.castShadow = true;
        tower.add(leg);
      });
    });

    // Sniper Nest Platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 6), metalMat);
    platform.position.y = 12;
    platform.castShadow = true;
    tower.add(platform);

    // Railing
    const rail = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.2, 5.8), new THREE.MeshStandardMaterial({ color: 0x2c2c54, wireframe: true }));
    rail.position.y = 12.8;
    tower.add(rail);

    // Canopy Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.3, 6.6), metalMat);
    roof.position.y = 15;
    tower.add(roof);

    this.scene.add(tower);

    this.colliders.push({
      minX: x - 3,
      maxX: x + 3,
      minZ: z - 3,
      maxZ: z + 3,
      height: 15
    });
  }

  createFactory(x, z) {
    const y = this.getHeight(x, z);
    const factory = new THREE.Mesh(
      new THREE.BoxGeometry(32, 9, 26),
      new THREE.MeshStandardMaterial({ color: 0x57606f, roughness: 0.7 })
    );
    factory.position.set(x, y + 4.5, z);
    factory.castShadow = true;
    factory.receiveShadow = true;
    this.scene.add(factory);

    // Smokestacks
    const stackGeom = new THREE.CylinderGeometry(0.9, 1.2, 16, 12);
    const stackMat = new THREE.MeshStandardMaterial({ color: 0xa4b0be, roughness: 0.8 });
    const s1 = new THREE.Mesh(stackGeom, stackMat);
    s1.position.set(x + 10, y + 14, z + 8);
    this.scene.add(s1);
    const s2 = s1.clone();
    s2.position.x = x + 6;
    this.scene.add(s2);

    this.colliders.push({
      minX: x - 17,
      maxX: x + 17,
      minZ: z - 14,
      maxZ: z + 14,
      height: 12
    });
  }

  createShippingContainerStack(x, z) {
    const colors = [0xeb4d4b, 0x22a6b3, 0xf0932b, 0x30336b];
    for (let i = 0; i < 4; i++) {
      const cy = i * 2.8;
      const ox = (i % 2) * 3.5 - 1.75;
      const oz = Math.floor(i / 2) * 6 - 3;
      const mat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.5 });
      const container = new THREE.Mesh(new THREE.BoxGeometry(3, 2.6, 7), mat);
      const groundY = this.getHeight(x + ox, z + oz);
      container.position.set(x + ox, groundY + 1.3 + (i > 1 ? 2.6 : 0), z + oz);
      container.castShadow = true;
      container.receiveShadow = true;
      this.scene.add(container);
    }
    this.colliders.push({
      minX: x - 4,
      maxX: x + 4,
      minZ: z - 7,
      maxZ: z + 7,
      height: 6
    });
  }

  buildInstancedVegetation() {
    // 1. Palm Trees & Pines with InstancedMesh for 60 FPS
    const treeCount = 350;
    const trunkGeom = new THREE.CylinderGeometry(0.3, 0.45, 4.5, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x53381e, roughness: 0.9 });
    const leavesGeom = new THREE.ConeGeometry(2.4, 6, 7);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x1e824c, roughness: 0.8 });

    const trunkInst = new THREE.InstancedMesh(trunkGeom, trunkMat, treeCount);
    const leavesInst = new THREE.InstancedMesh(leavesGeom, leavesMat, treeCount);

    trunkInst.castShadow = true;
    leavesInst.castShadow = true;

    const dummy = new THREE.Object3D();
    let validTrees = 0;

    for (let i = 0; i < treeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 25 + Math.random() * 320;
      const tx = Math.cos(angle) * r;
      const tz = Math.sin(angle) * r;
      const ty = this.getHeight(tx, tz);

      if (ty > 0.8 && ty < 22) {
        const scale = 0.8 + Math.random() * 0.5;

        // Trunk
        dummy.position.set(tx, ty + 2.25 * scale, tz);
        dummy.scale.set(scale, scale, scale);
        dummy.rotation.set((Math.random() - 0.5) * 0.1, Math.random() * Math.PI, (Math.random() - 0.5) * 0.1);
        dummy.updateMatrix();
        trunkInst.setMatrixAt(validTrees, dummy.matrix);

        // Leaves
        dummy.position.set(tx, ty + (4.5 + 2.8) * scale, tz);
        dummy.updateMatrix();
        leavesInst.setMatrixAt(validTrees, dummy.matrix);

        validTrees++;
      }
    }

    trunkInst.count = validTrees;
    leavesInst.count = validTrees;
    this.scene.add(trunkInst);
    this.scene.add(leavesInst);

    // 2. Boulders / Tactical Rocks
    const rockCount = 120;
    const rockGeom = new THREE.DodecahedronGeometry(1.5, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x57606f, roughness: 0.95 });
    const rockInst = new THREE.InstancedMesh(rockGeom, rockMat, rockCount);
    rockInst.castShadow = true;

    let validRocks = 0;
    for (let i = 0; i < rockCount; i++) {
      const rx = (Math.random() - 0.5) * 600;
      const rz = (Math.random() - 0.5) * 600;
      const ry = this.getHeight(rx, rz);
      if (ry > 0.5) {
        const s = 0.8 + Math.random() * 1.4;
        dummy.position.set(rx, ry + s * 0.7, rz);
        dummy.scale.set(s * (0.8 + Math.random() * 0.4), s, s * (0.8 + Math.random() * 0.4));
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        dummy.updateMatrix();
        rockInst.setMatrixAt(validRocks, dummy.matrix);
        validRocks++;

        this.colliders.push({
          minX: rx - s * 1.2,
          maxX: rx + s * 1.2,
          minZ: rz - s * 1.2,
          maxZ: rz + s * 1.2,
          height: s * 1.5
        });
      }
    }
    rockInst.count = validRocks;
    this.scene.add(rockInst);
  }

  // Check collision for player/vehicle
  checkCollision(x, z, radius = 0.5) {
    for (const box of this.colliders) {
      if (
        x + radius > box.minX &&
        x - radius < box.maxX &&
        z + radius > box.minZ &&
        z - radius < box.maxZ
      ) {
        return true;
      }
    }
    return false;
  }

  update(delta) {
    this.waterTime += delta;
    if (this.waterMesh) {
      this.waterMesh.position.y = -0.5 + Math.sin(this.waterTime * 1.2) * 0.15;
    }
  }
}

