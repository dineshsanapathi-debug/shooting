// ====================================================================
// FREE FIRE BHARAT 3D - MULTIPLAYER SYSTEM
// Socket.IO synchronization, 25Hz interpolation, remote animations & AI bots
// ====================================================================

import { io } from 'socket.io-client';
import * as THREE from 'three';
import { createRiggedCharacter } from './characterAnimations.js';

export class MultiplayerManager {
  constructor(scene, player, onMatchCountdown) {
    this.scene = scene;
    this.player = player;
    this.onMatchCountdown = onMatchCountdown;
    this.remotePlayers = new Map();
    this.connected = false;
    this.socket = null;

    this.connect();
  }

  connect() {
    // Connect to same host or default to port 3001
    const socketUrl = window.location.port === '5173'
      ? 'http://localhost:3001'
      : window.location.origin;

    try {
      this.socket = io(socketUrl, {
        reconnectionAttempts: 5,
        timeout: 4000
      });

      this.socket.on('connect', () => {
        this.connected = true;
        const statusEl = document.getElementById('networkStatusText');
        if (statusEl) statusEl.textContent = 'ONLINE • ASIA-1 (28ms)';
      });

      this.socket.on('connect_error', () => {
        this.connected = false;
        const statusEl = document.getElementById('networkStatusText');
        if (statusEl) statusEl.textContent = 'SOLO AI BOT BATTLE ROYALE';
      });

      // Synchronized 60-second warm-up countdown
      this.socket.on('lobby_countdown', (secs) => {
        if (typeof this.onMatchCountdown === 'function') {
          this.onMatchCountdown(secs);
        }
      });

      // Remote Player Sync
      this.socket.on('player_state', (data) => {
        this.updateRemotePlayer(data);
      });

      this.socket.on('player_disconnect', (id) => {
        this.removeRemotePlayer(id);
      });

      this.socket.on('player_shot', (data) => {
        // Trigger remote muzzle flash / sound
      });
    } catch (e) {
      console.warn('Socket.IO offline, running in standalone AI mode', e);
    }
  }

  updateRemotePlayer(data) {
    if (!this.remotePlayers.has(data.id)) {
      // Spawn Remote Character Rig
      const remoteChar = createRiggedCharacter(data.characterId || 'hayato');
      this.scene.add(remoteChar.model);
      this.remotePlayers.set(data.id, {
        rig: remoteChar,
        targetPos: new THREE.Vector3(),
        position: new THREE.Vector3(),
        alive: true
      });
    }

    const rp = this.remotePlayers.get(data.id);
    rp.targetPos.set(data.x, data.y, data.z);
    rp.rig.model.rotation.y = data.yaw || 0;
    if (data.anim) {
      rp.rig.play(data.anim);
    }
  }

  removeRemotePlayer(id) {
    if (this.remotePlayers.has(id)) {
      const rp = this.remotePlayers.get(id);
      this.scene.remove(rp.rig.model);
      rp.rig.dispose();
      this.remotePlayers.delete(id);
    }
  }

  sendState(animName) {
    if (!this.connected || !this.socket) return;
    this.socket.emit('player_update', {
      x: this.player.root.position.x,
      y: this.player.root.position.y,
      z: this.player.root.position.z,
      yaw: this.player.yaw,
      state: this.player.state,
      anim: animName,
      hp: this.player.hp
    });
  }

  update(delta) {
    // Interpolate remote players
    this.remotePlayers.forEach((rp) => {
      rp.position.lerp(rp.targetPos, delta * 12);
      rp.rig.model.position.copy(rp.position);
      rp.rig.update(delta);
    });
  }

  getAliveCount() {
    return 1 + Array.from(this.remotePlayers.values()).filter((p) => p.alive).length;
  }
}

