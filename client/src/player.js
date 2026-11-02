// ====================================================================
// FREE FIRE BHARAT 3D - THIRD PERSON PLAYER CONTROLLER
// Camera tracking, WASD + Sprint + Jump, Landing State Machine & Vitals
// ====================================================================

import * as THREE from 'three';
import { sounds } from './audio.js';

export const PLAYER_STATES = {
  WARMUP: 'WARMUP',
  IN_AIRPLANE: 'IN_AIRPLANE',
  SKYDIVING: 'SKYDIVING',
  PARACHUTING: 'PARACHUTING',
  LANDING: 'LANDING',
  GROUND_COMBAT: 'GROUND_COMBAT',
  DEAD: 'DEAD'
};

export class Player {
  constructor(scene, camera, map, characterData) {
    this.scene = scene;
    this.camera = camera;
    this.map = map;
    this.charAnim = characterData;

    // Root Player Group (Used for movement, physics & camera tracking)
    this.root = new THREE.Group();
    this.root.name = 'LocalPlayerRoot';
    this.scene.add(this.root);

    // Attach animated operator model to root
    this.root.add(this.charAnim.model);

    // Vitals
    this.hp = 100;
    this.maxHp = 100;
    this.armor = 50;
    this.maxArmor = 100;
    this.kills = 0;
    this.alive = true;

    // Movement Physics
    this.velocity = new THREE.Vector3();
    this.state = PLAYER_STATES.WARMUP;
    this.isCrouched = false;
    this.isSprinting = false;
    this.yaw = 0;
    this.pitch = 0.2;
    this.landingTimer = 0;

    // Camera follow parameters
    this.cameraDistance = 4.2;
    this.cameraHeight = 2.0;

    // Touch controls input vector
    this.touchMove = new THREE.Vector2(0, 0);

    // Keys State
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sprint: false,
      crouch: false
    };

