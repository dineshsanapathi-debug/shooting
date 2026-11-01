import * as THREE from "three";

export class IslandMap {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.waterTime = 0;
    this.waterMesh = null;
    this.riverMesh = null;

    // POI Coordinates for Minimap and Navigation
    this.POIS = [
      { id: "fort", name: "Red Fort Bastion", x: 20, z: -20, type: "fort" },
      { id: "city", name: "Mumbai Tech City", x: -160, z: 150, type: "city" },
      { id: "village", name: "Gramin Village", x: 170, z: -140, type: "village" },
      { id: "desert", name: "Thar Desert Haveli", x: -180, z: -140, type: "desert" },
      { id: "mountains", name: "Himalayan Ridge", x: 0, z: -250, type: "mountain" },
      { id: "jungle", name: "Nilgiri Rainforest", x: 180, z: 130, type: "jungle" },
      { id: "military", name: "IAF Airbase", x: 120, z: 10, type: "military" },
      { id: "factory", name: "Mill Compound", x: -90, z: -50, type: "factory" },
      { id: "beach", name: "Goa Coastal Beach", x: 30, z: 240, type: "beach" },
      { id: "bridge", name: "Ganga River Bridge", x: 0, z: 20, type: "bridge" },
      { id: "warmup", name: "Warmup Training Camp", x: -330, z: -330, type: "warmup" }
    ];

