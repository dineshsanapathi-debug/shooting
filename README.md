# 🔥 Free Fire-Style 3D Battle Royale Game

A full-featured 3D online multiplayer battle royale shooting game built with **Three.js**, **Socket.IO**, **Node.js/Express**, and **Vite**.

---

## 🎮 Features Included

### 1. 3D Character & Procedural Animation System
- **4 Iconic Operators with Unique Abilities & Skins**:
  - **Kelly**: Swift Sprinter (+15% sprint speed).
  - **DJ Alok**: Drop the Beat (Healing Aura).
  - **Hayato**: Bushido Warrior (Armor Penetration).
  - **Chrono**: Time Turner (Force Shield).
- **Procedural Skeletal Animations**:
  - Natural idle breathing & weapon sway
  - Smooth walking, running, and high-speed sprinting
  - Stealth crouching
  - Jump physics and mid-air tuck
  - Tactical 2-handed aiming (ADS) with body pitch orientation
  - Recoil impulse kicks and weapon reload animations
  - Seated driving posture inside vehicles
  - Ragdoll collapse on defeat

### 2. Weapons & Ballistics
- **Assault Rifle (AK-47)**: 30 rounds, automatic, high fire rate, punchy audio, dynamic recoil.
- **Combat Shotgun (M1014)**: 6 rounds, 7-pellet spread, devastating close-quarters damage.
- **Heavy Sniper (AWM)**: 5 rounds, massive range & 135 damage, high-zoom telescopic sniper scope overlay.
- **Sidearm (Desert Eagle)**: 7 rounds, high accuracy backup pistol.
- **Melee (Combat Fists)**: Close-range punches.
- **Visual FX**: Starburst muzzle flashes with point-light flashes, high-velocity bullet tracer lines, and screen recoil punch.

### 3. Open-World Tropical Island Map (800 x 800)
- Procedural heightmap terrain with sandy beaches, lush lowlands, and elevated sniper vantage points (*The Peak*).
- Animated tropical turquoise ocean.
- Interconnected paved asphalt highways and central plaza.
- **Compounds & Points of Interest**:
  - *Central Military Base*: Large aircraft hangars, observation watchtowers with sniper catwalks, residential compounds.
  - *Factory & Outpost*: Industrial warehouse, twin smokestacks, and tactical shipping container stacks.
  - *Tropical Villages*: Multi-story houses with pitched clay roofs, doorways, and barricades.
  - *Foliage & Cover*: 350+ instanced palm trees, pines, and boulders optimized with `THREE.InstancedMesh` for 60+ FPS performance.

### 4. Shrinking Blue Safe Zone
- Translucent cylindrical energy dome with animated pulsing glow.
- Staged shrinking progression with visible warning banner & countdown timer.
- Outer-zone storm damage with screen audio and visual alerts.
- Minimap radar displaying both the current blue safe zone and the incoming white target circle.

### 5. Drivable Vehicles (Military Buggy / Jeep)
- 3D buggy chassis with roll cage, headlights, steering wheel, and 4 independent suspension wheels.
- Physics driving: acceleration, reverse, steering angles, terrain height tracking, and suspension tilt.
- Enter/Exit interaction prompt (`F` key / `DRIVE` button).
- Vehicle horn (`H` key) and engine audio.
- Roadkill collision damage against enemy players.

### 6. Loot, Armor & Inventory System
- 3D rotating and bobbing loot pickups with vertical beacon light pillars:
  - Weapons (AK-47, M1014, AWM, Deagle)
  - Ammo Crates (Rifle, Shotgun, Sniper)
  - Armor Vests (Level 1, 2, 3)
  - Tactical Helmets (Level 1, 2, 3)
  - Medkits & Energy Inhalers
  - Fallen player Death Crates
- Hotbar weapon selector (`1`, `2`, `3`, `4`) and Quick Medkit key (`5`).

### 7. Smart AI Battle Royale Bots
- Server automatically populates the match with smart AI bots (up to 50 players).
- Bots roam compounds, loot gear, engage nearby enemies, take cover, and navigate toward the safe zone when the storm approaches.

### 8. Web Audio API Procedural Sound Synthesis
- 100% self-contained audio with zero external audio assets needed (no broken URLs or CORS issues):
  - Weapon gunshots tailored per gun type (AK crack, Shotgun blast, Sniper echo, Pistol pop)
  - Empty clip clicks and multi-stage reload sound effects
  - Dynamic footsteps (walk & sprint cadence)
  - Hitmarker tick (white for body, high ding for headshot)
  - Vehicle engine loop with dynamic pitch-shifting and horn
  - Safe zone siren
  - Triumphant **BOOYAH!** victory fanfare

### 9. Dual PC & Mobile Controls
- **PC**:
  - `W, A, S, D`: Move / Drive
  - `Mouse`: 360° Look (Click canvas to lock pointer)
  - `Left Click`: Shoot
  - `Right Click`: Aim Down Sights (ADS) / Sniper Scope
  - `Shift`: Sprint
  - `Space`: Jump
  - `C`: Crouch
  - `R`: Reload
  - `F`: Pick Up Loot / Enter Vehicle
  - `1 - 4`: Switch Weapons
  - `5`: Use Medkit
  - `H`: Vehicle Horn
- **Mobile / Tablet**:
  - Virtual floating touch joystick with auto-centering
  - Right-screen swipe to aim & turn camera
  - Dedicated on-screen buttons: **FIRE**, **AIM**, **SPRINT**, **CROUCH**, **JUMP**, **RELOAD**, **DRIVE**, and **MEDKIT**.

---

## 🚀 How to Run the Game

You need two terminals open:

### Terminal 1 — Start the Multiplayer Server
```bash
cd server
npm start
```
*Expected output: `Battle Royale Multiplayer Server running on port 3001`*

### Terminal 2 — Start the Client Frontend
```bash
cd client
npm run dev -- --host 0.0.0.0
```
*Open your browser at `http://localhost:5173`*

---

## 👥 Testing Multiplayer

1. Open `http://localhost:5173` in two separate browser tabs (or in an Incognito window).
2. Choose different operators (e.g. **Kelly** in Tab 1, **DJ Alok** in Tab 2).
3. Click **DEPLOY TO ISLAND**.
4. Both players will connect to the same island, see each other moving in real-time, drive vehicles together, and engage in battle!

### Testing on a Mobile Phone on Local Wi-Fi
The client connects to `window.location.hostname:3001` automatically. Simply open your computer's local IP (e.g. `http://192.168.1.X:5173`) in your phone's mobile browser while connected to the same Wi-Fi network.