    this.setupControls();
  }

  setupControls() {
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW': this.keys.forward = true; break;
        case 'KeyS': this.keys.backward = true; break;
        case 'KeyA': this.keys.left = true; break;
        case 'KeyD': this.keys.right = true; break;
        case 'Space': this.keys.jump = true; break;
        case 'ShiftLeft':
        case 'ShiftRight': this.keys.sprint = true; break;
        case 'KeyC': this.toggleCrouch(); break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': this.keys.forward = false; break;
        case 'KeyS': this.keys.backward = false; break;
        case 'KeyA': this.keys.left = false; break;
        case 'KeyD': this.keys.right = false; break;
        case 'Space': this.keys.jump = false; break;
        case 'ShiftLeft':
        case 'ShiftRight': this.keys.sprint = false; break;
      }
    });

    // Pointer Lock & Mouse Look
    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement) {
        this.yaw -= e.movementX * 0.0022;
        this.pitch -= e.movementY * 0.0022;
        this.pitch = Math.max(-0.6, Math.min(1.1, this.pitch));
      }
    });
  }

  toggleCrouch() {
    if (this.state !== PLAYER_STATES.GROUND_COMBAT && this.state !== PLAYER_STATES.WARMUP) return;
    this.isCrouched = !this.isCrouched;
    if (this.isCrouched) {
      this.charAnim.play('crouch');
    } else {
      this.charAnim.play('idle');
    }
  }

  // Eject jump from airplane
  jumpFromAirplane(planePos) {
    this.state = PLAYER_STATES.SKYDIVING;
    this.root.position.copy(planePos);
    this.root.position.y -= 4; // Clear under belly
    this.velocity.set(0, -32, 0); // initial downward velocity
    this.charAnim.play('skydive');
    sounds.startWindRush();

    const chuteOverlay = document.getElementById('chuteGaugeOverlay');
    if (chuteOverlay) chuteOverlay.style.display = 'block';
  }

  // Parachute deploy
  openParachute() {
    if (this.state !== PLAYER_STATES.SKYDIVING) return;
    this.state = PLAYER_STATES.PARACHUTING;
    this.charAnim.play('parachute');
    sounds.stopWindRush();

    const gaugeStatus = document.getElementById('chuteGaugeStatus');
    if (gaugeStatus) gaugeStatus.textContent = 'TRICOLOR PARACHUTE GLIDE';
  }

  // Touchdown landing impact
  triggerLanding() {
    this.state = PLAYER_STATES.LANDING;
    this.landingTimer = 1.2; // 1.2 second crouch-and-stand landing animation
    this.velocity.set(0, 0, 0);
    this.root.position.y = 1.0;
    this.charAnim.play('landing', 0.05);
    sounds.playLandingThud();

    // Show landing notification
    const banner = document.getElementById('landingBanner');
    if (banner) banner.style.display = 'block';

    const chuteOverlay = document.getElementById('chuteGaugeOverlay');
    if (chuteOverlay) chuteOverlay.style.display = 'none';

    setTimeout(() => {
      if (this.state === PLAYER_STATES.LANDING) {
        this.state = PLAYER_STATES.GROUND_COMBAT;
        this.charAnim.play('idle', 0.2);
        if (banner) banner.style.display = 'none';
      }
    }, 1200);
  }

  takeDamage(amount) {
    if (!this.alive) return;
    // Absorb with armor first
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.6);
      this.armor -= absorbed;
      amount -= absorbed;
    }
    this.hp = Math.max(0, this.hp - amount);

    // Damage flash UI
    const flash = document.getElementById('damageIndicator');
    if (flash) {
      flash.classList.add('active');
      setTimeout(() => flash.classList.remove('active'), 180);
    }

    this.updateVitalsHUD();

    if (this.hp <= 0) {
      this.die();
    }
  }

  heal(amount = 75) {
    if (!this.alive) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.armor = Math.min(this.maxArmor, this.armor + 25);
    this.updateVitalsHUD();
  }

  die() {
    this.alive = false;
    this.state = PLAYER_STATES.DEAD;
    const defeatScreen = document.getElementById('defeatScreen');
    if (defeatScreen) defeatScreen.style.display = 'flex';
  }

  update(delta, vehicle) {
    // 1. Update Mixer Animations
    this.charAnim.update(delta);

    // If inside buggy vehicle
    if (vehicle && vehicle.isOccupied()) {
      this.root.position.copy(vehicle.group.position);
      this.root.position.y += 0.4;
      this.root.rotation.copy(vehicle.group.rotation);
      this.updateCamera();
      return;
    }

    // 2. State-Specific Movement Logic
    if (this.state === PLAYER_STATES.IN_AIRPLANE) {
      // Inactive on ground while in transport
      return;
    }

    if (this.state === PLAYER_STATES.SKYDIVING) {
      // Freefall descent at 45 m/s with horizontal air steering
      this.velocity.y = -44;
      const moveX = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
      const moveZ = (this.keys.backward ? 1 : 0) - (this.keys.forward ? 1 : 0);

      const airSpeed = 22;
      this.root.position.x += (Math.sin(this.yaw) * moveZ + Math.cos(this.yaw) * moveX) * airSpeed * delta;
      this.root.position.z += (Math.cos(this.yaw) * moveZ - Math.sin(this.yaw) * moveX) * airSpeed * delta;
      this.root.position.y += this.velocity.y * delta;
      this.root.rotation.y = this.yaw;

      // Update Parachute Altitude UI
      const alt = Math.max(0, Math.floor(this.root.position.y));
      const altVal = document.getElementById('chuteGaugeAlt');
      const altFill = document.getElementById('altMeterFill');
      if (altVal) altVal.textContent = alt + ' m';
      if (altFill) altFill.style.width = Math.min(100, (alt / 160) * 100) + '%';

      // Auto-deploy parachute at 38m, or manual Spacebar
      if (this.root.position.y <= 38 || this.keys.jump) {
        this.openParachute();
      }
      this.updateCamera();
      return;
    }

    if (this.state === PLAYER_STATES.PARACHUTING) {
      // Gentle glide descent at 9.5 m/s with high steerability
      this.velocity.y = -9.5;
      const moveX = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
      const moveZ = (this.keys.backward ? 1 : 0) - (this.keys.forward ? 1 : 0);

      const glideSpeed = 16;
      this.root.position.x += (Math.sin(this.yaw) * moveZ + Math.cos(this.yaw) * moveX) * glideSpeed * delta;
      this.root.position.z += (Math.cos(this.yaw) * moveZ - Math.sin(this.yaw) * moveX) * glideSpeed * delta;
      this.root.position.y += this.velocity.y * delta;
      this.root.rotation.y = this.yaw;

      const alt = Math.max(0, Math.floor(this.root.position.y));
      const altVal = document.getElementById('chuteGaugeAlt');
      const altFill = document.getElementById('altMeterFill');
      if (altVal) altVal.textContent = alt + ' m';
      if (altFill) altFill.style.width = Math.min(100, (alt / 160) * 100) + '%';

      // Ground Touchdown
      if (this.root.position.y <= 1.0) {
        this.triggerLanding();
      }
      this.updateCamera();
      return;
    }

    if (this.state === PLAYER_STATES.LANDING) {
      // During 1.2s landing squat recovery, character is locked in touchdown posture
      this.landingTimer -= delta;
      this.updateCamera();
      return;
    }

    // 3. Ground Combat / Warmup Movement
    if (this.state === PLAYER_STATES.GROUND_COMBAT || this.state === PLAYER_STATES.WARMUP) {
      const isMoving = this.keys.forward || this.keys.backward || this.keys.left || this.keys.right ||
                       this.touchMove.lengthSq() > 0.05;

      const speed = this.isCrouched ? 3.5 : (this.keys.sprint ? 9.5 : 5.8);

      let forward = 0;
      let strafe = 0;

      if (this.keys.forward) forward -= 1;
      if (this.keys.backward) forward += 1;
      if (this.keys.left) strafe -= 1;
      if (this.keys.right) strafe += 1;

      // Add touch joystick input
      if (this.touchMove.lengthSq() > 0.05) {
        strafe += this.touchMove.x;
        forward += this.touchMove.y;
      }

      if (isMoving) {
        const moveVec = new THREE.Vector3(strafe, 0, forward).normalize();
        moveVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

        const newPos = this.root.position.clone().addScaledVector(moveVec, speed * delta);
        if (!this.map.checkCollision(newPos, 0.45)) {
          this.root.position.copy(newPos);
        }

        this.charAnim.play('run');
      } else {
        if (!this.isCrouched) {
          this.charAnim.play('idle');
        }
      }

      this.root.rotation.y = this.yaw;
    }

    this.updateCamera();
  }

  updateCamera() {
    const camOffset = new THREE.Vector3(
      Math.sin(this.yaw) * this.cameraDistance * Math.cos(this.pitch),
      this.cameraHeight + Math.sin(this.pitch) * this.cameraDistance,
      Math.cos(this.yaw) * this.cameraDistance * Math.cos(this.pitch)
    );

    this.camera.position.copy(this.root.position).add(camOffset);
    this.camera.lookAt(
      this.root.position.x,
      this.root.position.y + 1.4,
      this.root.position.z
    );

    // Update Compass heading
    const compassEl = document.getElementById('compassHeadingText');
    if (compassEl) {
      let deg = Math.floor((-this.yaw * 180 / Math.PI) % 360);
      if (deg < 0) deg += 360;
      compassEl.textContent = `${deg}°`;
    }
  }

  updateVitalsHUD() {
    const hpFill = document.getElementById('hpBarFill');
    const hpText = document.getElementById('hpText');
    const armFill = document.getElementById('armorBarFill');
    const armText = document.getElementById('armorText');

    if (hpFill) hpFill.style.width = `${Math.floor((this.hp / this.maxHp) * 100)}%`;
    if (hpText) hpText.textContent = `${Math.floor(this.hp)}/${this.maxHp}`;
    if (armFill) armFill.style.width = `${Math.floor((this.armor / this.maxArmor) * 100)}%`;
    if (armText) armText.textContent = `${Math.floor(this.armor)}/${this.maxArmor}`;
  }
}