    this.buildTerrain();
    this.buildOceanAndRiver();
    this.buildRoadNetwork();
    this.buildIndianFort();
    this.buildIndianVillage();
    this.buildModernCity();
    this.buildRajasthanHaveli();
    this.buildHimalayanPass();
    this.buildMilitaryAirbase();
    this.buildFactoryMill();
    this.buildGoaBeach();
    this.buildWarmupCamp();
    this.buildVegetationAndBoulders();
  }

  // Realistic Heightmap for India-Themed Island
  getHeight(x, z) {
    const dist = Math.hypot(x, z);

    // Warm-up Island Peninsula in North-West corner
    const warmupDist = Math.hypot(x - (-330), z - (-330));
    if (warmupDist < 65) {
      return 1.8 + Math.sin(x * 0.1) * 0.3;
    }

    if (dist > 380) return -4.0; // Under sea level

    let h = 2.0;

    // 1. Himalayan Mountains in the North
    if (z < -140 && Math.abs(x) < 220) {
      const mDist = Math.hypot(x, z - (-240));
      if (mDist < 140) {
        h += Math.cos((mDist / 140) * (Math.PI / 2)) * 32.0;
        h += Math.sin(x * 0.08 + z * 0.08) * 3.5;
      }
    }

    // 2. Central Fort Hill (Plateau)
    const fortDist = Math.hypot(x - 20, z - (-20));
    if (fortDist < 75) {
      h += Math.cos((fortDist / 75) * (Math.PI / 2)) * 14.5;
    }

    // 3. Thar Desert Sand Dunes (West)
    if (x < -90 && z < 20 && z > -220) {
      h += Math.sin(x * 0.04) * Math.cos(z * 0.05) * 6.5;
      h += Math.sin(x * 0.09) * 2.0;
    }

    // 4. Ganga / Yamuna River Canyon (cutting through island from z: -300 to z: 300)
    const riverDist = Math.abs(x - (Math.sin(z * 0.015) * 22));
    if (riverDist < 18 && dist < 320) {
      const depth = (1 - riverDist / 18) * 5.5;
      h -= depth;
    }

    // 5. General undulating plains & rolling hills
    h += Math.sin(x * 0.018) * Math.cos(z * 0.018) * 4.2;

    // 6. Coastal Beach slope down to ocean
    if (dist > 270) {
      const slope = (dist - 270) / 100;
      h = THREE.MathUtils.lerp(h, -2.5, slope);
    }

    return h;
  }

  buildTerrain() {
    const size = 800;
    const segments = 140;
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

      // India Biomes Vertex Coloring
      const dist = Math.hypot(x, z);

      if (y < 0.2) {
        // Coastal / River Sand
        color.setHex(0xeccc68);
      } else if (y > 22.0) {
        // Himalayan Snow Peaks
        color.setHex(0xf1f2f6);
      } else if (y > 14.0 && z < -100) {
        // Rocky Mountain Pass
        color.setHex(0x57606f);
      } else if (x < -100 && z < 20 && z > -210) {
        // Thar Golden Desert Sands
        color.setHex(0xf5cd79);
      } else if (Math.hypot(x - 20, z - (-20)) < 65) {
        // Red Fort Sandstone Hill
        color.setHex(0xc23616);
      } else if (x > 100 && z > 50) {
        // Nilgiri / Western Ghats Deep Rainforest
        color.setHex(0x10ac84);
      } else if (z > 160) {
        // Goa Tropical Coastal Grass
        color.setHex(0x2ecc71);
      } else {
        // Lush Deccan Turf
        color.setHex(0x27ae60);
      }

      colors.push(color.r, color.g, color.b);
    }

    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.08
    });

    const terrain = new THREE.Mesh(geom, mat);
    terrain.receiveShadow = true;
    this.scene.add(terrain);
    this.terrainMesh = terrain;
  }

  buildOceanAndRiver() {
    // 1. Turquoise Ocean Surrounding Island
    const oceanGeom = new THREE.PlaneGeometry(1600, 1600, 32, 32);
    oceanGeom.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x00a8ff,
      roughness: 0.15,
      metalness: 0.4,
      transparent: true,
      opacity: 0.84
    });
    this.waterMesh = new THREE.Mesh(oceanGeom, oceanMat);
    this.waterMesh.position.y = -0.4;
    this.scene.add(this.waterMesh);

    // 2. Ganga River Water Surface
    const riverGeom = new THREE.PlaneGeometry(28, 560, 8, 32);
    riverGeom.rotateX(-Math.PI / 2);
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x0984e3,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.88
    });
    this.riverMesh = new THREE.Mesh(riverGeom, riverMat);
    this.riverMesh.position.set(0, -0.15, 0);
    this.scene.add(this.riverMesh);
  }

  buildRoadNetwork() {
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x2f3542, roughness: 0.8 });

    // Highway 1: West (Desert/City) to East (Village/Jungle)
    const h1 = new THREE.Mesh(new THREE.PlaneGeometry(540, 10), roadMat);
    h1.rotateX(-Math.PI / 2);
    h1.position.set(0, 0.08, 20);
    h1.receiveShadow = true;
    this.scene.add(h1);

    // Highway 2: North (Mountains/Fort) to South (Beach)
    const h2 = new THREE.Mesh(new THREE.PlaneGeometry(10, 500), roadMat);
    h2.rotateX(-Math.PI / 2);
    h2.position.set(60, 0.09, 0);
    h2.receiveShadow = true;
    this.scene.add(h2);

    // Drivable Grand Bridges across the Ganga River
    this.createBridge(0, 20, 48, 12);   // Central Highway Bridge
    this.createBridge(0, -90, 42, 10);  // Northern Fort Bridge
  }

  createBridge(x, z, length = 45, width = 12) {
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(x, 1.6, z);

    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x747d8c, metalness: 0.6, roughness: 0.4 });
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.9 });

    // Roadway Deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(length, 1.2, width), asphaltMat);
    deck.castShadow = true;
    deck.receiveShadow = true;
    bridgeGroup.add(deck);

    // Steel Pillars / Piers in Water
    [-length / 3, length / 3].forEach(px => {
      const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 8, 8), bridgeMat);
      pier.position.set(px, -3.5, 0);
      pier.castShadow = true;
      bridgeGroup.add(pier);
    });

    // Side Railings
    [-width / 2 + 0.3, width / 2 - 0.3].forEach(rz => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 1.4, 0.4), bridgeMat);
      rail.position.set(0, 1.2, rz);
      rail.castShadow = true;
      bridgeGroup.add(rail);
    });

    this.scene.add(bridgeGroup);
  }

  // ==========================================
  // LOCATION 1: HISTORIC INDIAN RED FORT ("LAL QILA")
  // ==========================================
  buildIndianFort() {
    const x = 20;
    const z = -20;
    const baseY = this.getHeight(x, z);

    const fortMat = new THREE.MeshStandardMaterial({
      color: 0x962d22, // Iconic Red Sandstone
      roughness: 0.85
    });

    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0xf5f6fa, // White Marble Chhatri
      roughness: 0.4
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf1c40f,
      metalness: 0.9,
      roughness: 0.2
    });

    const fortGroup = new THREE.Group();
    fortGroup.position.set(x, baseY, z);

    // 1. Massive Rampart Walls (50m x 40m perimeter)
    const wallHeight = 8.5;
    const wallThick = 2.4;

    const northWall = new THREE.Mesh(new THREE.BoxGeometry(50, wallHeight, wallThick), fortMat);
    northWall.position.set(0, wallHeight / 2, -20);
    northWall.castShadow = true;
    fortGroup.add(northWall);

    const southWall = new THREE.Mesh(new THREE.BoxGeometry(50, wallHeight, wallThick), fortMat);
    southWall.position.set(0, wallHeight / 2, 20);
    southWall.castShadow = true;
    fortGroup.add(southWall);

    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallHeight, 40), fortMat);
    eastWall.position.set(25, wallHeight / 2, 0);
    eastWall.castShadow = true;
    fortGroup.add(eastWall);

    const westWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallHeight, 40), fortMat);
    westWall.position.set(-25, wallHeight / 2, 0);
    westWall.castShadow = true;
    fortGroup.add(westWall);

    // 2. 4 Round Corner Defensive Bastions (Burj)
    const bastionGeom = new THREE.CylinderGeometry(4.2, 4.8, wallHeight + 2, 16);
    [
      { bx: -25, bz: -20 },
      { bx: 25, bz: -20 },
      { bx: -25, bz: 20 },
      { bx: 25, bz: 20 }
    ].forEach(bp => {
      const bastion = new THREE.Mesh(bastionGeom, fortMat);
      bastion.position.set(bp.bx, (wallHeight + 2) / 2, bp.bz);
      bastion.castShadow = true;
      fortGroup.add(bastion);

      // Ornate Chhatri on each bastion
      this.createChhatri(fortGroup, bp.bx, wallHeight + 2, bp.bz, marbleMat, brassMat);
    });

    // 3. Grand Elephant Gate ("Hathi Pol") Arch
    const gateArch = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 3), fortMat);
    gateArch.position.set(0, 7.5, 20);
    fortGroup.add(gateArch);

    const doorOpening = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 5.5, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x2c3e50 })
    );
    doorOpening.position.set(0, 2.75, 20);
    fortGroup.add(doorOpening);

    // Central Palace Hall inside courtyard (enterable)
    const palace = new THREE.Mesh(new THREE.BoxGeometry(22, 6.5, 16), fortMat);
    palace.position.set(0, 3.25, 0);
    palace.castShadow = true;
    fortGroup.add(palace);

    // Central Grand Dome
    const dome = new THREE.Mesh(new THREE.SphereGeometry(4.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), marbleMat);
    dome.position.set(0, 6.5, 0);
    fortGroup.add(dome);

    const kalash = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.2, 8), brassMat);
    kalash.position.set(0, 11.5, 0);
    fortGroup.add(kalash);

    this.scene.add(fortGroup);

    // Colliders for Fort
    this.colliders.push({ minX: x - 27, maxX: x + 27, minZ: z - 22, maxZ: z + 22, height: wallHeight + 5 });
  }

  createChhatri(parentGroup, cx, cy, cz, stoneMat, brassMat) {
    const chhatri = new THREE.Group();
    chhatri.position.set(cx, cy, cz);

    // 4 Ornate Pillars
    const pillarGeom = new THREE.CylinderGeometry(0.18, 0.22, 3.2, 8);
    [-1.2, 1.2].forEach(px => {
      [-1.2, 1.2].forEach(pz => {
        const pillar = new THREE.Mesh(pillarGeom, stoneMat);
        pillar.position.set(px, 1.6, pz);
        chhatri.add(pillar);
      });
    });

    // Ornate Curved Canopy Dome
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.8, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), stoneMat);
    canopy.position.y = 3.2;
    chhatri.add(canopy);

    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.2, 8), brassMat);
    finial.position.y = 5.3;
    chhatri.add(finial);

    parentGroup.add(chhatri);
  }

  // ==========================================
  // LOCATION 2: INDIAN RURAL VILLAGE ("GRAMIN GAON")
  // ==========================================
  buildIndianVillage() {
    const cx = 170;
    const cz = -140;

    // Traditional village huts with terracotta roofs and verandas
    const villageHuts = [
      { ox: -18, oz: -14, w: 12, d: 10, color: 0xecf0f1 },
      { ox: 15, oz: -16, w: 14, d: 11, color: 0xf5f6fa },
      { ox: -20, oz: 16, w: 11, d: 9, color: 0xedd6c8 },
      { ox: 18, oz: 18, w: 15, d: 12, color: 0xfae5d3 },
      { ox: 0, oz: 28, w: 13, d: 10, color: 0xecf0f1 }
    ];

    villageHuts.forEach(h => {
      this.createRuralHouse(cx + h.ox, cz + h.oz, h.w, h.d, h.color);
    });

    // Village Stone Water Well (Bawdi) in central square
    const wellY = this.getHeight(cx, cz);
    const well = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.6, 1.8, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.9 })
    );
    well.position.set(cx, wellY + 0.9, cz);
    this.scene.add(well);

    // Sacred Central Peepal / Banyan tree platform (Chabutra)
    const chabutra = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 4.8, 0.8, 16),
      new THREE.MeshStandardMaterial({ color: 0xbdc3c7 })
    );
    chabutra.position.set(cx + 8, wellY + 0.4, cz + 6);
    this.scene.add(chabutra);
  }

  createRuralHouse(x, z, width = 12, depth = 10, wallColor = 0xf5f6fa) {
    const y = this.getHeight(x, z);
    const h = 4.2;
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.85 });
    const tileMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.65 }); // Terracotta tile roof
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 });

    // House Walls
    const walls = new THREE.Mesh(new THREE.BoxGeometry(width, h, depth), wallMat);
    walls.position.y = h / 2;
    walls.castShadow = true;
    group.add(walls);

    // Pitched Terracotta Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(width, depth) * 0.72, 3.2, 4), tileMat);
    roof.position.y = h + 1.6;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Front Veranda (Otla) with wooden pillars
    const veranda = new THREE.Mesh(new THREE.BoxGeometry(width, 0.4, 3.5), wallMat);
    veranda.position.set(0, 0.2, depth / 2 + 1.75);
    group.add(veranda);

    [-width / 2 + 0.6, width / 2 - 0.6].forEach(px => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, h, 8), woodMat);
      pillar.position.set(px, h / 2, depth / 2 + 3.2);
      group.add(pillar);
    });

    // Enterable doorway opening
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.0, 0.3), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    door.position.set(0, 1.5, depth / 2 + 0.1);
    group.add(door);

    this.scene.add(group);

    this.colliders.push({
      minX: x - width / 2 - 0.5,
      maxX: x + width / 2 + 0.5,
      minZ: z - depth / 2 - 0.5,
      maxZ: z + depth / 2 + 3.5,
      height: h + 3
    });
  }

  // ==========================================
  // LOCATION 3: METRO CITY ("MUMBAI / BENGALURU TECH CITY")
  // ==========================================
  buildModernCity() {
    const cx = -160;
    const cz = 150;

    const glassMat = new THREE.MeshStandardMaterial({ color: 0x34495e, metalness: 0.85, roughness: 0.2 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 0.7 });

    // High-Rise Corporate Towers (20m to 35m)
    const towers = [
      { ox: -25, oz: -25, w: 18, d: 18, h: 32 },
      { ox: 15, oz: -25, w: 16, d: 20, h: 26 },
      { ox: -20, oz: 25, w: 20, d: 16, h: 22 },
      { ox: 22, oz: 22, w: 18, d: 18, h: 36 }
    ];

    towers.forEach(t => {
      const y = this.getHeight(cx + t.ox, cz + t.oz);
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.d), glassMat);
      bldg.position.set(cx + t.ox, y + t.h / 2, cz + t.oz);
      bldg.castShadow = true;
      bldg.receiveShadow = true;
      this.scene.add(bldg);

      // Concrete Frame Bands
      const band = new THREE.Mesh(new THREE.BoxGeometry(t.w + 0.4, 1.2, t.d + 0.4), concreteMat);
      band.position.set(cx + t.ox, y + t.h * 0.5, cz + t.oz);
      this.scene.add(band);

      this.colliders.push({
        minX: cx + t.ox - t.w / 2,
        maxX: cx + t.ox + t.w / 2,
        minZ: cz + t.oz - t.d / 2,
        maxZ: cz + t.oz + t.d / 2,
        height: t.h
      });
    });
  }

  // ==========================================
  // LOCATION 4: RAJASTHAN DESERT HAVELI ("THAR SANDS")
  // ==========================================
  buildRajasthanHaveli() {
    const x = -180;
    const z = -140;
    const y = this.getHeight(x, z);

    const haveliMat = new THREE.MeshStandardMaterial({ color: 0xf5cd79, roughness: 0.85 }); // Yellow Jaisalmer sandstone

    const haveliGroup = new THREE.Group();
    haveliGroup.position.set(x, y, z);

    // Multi-tier Haveli Mansion
    const tier1 = new THREE.Mesh(new THREE.BoxGeometry(24, 7.5, 20), haveliMat);
    tier1.position.y = 3.75;
    tier1.castShadow = true;
    haveliGroup.add(tier1);

    const tier2 = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 14), haveliMat);
    tier2.position.y = 7.5 + 3;
    tier2.castShadow = true;
    haveliGroup.add(tier2);

    // Rooftop Chhatris
    [-7, 7].forEach(cx => {
      const ch = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), haveliMat);
      ch.position.set(cx, 13.5, 0);
      haveliGroup.add(ch);
    });

    this.scene.add(haveliGroup);

    this.colliders.push({ minX: x - 13, maxX: x + 13, minZ: z - 11, maxZ: z + 11, height: 16 });
  }

  // ==========================================
  // LOCATION 5: HIMALAYAN PASS ("SHIVALIK RIDGES")
  // ==========================================
  buildHimalayanPass() {
    const x = 0;
    const z = -250;
    const y = this.getHeight(x, z);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x57606f, roughness: 0.95 });

    // Mountain Watchpost Outpost
    const post = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 10), stoneMat);
    post.position.set(x, y + 4, z);
    post.castShadow = true;
    this.scene.add(post);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.8, 11.5), stoneMat);
    roof.position.set(x, y + 8.4, z);
    this.scene.add(roof);

    this.colliders.push({ minX: x - 6, maxX: x + 6, minZ: z - 6, maxZ: z + 6, height: 9 });
  }

  // ==========================================
  // LOCATION 6: IAF MILITARY AIRBASE & CANTONMENT
  // ==========================================
  buildMilitaryAirbase() {
    const x = 120;
    const z = 10;
    const y = this.getHeight(x, z);

    // Paved Runway (Length: 220m, Width: 20m)
    const runway = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 220),
      new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.8 })
    );
    runway.rotateX(-Math.PI / 2);
    runway.position.set(x, y + 0.08, z);
    runway.receiveShadow = true;
    this.scene.add(runway);

    // Military Aircraft Hangar
    const hangar = new THREE.Mesh(
      new THREE.CylinderGeometry(14, 14, 32, 16, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x747d8c, metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide })
    );
    hangar.rotation.z = Math.PI / 2;
    hangar.rotation.y = Math.PI / 2;
    hangar.position.set(x + 28, y + 7, z);
    hangar.castShadow = true;
    this.scene.add(hangar);

    // Air Traffic Control (ATC) Radar Tower
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 3.5, 18, 12),
      new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 0.6 })
    );
    tower.position.set(x - 22, y + 9, z - 30);
    this.scene.add(tower);

    // Rotating Radar Dish on top
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 12, 12, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xeb4d4b, metalness: 0.7 })
    );
    dish.position.set(x - 22, y + 19, z - 30);
    this.scene.add(dish);

    this.colliders.push({ minX: x + 14, maxX: x + 42, minZ: z - 16, maxZ: z + 16, height: 14 });
    this.colliders.push({ minX: x - 26, maxX: x - 18, minZ: z - 34, maxZ: z - 26, height: 20 });
  }

  // ==========================================
  // LOCATION 7: INDUSTRIAL MILL & FACTORY
  // ==========================================
  buildFactoryMill() {
    const x = -90;
    const z = -50;
    const y = this.getHeight(x, z);

    const factoryMat = new THREE.MeshStandardMaterial({ color: 0xb33939, roughness: 0.8 }); // Red brick mill

    const mill = new THREE.Mesh(new THREE.BoxGeometry(32, 9, 24), factoryMat);
    mill.position.set(x, y + 4.5, z);
    mill.castShadow = true;
    this.scene.add(mill);

    // Twin Brick Smokestacks
    const stackGeom = new THREE.CylinderGeometry(0.8, 1.4, 22, 12);
    const s1 = new THREE.Mesh(stackGeom, factoryMat);
    s1.position.set(x + 8, y + 15, z + 7);
    this.scene.add(s1);
    const s2 = s1.clone();
    s2.position.x = x + 4;
    this.scene.add(s2);

    this.colliders.push({ minX: x - 17, maxX: x + 17, minZ: z - 13, maxZ: z + 13, height: 12 });
  }

  // ==========================================
  // LOCATION 8: GOA COASTAL BEACH & SHACKS
  // ==========================================
  buildGoaBeach() {
    const x = 30;
    const z = 240;
    const y = this.getHeight(x, z);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.9 });
    const thatchMat = new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.95 });

    [-18, 0, 18].forEach(ox => {
      const shack = new THREE.Group();
      shack.position.set(x + ox, y, z);

      const walls = new THREE.Mesh(new THREE.BoxGeometry(8, 3.5, 6), woodMat);
      walls.position.y = 1.75;
      shack.add(walls);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(5.5, 2.2, 4), thatchMat);
      roof.position.y = 4.6;
      roof.rotation.y = Math.PI / 4;
      shack.add(roof);

      this.scene.add(shack);
      this.colliders.push({ minX: x + ox - 4.5, maxX: x + ox + 4.5, minZ: z - 3.5, maxZ: z + 3.5, height: 5 });
    });
  }

  // ==========================================
  // LOCATION 9: WARMUP TRAINING CAMP (60s LOBBY AREA)
  // ==========================================
  buildWarmupCamp() {
    const x = -330;
    const z = -330;
    const y = this.getHeight(x, z);

    const campGroup = new THREE.Group();
    campGroup.position.set(x, y, z);

    const tarmacMat = new THREE.MeshStandardMaterial({ color: 0x34495e, roughness: 0.7 });
    const tentMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.8 });

    // Training Staging Platform
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(35, 36, 0.6, 24), tarmacMat);
    pad.position.y = 0.3;
    pad.receiveShadow = true;
    campGroup.add(pad);

    // Military Squad Tents
    [-18, 18].forEach(tx => {
      const tent = new THREE.Mesh(new THREE.ConeGeometry(4.5, 4.0, 4), tentMat);
      tent.position.set(tx, 2.0, -14);
      tent.rotation.y = Math.PI / 4;
      campGroup.add(tent);
    });

    // Shooting Range Target Silhouettes
    for (let i = -3; i <= 3; i++) {
      const target = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.8, 0.1),
        new THREE.MeshBasicMaterial({ color: 0xe74c3c })
      );
      target.position.set(i * 4.5, 1.2, 22);
      campGroup.add(target);
    }

    this.scene.add(campGroup);
  }

  // ==========================================
  // VEGETATION & BOULDERS (60 FPS OPTIMIZED)
  // ==========================================
  buildVegetationAndBoulders() {
    const treeCount = 400;
    const trunkGeom = new THREE.CylinderGeometry(0.3, 0.45, 5, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x53381e, roughness: 0.9 });
    const leavesGeom = new THREE.ConeGeometry(2.6, 6.5, 7);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x1b8b00, roughness: 0.8 });

    const trunkInst = new THREE.InstancedMesh(trunkGeom, trunkMat, treeCount);
    const leavesInst = new THREE.InstancedMesh(leavesGeom, leavesMat, treeCount);

    trunkInst.castShadow = true;
    leavesInst.castShadow = true;

    const dummy = new THREE.Object3D();
    let valid = 0;

    for (let i = 0; i < treeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 25 + Math.random() * 320;
      const tx = Math.cos(angle) * r;
      const tz = Math.sin(angle) * r;
      const ty = this.getHeight(tx, tz);

      // Don't place trees in desert or deep water
      if (ty > 0.8 && ty < 21.0 && !(tx < -100 && tz < 20 && tz > -210)) {
        const s = 0.8 + Math.random() * 0.5;

        dummy.position.set(tx, ty + 2.5 * s, tz);
        dummy.scale.set(s, s, s);
        dummy.rotation.set((Math.random() - 0.5) * 0.1, Math.random() * Math.PI, (Math.random() - 0.5) * 0.1);
        dummy.updateMatrix();
        trunkInst.setMatrixAt(valid, dummy.matrix);

        dummy.position.set(tx, ty + (5.0 + 3.0) * s, tz);
        dummy.updateMatrix();
        leavesInst.setMatrixAt(valid, dummy.matrix);

        valid++;
      }
    }

    trunkInst.count = valid;
    leavesInst.count = valid;
    this.scene.add(trunkInst);
    this.scene.add(leavesInst);
  }

  checkCollision(x, z, radius = 0.6) {
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
      this.waterMesh.position.y = -0.4 + Math.sin(this.waterTime * 1.2) * 0.12;
    }
  }
}
