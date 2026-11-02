// ====================================================================
// FREE FIRE BHARAT 3D - USER INTERFACE & MOBILE TOUCH CONTROLS
// Minimap Radar Canvas, Compass tape, Kill Feed & Virtual Touch Joysticks
// ====================================================================

export class GameUI {
  constructor(player, weapons, zone) {
    this.player = player;
    this.weapons = weapons;
    this.zone = zone;

    this.minimapCanvas = document.getElementById('minimapCanvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    this.setupCharacterSelector();
    this.setupMobileControls();
    this.setupHotbarClicks();
  }

  setupCharacterSelector() {
    const chips = document.querySelectorAll('.char-chip');
    const nameEl = document.getElementById('selectedCharName');
    const descEl = document.getElementById('selectedCharDesc');

    const descriptions = {
      hayato: 'Legendary samurai warrior. Passive: When maximum HP drops, armor penetration increases dramatically.',
      alok: 'World-famous DJ. Active: Creates a 5m aura that increases ally movement speed and restores HP.',
      kelly: 'Track prodigy. Passive: Sprinting speed is permanently increased by 6%.',
      chrono: 'Time-traveling cyber guardian. Active: Deploys a forcefield that blocks 800 damage from enemies.'
    };

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        const charId = chip.dataset.char;
        if (nameEl) nameEl.textContent = charId.toUpperCase();
        if (descEl) descEl.textContent = descriptions[charId] || '';
      });
    });
  }

  setupHotbarClicks() {
    const slots = document.querySelectorAll('.weapon-slot');
    slots.forEach((slot) => {
      slot.addEventListener('click', () => {
        const id = slot.dataset.weapon;
        this.weapons.switchWeapon(id);
      });
    });

    const medkitBtn = document.getElementById('medkitQuickBtn');
    if (medkitBtn) {
      medkitBtn.addEventListener('click', () => {
        this.player.heal(75);
      });
    }
  }

  setupMobileControls() {
    // Virtual Movement Joystick
    const joystick = document.getElementById('touchJoystick');
    const knob = document.getElementById('touchKnob');
    if (joystick && knob) {
      let touchId = null;
      const rect = joystick.getBoundingClientRect();
      const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

      const onTouchMove = (e) => {
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === touchId) {
            const dx = e.touches[i].clientX - center.x;
            const dy = e.touches[i].clientY - center.y;
            const dist = Math.min(45, Math.hypot(dx, dy));
            const angle = Math.atan2(dy, dx);

            knob.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
            this.player.touchMove.set(Math.cos(angle) * (dist / 45), -Math.sin(angle) * (dist / 45));
            break;
          }
        }
      };

      const onTouchEnd = (e) => {
        knob.style.transform = 'translate(0px, 0px)';
        this.player.touchMove.set(0, 0);
        touchId = null;
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      };

      joystick.addEventListener('touchstart', (e) => {
        touchId = e.changedTouches[0].identifier;
        window.addEventListener('touchmove', onTouchMove);
        window.addEventListener('touchend', onTouchEnd);
      });
    }

    // Virtual Buttons
    const btnSprint = document.getElementById('btnSprint');
    if (btnSprint) {
      btnSprint.addEventListener('touchstart', () => (this.player.keys.sprint = true));
      btnSprint.addEventListener('touchend', () => (this.player.keys.sprint = false));
    }

    const btnCrouch = document.getElementById('btnCrouch');
    if (btnCrouch) {
      btnCrouch.addEventListener('click', () => this.player.toggleCrouch());
    }

    const btnJump = document.getElementById('btnJump');
    if (btnJump) {
      btnJump.addEventListener('touchstart', () => (this.player.keys.jump = true));
      btnJump.addEventListener('touchend', () => (this.player.keys.jump = false));
    }

    const btnAim = document.getElementById('btnAim');
    if (btnAim) {
      btnAim.addEventListener('click', () => {
        this.weapons.setADS(!this.weapons.isADS);
      });
    }

    const btnReload = document.getElementById('btnReload');
    if (btnReload) {
      btnReload.addEventListener('click', () => this.weapons.reload());
    }
  }

  addKillFeed(killer, victim, weaponName = 'AK-47') {
    const list = document.getElementById('killFeedList');
    if (!list) return;

    const item = document.createElement('div');
    item.className = 'kill-feed-item';
    item.innerHTML = `<strong>${killer}</strong> ⚡ ${weaponName} ➔ ${victim}`;
    list.prepend(item);

    setTimeout(() => {
      if (item.parentNode) item.parentNode.removeChild(item);
    }, 4500);
  }

  renderMinimap(otherPlayers = []) {
    if (!this.minimapCtx) return;
    const ctx = this.minimapCtx;
    const size = 140;
    const scale = size / 800; // 800m map mapped to 140px

    ctx.clearRect(0, 0, size, size);

    // Island background
    ctx.fillStyle = '#2d6a4f';
    ctx.fillRect(0, 0, size, size);

    // Ganga River Blue Path
    ctx.fillStyle = '#0077b6';
    ctx.fillRect(size / 2 - 5, 0, 10, size);

    // Safe Zone Blue Circle
    if (this.zone) {
      const zx = size / 2 + this.zone.center.x * scale;
      const zy = size / 2 + this.zone.center.y * scale;
      const zr = this.zone.currentRadius * scale;

      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(zx, zy, Math.max(1, zr), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Other Players / AI Bots (Red dots)
    ctx.fillStyle = '#ff0055';
    otherPlayers.forEach((p) => {
      if (!p.alive) return;
      const ox = size / 2 + p.position.x * scale;
      const oy = size / 2 + p.position.z * scale;
      ctx.beginPath();
      ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Local Player (Golden Arrow)
    if (this.player && this.player.root) {
      const px = size / 2 + this.player.root.position.x * scale;
      const py = size / 2 + this.player.root.position.z * scale;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-this.player.yaw);

      ctx.fillStyle = '#ffbe0b';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4, 5);
      ctx.lineTo(-4, 5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }
}
