# 🔥 Free Fire 3D Battle Royale (Bharat Island)

A complete 3D multiplayer Battle Royale shooting game inspired by **Free Fire**, built with **Three.js**, **JavaScript**, **Vite**, **Node.js**, **Express 5**, and **Socket.IO**.

🌐 **Live WebGL Client**: [https://dineshsanapathi-debug.github.io/shooting/](https://dineshsanapathi-debug.github.io/shooting/)  
🖥️ **Local Server**: `http://localhost:3001` (Unified client and multiplayer server)

---

## 🎮 Key Features

1. **Bharat Island Open-World Map (800m × 800m)**
   - **Red Fort Citadel**: Sandstone bastions, ramparts, and historical courtyard.
   - **Gramin Rural Village**: Clay huts with thatch roofs and farmland.
   - **Mumbai High-Rise Skyline**: Glass-faced modern towers.
   - **Thar Desert**: Rolling sand dunes and military outpost.
   - **Himalayan Mountain Peak**: Snow-capped temple elevation.
   - **Indian Air Force Military Airbase**: Hangars, control tower, and tarmac runway.
   - **Industrial Mill**: Brick factories, steel warehouses, and triple smokestacks.
   - **Goa Tropical Coast**: Palm trees, beach resort cabanas, and wooden pier.
   - **Ganga River & Bridges**: Dual suspension bridges spanning water body.
   - **Warm-up Staging Camp**: Spawn staging ground for match countdown.

2. **Animated Tactical Operators (Free Fire Style)**
   - 4 Operators: **Hayato**, **Alok**, **Kelly**, **Chrono**.
   - Animation system with **Three.js `AnimationMixer`**:
     - `Idle`, `Walk`, `Run` (forward sprint), `Jump`, `Crouch`
     - `Skydive` (horizontal belly spread-eagle)
     - `Parachute` (toggle-grip hanging)
     - `Landing` (squash-and-stretch knee-bend impact absorption, 1.2s crouch recovery, standing ready)
     - `Shoot` (recoil punch), `Reload`, `Death`

3. **60-Second Synchronized Warm-Up Lobby**
   - Synchronized countdown with audio beeps across all connected players.
   - Full free movement and character selection during warm-up.

4. **Military Cargo Airplane & Jump System**
   - Twin turboprop transport aircraft flying across Bharat Island at altitude 160m.
   - Real-time telemetry (Altitude, Speed, Flight route progress bar).
   - Manual `[SPACE]` ejection or automatic release at 88% route completion.

5. **Skydiving & Parachute Glide System**
   - High-speed freefall with aerodynamic tilt and wind rush audio.
   - Tricolor parachute (Saffron, White, Green) with suspension risers.
   - Auto-deploy at altitude 38m or manual Spacebar deployment.
   - Full steering control (forward/back dive, left/right banking).

6. **Combat Arsenal & Ballistics**
   - **AK-47**: Automatic assault rifle (30-round mag, 36 damage, bullet tracers).
   - **M1014**: Semi-auto tactical shotgun (8 pellets spread, 18 damage/pellet).
   - **AWM Sniper**: High-caliber precision rifle with telescopic ADS mil-dot scope (150 damage).
   - **Desert Eagle**: Heavy sidearm pistol (54 damage).
   - **Combat Fists**: Close-quarters melee.
   - Dynamic crosshair, hitmarker audio ticks, and red directional damage flashes.

7. **Shrinking Electromagnetic Safe Zone**
   - 3D electric blue pulsing forcefield cylinder.
   - Warning timer HUD banner ("SAFE ZONE SHRINKING IN 30s").
   - Increasing storm DPS damage outside the safe perimeter.

8. **Drivable Military Buggy**
   - 4-wheel independent rotation, headlights, steering physics, and `[E]` interact prompt.

9. **Procedural Web Audio API Sound Synthesizer**
   - Aircraft engine drone, wind rush, landing thud, gunshots, reload clicks, and Booyah fanfare.
   - Zero external audio assets required; 100% offline-ready.

10. **Cross-Platform PC & Mobile Support**
    - PC: WASD movement, Shift sprint, Space jump, C crouch, mouse pointer lock look, left-click fire, right-click ADS sniper scope.
    - Mobile: Virtual movement touch joystick, dedicated touch buttons (Sprint, Crouch, Aim, Reload, Jump, Fire).

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
# Install frontend
cd client
npm install

# Install backend
cd ../server
npm install
```

### 2. Run the Unified Game Server
```bash
cd server
node server.js
```
The server will run on `http://localhost:3001` and automatically serve both:
- The full 3D WebGL game client directly in your browser.
- Real-time Socket.IO multiplayer synchronization on port 3001.

### 3. Optional: Run Frontend in Vite Dev Mode
```bash
cd client
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## ⌨️ Tactical Controls Reference

| Input | PC Key | Mobile Control | Action |
|---|---|---|---|
| Move | `W`, `A`, `S`, `D` | Left Virtual Joystick | Move character / vehicle |
| Sprint | `Shift` | `SPRINT` Button | Fast run |
| Jump / Deploy | `Space` | `JUMP` Button | Jump or open parachute |
| Crouch | `C` | `CROUCH` Button | Crouch / Stance recovery |
| Aim | Mouse Look | Right Screen Drag | Look around |
| Shoot | Left Click | `FIRE` Button | Fire equipped weapon |
| Scope ADS | Right Click | `AIM` Button | Telescopic sniper zoom |
| Reload | `R` | `RELOAD` Button | Reload magazine |
| Switch Weapon | `1`, `2`, `3`, `4`, `5` | Hotbar Slots | Select Rifle / Shotgun / Sniper / Pistol / Fists |
| Interact | `E` | Prompt Tap | Enter / exit military buggy |

