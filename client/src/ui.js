import { CHARACTER_DATA } from "./character.js";

export class UIManager {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.selectedCharacter = "kelly";
    this.selectedMode = "solo";
    this.hitmarkerTimeout = null;
    this.damageIndicatorTimeout = null;

    this.minimapCanvas = null;
    this.minimapCtx = null;

    this.initDOM();
  }

  initDOM() {
    this.minimapCanvas = document.getElementById("minimapCanvas");
    if (this.minimapCanvas) {
      this.minimapCtx = this.minimapCanvas.getContext("2d");
    }

    // Character Card Selection in Lobby
    const charCards = document.querySelectorAll(".char-card");
    charCards.forEach(card => {
      card.addEventListener("click", () => {
        charCards.forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        this.selectedCharacter = card.dataset.char;
        if (this.callbacks.onSelectCharacter) {
          this.callbacks.onSelectCharacter(this.selectedCharacter);
        }
      });
    });

    // Start Button in Lobby
    const startBtn = document.getElementById("startMatchBtn");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        const nameInput = document.getElementById("playerNameInput");
        const name = (nameInput && nameInput.value.trim()) || "Soldier";
        if (this.callbacks.onStartMatch) {
          this.callbacks.onStartMatch(name, this.selectedCharacter, this.selectedMode);
        }
      });
    }

    // Mode Buttons in Lobby
    const modeBtns = document.querySelectorAll(".mode-btn");
    modeBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        modeBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.selectedMode = btn.dataset.mode;
      });
    });

    // Play Again Buttons
    const replayBtns = document.querySelectorAll(".replay-btn");
    replayBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        if (this.callbacks.onPlayAgain) {
          this.callbacks.onPlayAgain();
        }
      });
    });
  }

  showLobby(show = true) {
    const lobby = document.getElementById("lobbyScreen");
    const hud = document.getElementById("inGameHUD");
    if (lobby) lobby.style.display = show ? "flex" : "none";
    if (hud) hud.style.display = show ? "none" : "block";
  }

  showVictory(stats) {
    const victoryScreen = document.getElementById("victoryScreen");
    if (victoryScreen) {
      document.getElementById("victoryKills").textContent = stats.kills || 0;
      document.getElementById("victoryDamage").textContent = stats.damage || 0;
      victoryScreen.style.display = "flex";
    }
  }

  showDefeat(stats) {
    const defeatScreen = document.getElementById("defeatScreen");
    if (defeatScreen) {
      document.getElementById("defeatRank").textContent = stats.rank || "15";
      document.getElementById("defeatKiller").textContent = stats.killer || "Unknown";
      defeatScreen.style.display = "flex";
    }
  }

  hideEndScreens() {
    const v = document.getElementById("victoryScreen");
    const d = document.getElementById("defeatScreen");
    if (v) v.style.display = "none";
    if (d) d.style.display = "none";
  }

  updateHUD(player, matchData) {
    if (!player) return;

    // Health & Armor bars
    const hpBar = document.getElementById("hpBarFill");
    const hpText = document.getElementById("hpText");
    const armBar = document.getElementById("armorBarFill");
    const armText = document.getElementById("armorText");

    const hpPercent = Math.max(0, Math.min(100, Math.round(player.health)));
    const armPercent = Math.max(0, Math.min(100, Math.round(player.armor || 0)));

    if (hpBar) hpBar.style.width = `${hpPercent}%`;
    if (hpText) hpText.textContent = `${hpPercent}/100`;

    if (armBar) armBar.style.width = `${armPercent}%`;
    if (armText) armText.textContent = `${armPercent}/100`;

    // Medkits count
    const medkitNum = document.getElementById("medkitCount");
    if (medkitNum) medkitNum.textContent = player.medkits || 0;

    // Alive & Kills count
    const aliveEl = document.getElementById("aliveCount");
    const killsEl = document.getElementById("killsCount");
    if (aliveEl && matchData) aliveEl.textContent = matchData.aliveCount || 1;
    if (killsEl) killsEl.textContent = player.kills || 0;

    // Safe Zone Timer Banner
    const zoneBanner = document.getElementById("zoneBanner");
    const zoneText = document.getElementById("zoneTimerText");
    if (zoneBanner && zoneText && matchData && matchData.safeZone) {
      const sz = matchData.safeZone;
      if (sz.isShrinking) {
        zoneBanner.className = "zone-shrinking";
        zoneText.textContent = "⚠️ SAFE ZONE IS SHRINKING!";
      } else {
        zoneBanner.className = "zone-waiting";
        zoneText.textContent = `⚡ SAFE ZONE SHRINKING IN: ${sz.timer}s`;
      }
    }
  }

  updateWeaponHUD(currentWeapon, ammo, reserve) {
    const nameEl = document.getElementById("currentWeaponName");
    const ammoEl = document.getElementById("currentAmmoCount");
    if (nameEl) nameEl.textContent = currentWeapon ? currentWeapon.toUpperCase() : "FISTS";
    if (ammoEl) ammoEl.textContent = `${ammo} / ${reserve}`;

    // Highlight active weapon slot
    const slots = document.querySelectorAll(".weapon-slot");
    slots.forEach(s => {
      s.classList.toggle("active", s.dataset.weapon === currentWeapon);
    });
  }

  showHitmarker(isHeadshot = false) {
    const hm = document.getElementById("hitmarker");
    if (!hm) return;
    hm.className = isHeadshot ? "headshot" : "hit";
    hm.style.opacity = "1";
    hm.style.transform = "translate(-50%, -50%) scale(1.3)";

    clearTimeout(this.hitmarkerTimeout);
    this.hitmarkerTimeout = setTimeout(() => {
      hm.style.opacity = "0";
      hm.style.transform = "translate(-50%, -50%) scale(1.0)";
    }, 130);
  }

  showDamageDirection(angle) {
    const ind = document.getElementById("damageIndicator");
    if (!ind) return;
    ind.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
    ind.style.opacity = "1";

    clearTimeout(this.damageIndicatorTimeout);
    this.damageIndicatorTimeout = setTimeout(() => {
      ind.style.opacity = "0";
    }, 350);
  }

  showInteractionPrompt(text) {
    const prompt = document.getElementById("interactionPrompt");
    if (!prompt) return;
    if (text) {
      prompt.textContent = text;
      prompt.style.display = "block";
    } else {
      prompt.style.display = "none";
    }
  }

  updateKillFeed(feedList) {
    const container = document.getElementById("killFeedList");
    if (!container || !feedList) return;

    container.innerHTML = "";
    feedList.slice(0, 5).forEach(item => {
      const row = document.createElement("div");
      row.className = "kill-item";
      row.innerHTML = `<span class="killer">${item.killerName}</span> <span class="weapon">[${item.weaponName}]</span> <span class="victim">${item.victimName}</span>`;
      container.appendChild(row);
    });
  }

  // Draw 2D Minimap Radar
  drawMinimap(playerX, playerZ, playerYaw, matchData, vehicles = []) {
    if (!this.minimapCtx || !this.minimapCanvas) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 0.28; // World to minimap pixel scale

    ctx.clearRect(0, 0, w, h);

    // Save and rotate map relative to player or keep north up
    ctx.save();

    // Island Terrain background
    ctx.beginPath();
    ctx.arc(cx - playerX * scale, cy - playerZ * scale, 380 * scale, 0, Math.PI * 2);
    ctx.fillStyle = "#27ae60";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#eccc68";
    ctx.stroke();

    // Roads
    ctx.fillStyle = "#2f3542";
    ctx.fillRect(cx - playerX * scale - 6 * scale, 0, 12 * scale, h);
    ctx.fillRect(0, cy - playerZ * scale - 6 * scale, w, 12 * scale);

    // Safe Zone Blue Circle
    if (matchData && matchData.safeZone) {
      const sz = matchData.safeZone;
      const zx = cx + (sz.x - playerX) * scale;
      const zz = cy + (sz.z - playerZ) * scale;

      // Current Blue zone
      ctx.beginPath();
      ctx.arc(zx, zz, sz.radius * scale, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#00d2d3";
      ctx.stroke();

      // Target White Next Safe circle
      const tzx = cx + (sz.targetX - playerX) * scale;
      const tzz = cy + (sz.targetZ - playerZ) * scale;
      ctx.beginPath();
      ctx.arc(tzx, tzz, sz.targetRadius * scale, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Vehicles on Minimap
    if (vehicles) {
      vehicles.forEach(v => {
        const vx = cx + (v.x - playerX) * scale;
        const vz = cy + (v.z - playerZ) * scale;
        ctx.fillStyle = "#f39c12";
        ctx.beginPath();
        ctx.arc(vx, vz, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Local Player Arrow at Center
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(playerYaw);
    ctx.fillStyle = "#fffa65";
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.lineTo(-6, -7);
    ctx.lineTo(0, -4);
    ctx.lineTo(6, -7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // Update Compass Bar degrees (0 to 360)
  updateCompass(yaw) {
    const compassEl = document.getElementById("compassStrip");
    if (!compassEl) return;
    let deg = Math.round((-yaw * (180 / Math.PI)) % 360);
    if (deg < 0) deg += 360;
    const offset = (deg / 360) * 100;
    compassEl.style.transform = `translateX(-${offset}%)`;
    const headingText = document.getElementById("compassHeadingText");
    if (headingText) headingText.textContent = `${deg}°`;
  }
}

