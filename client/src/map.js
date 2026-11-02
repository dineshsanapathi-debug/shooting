// ====================================================================
// FREE FIRE BHARAT 3D - OPEN WORLD MAP: BHARAT ISLAND (800m x 800m)
// 10 Indian Landmarks: Red Fort, Gramin Village, Mumbai City, Thar Desert,
// Himalayan Peak, Airbase, Mill, Goa Beach, Ganga Bridges, Warm-up Camp
// ====================================================================

import * as THREE from 'three';

export function createBharatMap(scene) {
  const mapGroup = new THREE.Group();
  mapGroup.name = 'BharatIslandMap';
  scene.add(mapGroup);

  const colliders = [];
  const lootSpots = [];

  // 1. TERRAIN & GROUND WITH PROCEDURAL ELEVATION
  const terrainGeo = new THREE.PlaneGeometry(800, 800, 64, 64);
  terrainGeo.rotateX(-Math.PI / 2);

  // Height displacement for terrain
  const pos = terrainGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    // River depression running across Z axis
    const riverDist = Math.abs(x - Math.sin(z * 0.015) * 40);
    let y = 0;

    if (riverDist < 18) {
      y = -4.5 + (riverDist / 18) * 4.0; // Riverbed
    } else {
      // Mountain peak elevation in North-East (x > 150, z < -150)
      if (x > 100 && z < -100) {
        y += Math.sin(x * 0.02) * Math.cos(z * 0.02) * 28 + 12;
      }
      // Desert sand dunes in South-West (x < -100, z > 100)
      else if (x < -80 && z > 80) {
        y += Math.sin(x * 0.05 + z * 0.03) * 6;
      } else {
        y += Math.sin(x * 0.03) * Math.sin(z * 0.03) * 2;
      }
    }
    pos.setY(i, y);
  }
  terrainGeo.computeVertexNormals();

  // Terrain Material with Grass/Earth colors
  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x4f772d,
    roughness: 0.9,
    metalness: 0.1
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  mapGroup.add(terrainMesh);

  // 2. GANGA RIVER WATER SURFACE
  const waterGeo = new THREE.PlaneGeometry(50, 800);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0077b6,
    roughness: 0.1,
    metalness: 0.8,
    transparent: true,
    opacity: 0.85
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.y = -1.2;
  mapGroup.add(waterMesh);

  // Helper: Add Box Building
  function addBuilding(x, y, z, w, h, d, color = 0xddb892, name = 'Building') {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = name;
    mapGroup.add(mesh);

    // Collision box
    colliders.push({
      minX: x - w / 2 - 0.4,
      maxX: x + w / 2 + 0.4,
      minZ: z - d / 2 - 0.4,
      maxZ: z + d / 2 + 0.4,
      topY: y + h
    });

    // Add loot spot near doorway
    lootSpots.push(new THREE.Vector3(x, y + 0.5, z + d / 2 + 1.2));
    return mesh;
  }

  // 3. LANDMARK 1: RED FORT HISTORICAL SANDSTONE CITADEL (Center: x=0, z=-50)
  const fortColor = 0xb93822; // Agra Red Sandstone
  // Rampart walls
  addBuilding(0, 0, -80, 80, 12, 6, fortColor, 'RedFortNorthWall');
  addBuilding(0, 0, -20, 80, 12, 6, fortColor, 'RedFortSouthWall');
  addBuilding(-40, 0, -50, 6, 12, 60, fortColor, 'RedFortWestWall');
  addBuilding(40, 0, -50, 6, 12, 60, fortColor, 'RedFortEastWall');
  // 4 Corner Bastions / Minarets
  addBuilding(-40, 0, -80, 10, 18, 10, fortColor, 'BastionNW');
  addBuilding(40, 0, -80, 10, 18, 10, fortColor, 'BastionNE');
  addBuilding(-40, 0, -20, 10, 18, 10, fortColor, 'BastionSW');
  addBuilding(40, 0, -20, 10, 18, 10, fortColor, 'BastionSE');
  // Diwan-i-Khas Inner Palace
  addBuilding(0, 0, -50, 30, 8, 24, 0xf4f1de, 'RedFortPalace');

  // 4. LANDMARK 2: GRAMIN RURAL VILLAGE (West: x=-180, z=-80)
  const hutColor = 0x9c6644;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const hx = -220 + c * 35;
      const hz = -120 + r * 35;
      addBuilding(hx, 0, hz, 14, 5, 12, hutColor, 'GraminHut');
      // Thatch Roof
      const roofGeo = new THREE.ConeGeometry(10, 4, 4);
      roofGeo.rotateY(Math.PI / 4);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x7f5539 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(hx, 5 + 2, hz);
      mapGroup.add(roof);
    }
  }

  // 5. LANDMARK 3: MUMBAI CITY SKYSCRAPERS (South-East: x=180, z=120)
  const glassColors = [0x1d3557, 0x457b9d, 0x2b2d42];
  for (let i = 0; i < 7; i++) {
    const cx = 130 + (i % 3) * 45;
    const cz = 80 + Math.floor(i / 3) * 50;
    const h = 25 + Math.random() * 30;
    addBuilding(cx, 0, cz, 22, h, 22, glassColors[i % 3], 'MumbaiHighrise_' + i);
  }

  // 6. LANDMARK 4: THAR DESERT & OUTPOST (South-West: x=-200, z=200)
  const desertColor = 0xe9c46a;
  addBuilding(-200, 0, 200, 36, 9, 36, desertColor, 'DesertFortOutpost');
  addBuilding(-240, 0, 180, 18, 6, 18, desertColor, 'DesertDepot');
  addBuilding(-170, 0, 230, 18, 6, 18, desertColor, 'DesertBunker');

  // 7. LANDMARK 5: HIMALAYAN PEAK MONASTERY (North-East: x=220, z=-240)
  const monasteryColor = 0xd90429;
  addBuilding(220, 22, -240, 30, 14, 24, monasteryColor, 'HimalayanTemple');
  addBuilding(250, 24, -220, 16, 8, 16, 0xfdf0d5, 'TempleSanctuary');

  // 8. LANDMARK 6: INDIAN AIR FORCE MILITARY AIRBASE (North: x=-60, z=-280)
  const airbaseColor = 0x6c757d;
  // Main Aircraft Hangar
  addBuilding(-80, 0, -280, 50, 14, 30, airbaseColor, 'AirbaseHangar');
  addBuilding(-20, 0, -280, 40, 10, 24, airbaseColor, 'AirbaseBarracks');
  // Control Tower
  addBuilding(-120, 0, -280, 12, 28, 12, 0x495057, 'AirbaseControlTower');
  // Runway tarmac
  const runwayGeo = new THREE.PlaneGeometry(40, 260);
  runwayGeo.rotateX(-Math.PI / 2);
  const runwayMat = new THREE.MeshStandardMaterial({ color: 0x212529, roughness: 0.9 });
  const runway = new THREE.Mesh(runwayGeo, runwayMat);
  runway.position.set(-60, 0.05, -260);
  runway.receiveShadow = true;
  mapGroup.add(runway);

  // 9. LANDMARK 7: INDUSTRIAL TEXTILE & STEEL MILL (East: x=240, z=0)
  const millColor = 0x4a4e69;
  addBuilding(240, 0, -20, 45, 12, 35, millColor, 'TextileFactory');
  addBuilding(240, 0, 35, 35, 10, 30, 0x3d405b, 'SteelWarehouse');
  // Smokestacks
  for (let s = 0; s < 3; s++) {
    const stackGeo = new THREE.CylinderGeometry(2, 2.8, 30, 12);
    const stackMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const stack = new THREE.Mesh(stackGeo, stackMat);
    stack.position.set(225 + s * 14, 15, -45);
    mapGroup.add(stack);
  }

  // 10. LANDMARK 8: GOA BEACH RESORT & DOCKS (South: x=0, z=300)
  addBuilding(-40, 0, 300, 20, 6, 20, 0xf4a261, 'GoaCabana1');
  addBuilding(40, 0, 300, 20, 6, 20, 0xf4a261, 'GoaCabana2');
  addBuilding(0, 0, 330, 60, 2, 14, 0x582f0e, 'BeachDockPier');

  // 11. LANDMARK 9: GANGA SUSPENSION BRIDGES
  // North Bridge across River
  addBuilding(0, 1, -160, 18, 2, 70, 0x8d99ae, 'GangaNorthBridge');
  // South Bridge across River
  addBuilding(0, 1, 140, 18, 2, 70, 0x8d99ae, 'GangaSouthBridge');

  // 12. LANDMARK 10: 60-SECOND WARM-UP LOBBY CAMP (Spawn Island / Staging Area: x=0, z=-360)
  const campPadGeo = new THREE.CylinderGeometry(40, 40, 1, 32);
  const campPadMat = new THREE.MeshStandardMaterial({ color: 0x343a40, roughness: 0.6 });
  const campPad = new THREE.Mesh(campPadGeo, campPadMat);
  campPad.position.set(0, 0.5, -360);
  campPad.receiveShadow = true;
  mapGroup.add(campPad);
  addBuilding(0, 1, -380, 24, 6, 10, 0xd00000, 'WarmupHangar');

  // 13. PROCEDURAL VEGETATION: 120 TREES (BANYAN, NEEM, COCONUT PALMS)
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x582f0e });
  const treeFoliageMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.8 });
  const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 5, 8);
  const foliageGeo = new THREE.SphereGeometry(3.5, 8, 8);

  for (let i = 0; i < 110; i++) {
    const tx = (Math.random() - 0.5) * 650;
    const tz = (Math.random() - 0.5) * 650;

    // Avoid placing trees directly on the river or runway
    if (Math.abs(tx) < 25 && Math.abs(tz) < 200) continue;
    if (Math.abs(tx + 60) < 30 && Math.abs(tz + 260) < 140) continue;

    const trunk = new THREE.Mesh(trunkGeo, treeTrunkMat);
    trunk.position.set(tx, 2.5, tz);
    trunk.castShadow = true;
    mapGroup.add(trunk);

    const foliage = new THREE.Mesh(foliageGeo, treeFoliageMat);
    foliage.position.set(tx, 6, tz);
    foliage.castShadow = true;
    mapGroup.add(foliage);

    colliders.push({
      minX: tx - 0.8,
      maxX: tx + 0.8,
      minZ: tz - 0.8,
      maxZ: tz + 0.8,
      topY: 5
    });
  }

  // 14. ENVIRONMENT LIGHTING (Sunlight & Ambient)
  const hemiLight = new THREE.HemisphereLight(0xffecd1, 0x3d5a80, 0.75);
  hemiLight.position.set(0, 200, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xfff3b0, 1.25);
  dirLight.position.set(180, 260, 120);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 600;
  dirLight.shadow.camera.left = -350;
  dirLight.shadow.camera.right = 350;
  dirLight.shadow.camera.top = 350;
  dirLight.shadow.camera.bottom = -350;
  scene.add(dirLight);

  return {
    group: mapGroup,
    colliders,
    lootSpots,
    spawnPoint: new THREE.Vector3(0, 1.5, -360),
    checkCollision(pos, radius = 0.5) {
      for (const b of colliders) {
        if (
          pos.x + radius > b.minX &&
          pos.x - radius < b.maxX &&
          pos.z + radius > b.minZ &&
          pos.z - radius < b.maxZ &&
          pos.y < b.topY
        ) {
          return true;
        }
      }
      return false;
    }
  };
}
