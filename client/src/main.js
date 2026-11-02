// ====================================================================
// FREE FIRE BHARAT 3D - MAIN CLIENT APPLICATION
// Master Engine Orchestrator: Three.js, Match Stages, Airplane & Combat
// ====================================================================

import * as THREE from 'three';
import { sounds } from './audio.js';
import { createAnimatedCharacter } from './characterAnimations.js';
import { createBharatMap } from './map.js';
import { Player, PLAYER_STATES } from './player.js';
import { createMilitaryAirplane } from './airplane.js';
import { createParachuteRig } from './parachute.js';
import { WeaponManager } from './weapons.js';
import { SafeZone } from './zone.js';
import { createMilitaryBuggy } from './vehicle.js';
import { GameUI } from './gameUI.js';
import { MultiplayerManager } from './multiplayer.js';

// GAME PHASES
const GAME_PHASES = {
  LOBBY: 'LOBBY',
  WARMUP: 'WARMUP',
  AIRPLANE: 'AIRPLANE',
  BATTLE: 'BATTLE',
  MATCH_END: 'MATCH_END'
};

class GameApp {
  constructor() {
    this.phase = GAME_PHASES.LOBBY;
    this.clock = new THREE.Clock();
    this.container = document.getElementById('gameContainer');

    this.initThree();
    this.initGame();
    this.setupEvents();
  }

