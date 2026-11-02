// ====================================================================
// FREE FIRE BHARAT 3D - SHRINKING SAFE ZONE SYSTEM
// Electric blue forcefield cylinder, countdown phases & storm DPS damage
// ====================================================================

import * as THREE from 'three';

export class SafeZone {
  constructor(scene) {
    this.scene = scene;
    this.center = new THREE.Vector2(0, 0);
    this.currentRadius = 380;
    this.targetRadius = 380;
    this.initialRadius = 380;

    this.phase = 0;
    this.phaseTimer = 35; // 35 seconds per zone stage
    this.isShrinking = false;
    this.dps = 4; // damage per second outside safe zone

    // 3D Visual Forcefield Cylinder
    const geo = new THREE.CylinderGeometry(this.currentRadius, this.currentRadius, 200, 48, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00b4d8,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(0, 100, 0);
    this.scene.add(this.mesh);
  }

  update(delta, playerPos, onDamage) {
    this.phaseTimer -= delta;

    if (!this.isShrinking) {
      if (this.phaseTimer <= 0) {
        // Trigger Shrinking
        this.isShrinking = true;
        this.phase++;
        this.phaseTimer = 25; // 25s shrink duration
        this.targetRadius = Math.max(30, this.currentRadius * 0.55);
        this.dps += 3; // increase danger in later circles
      }
    } else {
      // Shrinking active
      const shrinkSpeed = (this.currentRadius - this.targetRadius) / Math.max(this.phaseTimer, 0.1);
      this.currentRadius -= shrinkSpeed * delta;
      if (this.currentRadius <= this.targetRadius + 1) {
        this.currentRadius = this.targetRadius;
        this.isShrinking = false;
        this.phaseTimer = 30; // wait 30s before next shrink
      }

      // Update 3D mesh scale
      const s = this.currentRadius / this.initialRadius;
      this.mesh.scale.set(s, 1, s);
    }

    // Check if player is outside safe zone
    if (playerPos) {
      const dist = Math.hypot(playerPos.x - this.center.x, playerPos.z - this.center.y);
      if (dist > this.currentRadius) {
        if (typeof onDamage === 'function') {
          onDamage(this.dps * delta);
        }
      }
    }

    // Update HUD
    const banner = document.getElementById('zoneBanner');
    const timerText = document.getElementById('zoneTimerText');
    if (banner && timerText) {
      const secs = Math.max(0, Math.ceil(this.phaseTimer));
      if (this.isShrinking) {
        banner.className = 'zone-shrinking';
        timerText.textContent = `⚠️ ZONE SHRINKING! MOVE TO CENTER (${secs}s)`;
      } else {
        banner.className = 'zone-waiting';
        timerText.textContent = `⚡ NEXT ZONE IN: ${secs}s`;
      }
    }
  }

  isInside(pos) {
    const dist = Math.hypot(pos.x - this.center.x, pos.z - this.center.y);
    return dist <= this.currentRadius;
  }
}