  initThree() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0016);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1200
    );

    // 3. Renderer with PC & Mobile Optimizations
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Window Resize Handler
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  async initGame() {
    // 1. Bharat Island Map
    this.map = createBharatMap(this.scene);

    // 2. Operator Animated Character
    const charData = await createAnimatedCharacter('hayato');

    // 3. Local Player Controller
    this.player = new Player(this.scene, this.camera, this.map, charData);
    this.player.root.position.copy(this.map.spawnPoint);

    // 4. Parachute Rig attached to Player
    this.parachute = createParachuteRig();
    this.player.root.add(this.parachute.group);

    // 5. Military Airplane
    this.airplane = createMilitaryAirplane(this.scene);

    // 6. Weapons Manager
    this.weapons = new WeaponManager(this.scene, this.camera);
    if (charData.rightHand) {
      charData.rightHand.add(this.weapons.weaponGroup);
      this.weapons.weaponGroup.rotation.y = Math.PI / 2;
    }

    // 7. Shrinking Safe Zone
    this.zone = new SafeZone(this.scene);

    // 8. Drivable Military Buggy
    this.buggy = createMilitaryBuggy(this.scene, new THREE.Vector3(12, 1, -340));

    // 9. UI & HUD Manager
    this.ui = new GameUI(this.player, this.weapons, this.zone);

    // 10. Multiplayer Manager with Synchronized Lobby Countdown
    this.multiplayer = new MultiplayerManager(this.scene, this.player, (secs) => {
      this.onLobbyCountdown(secs);
    });

    // 11. Populate 28 AI Tactical Operators across Bharat Island
    this.initAIBots();

    // Start Animation Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initAIBots() {
    this.bots = [];
    const botNames = ['Ajay_Pro', 'Rohit_Killr', 'Vikram_Sniper', 'Kavita_99', 'Siddharth_FF', 'Pooja_Hunter', 'Amit_God', 'Deepak_Alpha'];

    for (let i = 0; i < 28; i++) {
      const bx = (Math.random() - 0.5) * 550;
      const bz = (Math.random() - 0.5) * 550;
      const botMesh = new THREE.Group();

      const bTorso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.3), new THREE.MeshStandardMaterial({ color: 0x9e2a2b }));
      bTorso.position.y = 1.0;
      bTorso.castShadow = true;
      botMesh.add(bTorso);

      const bHead = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), new THREE.MeshStandardMaterial({ color: 0xd4a373 }));
      bHead.position.y = 1.65;
      botMesh.add(bHead);

      botMesh.position.set(bx, 0, bz);
      this.scene.add(botMesh);

      this.bots.push({
        id: 'bot_' + i,
        name: botNames[i % botNames.length] + '_' + (i + 1),
        group: botMesh,
        position: botMesh.position,
        hp: 100,
        alive: true,
        speed: 3.5 + Math.random() * 2,
        patrolAngle: Math.random() * Math.PI * 2,
        changeTimer: 2 + Math.random() * 4
      });
    }
  }

  setupEvents() {
    // Start Game from Lobby button
    const btnStart = document.getElementById('btnStartGame');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        sounds.init();
        this.startWarmupLobby();
      });
    }

    // Airplane Jump Button
    const btnJump = document.getElementById('btnFlightJump');
    if (btnJump) {
      btnJump.addEventListener('click', () => this.ejectFromAirplane());
    }

    // Spacebar Jump while in Airplane
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.phase === GAME_PHASES.AIRPLANE && !this.airplane.hasJumped()) {
        this.ejectFromAirplane();
      }

      // Buggy Enter / Exit with 'E'
      if (e.code === 'KeyE') {
        this.toggleBuggy();
      }
    });

    // Shooting: Mouse Down & Mobile Fire Button
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.canFireWeapon()) {
        this.fireLocalWeapon();
      } else if (e.button === 2) {
        // Right Click ADS Sniper Scope
        e.preventDefault();
        this.weapons.setADS(true);
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.weapons.setADS(false);
      }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mobile Shoot button
    const btnShoot = document.getElementById('btnShoot');
    if (btnShoot) {
      btnShoot.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.canFireWeapon()) {
          this.fireLocalWeapon();
        }
      });
    }

    // Restart buttons on Victory / Defeat
    const restartVic = document.getElementById('btnRestartVictory');
    const restartDef = document.getElementById('btnRestartDefeat');
    const restartHandler = () => window.location.reload();
    if (restartVic) restartVic.addEventListener('click', restartHandler);
    if (restartDef) restartDef.addEventListener('click', restartHandler);
  }

  canFireWeapon() {
    return this.phase === GAME_PHASES.BATTLE &&
           this.player.state === PLAYER_STATES.GROUND_COMBAT &&
           this.player.alive;
  }

  fireLocalWeapon() {
    const origin = this.player.root.position.clone();
    origin.y += 1.5; // Eye height

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.camera.rotation);

    // Targetable meshes (AI bots)
    const targets = this.bots.filter((b) => b.alive).map((b) => b.group);

    this.weapons.shoot(origin, forward, targets, (hit, dmg) => {
      // Find which bot was hit
      for (const bot of this.bots) {
        if (bot.alive && bot.group.getObjectById(hit.object.id)) {
          bot.hp -= dmg;
          if (bot.hp <= 0) {
            bot.alive = false;
            bot.group.visible = false;
            this.player.kills++;
            this.ui.addKillFeed('YOU', bot.name, this.weapons.getCurrentDef().name);

            const killsEl = document.getElementById('killsCount');
            if (killsEl) killsEl.textContent = this.player.kills;

            this.checkVictoryCondition();
          }
          break;
        }
      }
    });

    this.player.charAnim.play('shoot', 0.05);
    this.multiplayer.sendState('shoot');
  }

  toggleBuggy() {
    const dist = this.player.root.position.distanceTo(this.buggy.group.position);
    if (dist < 4.5) {
      const isOccupied = this.buggy.isOccupied();
      this.buggy.setOccupied(!isOccupied);
      if (!isOccupied) {
        this.player.charAnim.play('idle');
      }
    }
  }

  // 1. Warm-up Lobby (60 seconds countdown)
  startWarmupLobby() {
    this.phase = GAME_PHASES.WARMUP;
    document.getElementById('lobbyScreen').style.display = 'none';
    document.getElementById('inGameHUD').style.display = 'block';

    // Request pointer lock for PC mouse aim
    document.body.requestPointerLock();

    let countdown = 60;
    this.lobbyInterval = setInterval(() => {
      countdown--;
      const bigCount = document.getElementById('lobbyCountdownBig');
      if (bigCount) bigCount.textContent = countdown;

      if (countdown <= 5 && countdown > 0) {
        sounds.playCountdownBeep(false);
      } else if (countdown === 0) {
        sounds.playCountdownBeep(true);
        clearInterval(this.lobbyInterval);
        this.startAirplaneSequence();
      }
    }, 1000);
  }

  onLobbyCountdown(secs) {
    const bigCount = document.getElementById('lobbyCountdownBig');
    if (bigCount) bigCount.textContent = secs;
    if (secs === 0 && this.phase === GAME_PHASES.WARMUP) {
      this.startAirplaneSequence();
    }
  }

  // 2. Airplane Sequence
  startAirplaneSequence() {
    this.phase = GAME_PHASES.AIRPLANE;
    this.player.state = PLAYER_STATES.IN_AIRPLANE;
    this.player.root.visible = false;

    // Show Flight HUD
    const flightHUD = document.getElementById('flightOverlay');
    if (flightHUD) flightHUD.style.display = 'block';

    this.airplane.startFlight();
  }

  // 3. Jump from Airplane
  ejectFromAirplane() {
    if (this.phase !== GAME_PHASES.AIRPLANE || this.airplane.hasJumped()) return;
    this.airplane.setJumped(true);

    const flightHUD = document.getElementById('flightOverlay');
    if (flightHUD) flightHUD.style.display = 'none';

    this.phase = GAME_PHASES.BATTLE;
    this.player.root.visible = true;
    this.player.jumpFromAirplane(this.airplane.group.position);
  }

  checkVictoryCondition() {
    const aliveBots = this.bots.filter((b) => b.alive).length;
    const aliveEl = document.getElementById('aliveCount');
    if (aliveEl) aliveEl.textContent = 1 + aliveBots;

    if (aliveBots === 0 && this.player.alive) {
      this.phase = GAME_PHASES.MATCH_END;
      sounds.playBooyahFanfare();

      const vicScreen = document.getElementById('victoryScreen');
      if (vicScreen) vicScreen.style.display = 'flex';

      const finalKills = document.getElementById('finalKills');
      if (finalKills) finalKills.textContent = this.player.kills;
      const finalDmg = document.getElementById('finalDamage');
      if (finalDmg) finalDmg.textContent = this.player.kills * 120;
    }
  }

  animate() {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);

    // 1. Airplane Flight Update
    if (this.phase === GAME_PHASES.AIRPLANE) {
      this.airplane.update(delta, (planePos) => {
        this.ejectFromAirplane();
      });
      // Camera chases airplane
      this.camera.position.set(
        this.airplane.group.position.x,
        this.airplane.group.position.y + 12,
        this.airplane.group.position.z + 32
      );
      this.camera.lookAt(this.airplane.group.position);
    }

    // 2. Player Controller Update
    this.player.update(delta, this.buggy);

    // 3. Parachute Visual Update
    if (this.player.state === PLAYER_STATES.PARACHUTING) {
      this.parachute.deploy();
      const steerX = (this.player.keys.right ? 1 : 0) - (this.player.keys.left ? 1 : 0);
      const steerZ = (this.player.keys.backward ? 1 : 0) - (this.player.keys.forward ? 1 : 0);
      this.parachute.update(delta, steerX, steerZ);
    } else {
      this.parachute.cutaway();
    }

    // 4. Safe Zone Update & Storm Damage
    if (this.phase === GAME_PHASES.BATTLE) {
      this.zone.update(delta, this.player.root.position, (damage) => {
        this.player.takeDamage(damage);
      });
    }

    // 5. Buggy Physics Update
    this.buggy.update(delta, this.player.keys);

    // 6. AI Bots Patrol Logic
    if (this.phase === GAME_PHASES.BATTLE) {
      this.bots.forEach((bot) => {
        if (!bot.alive) return;
        bot.changeTimer -= delta;
        if (bot.changeTimer <= 0) {
          bot.patrolAngle = Math.random() * Math.PI * 2;
          bot.changeTimer = 3 + Math.random() * 5;
        }

        bot.position.x += Math.sin(bot.patrolAngle) * bot.speed * delta;
        bot.position.z += Math.cos(bot.patrolAngle) * bot.speed * delta;
        bot.group.rotation.y = bot.patrolAngle;
      });
    }

    // 7. Multiplayer Sync & Minimap Radar
    this.multiplayer.update(delta);
    this.ui.renderMinimap(this.bots);

    // 8. Render Frame
    this.renderer.render(this.scene, this.camera);
  }
}

// Boot application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
