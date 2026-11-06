const CHARACTER_SKILLS = {
  alok: {
    name: "Alok",
    skillName: "Drop the Beat",
    type: "active",
    cooldown: 45000,
    duration: 10000,
    description: "15% movement boost & heals nearby allies for 5 HP/s for 10s"
  },
  chrono: {
    name: "Chrono",
    skillName: "Time Turner",
    type: "active",
    cooldown: 50000,
    duration: 4000,
    description: "Force field absorbs up to 600 damage and increases movement speed"
  },
  kelly: {
    name: "Kelly",
    skillName: "Dash",
    type: "passive",
    description: "Permanent 6% sprint speed increase"
  },
  moco: {
    name: "Moco",
    skillName: "Hacker's Eye",
    type: "passive",
    duration: 5000,
    description: "Reveals enemies hit by the player for 5 seconds"
  },
  wukong: {
    name: "Wukong",
    skillName: "Camouflage",
    type: "active",
    cooldown: 45000,
    duration: 10000,
    description: "Transforms into a bush; cooldown resets after a takedown"
  },
  jota: {
    name: "Jota",
    skillName: "Sustained Raids",
    type: "passive",
    description: "Restores 20 HP when eliminating an enemy with a shotgun or SMG"
  },
  hayato: {
    name: "Hayato",
    skillName: "Bushido",
    type: "passive",
    description: "Armor penetration increases as health decreases (up to +20%)"
  },
  rafael: {
    name: "Rafael",
    skillName: "Dead Silent",
    type: "passive",
    description: "Silences sniper and marksman rifle shots"
  }
};

const activeEffects = new Map();
const lastActivation = new Map();
const revealedEnemies = new Map();

function now() {
  return Date.now();
}

function effectKey(playerId, effect) {
  return `${playerId}:${effect}`;
}

function initializeCharacter(player, characterId) {
  const id = String(characterId || "").toLowerCase();

  // Backward compatibility aliases
  const mappedId = id === "soldier1" ? "hayato" :
                   id === "soldier2" ? "kelly" :
                   id === "soldier3" ? "alok" :
                   id === "soldier4" ? "chrono" : id;

  if (!CHARACTER_SKILLS[mappedId]) {
    throw new Error("Invalid character selection: " + characterId);
  }

  player.character = mappedId;
  player.characterId = mappedId;
  player.activeEffects = {};
  player.forceFieldHP = 0;
  player.isCamouflaged = false;
  player.maxHealth = player.maxHealth || 100;
  player.teamId = player.teamId || "solo";

  return CHARACTER_SKILLS[mappedId];
}

function activateSkill(playerId, player) {
  if (!player || !player.alive) {
    return { success: false, message: "Player is not alive" };
  }

  const character = CHARACTER_SKILLS[player.character];
  if (!character || character.type !== "active") {
    return { success: false, message: "This character has no active skill" };
  }

  if (player.character === "chrono") {
    const key = effectKey(playerId, "chrono");
    const last = lastActivation.get(key) || 0;
    const remaining = (last + character.cooldown) - now();
    if (remaining > 0) {
      return { success: false, message: `Cooldown: ${Math.ceil(remaining / 1000)}s` };
    }

    lastActivation.set(key, now());
    player.forceFieldHP = 600;
    activeEffects.set(key, { expiresAt: now() + 4000 });
    return {
      success: true,
      skill: "chrono",
      duration: 4000,
      shield: 600,
      cooldown: character.cooldown
    };
  }

  if (player.character === "alok") {
    const key = effectKey(playerId, "alok");
    const last = lastActivation.get(key) || 0;
    const remaining = (last + character.cooldown) - now();
    if (remaining > 0) {
      return { success: false, message: `Cooldown: ${Math.ceil(remaining / 1000)}s` };
    }

    lastActivation.set(key, now());
    activeEffects.set(key, { expiresAt: now() + 10000 });
    return {
      success: true,
      skill: "alok",
      duration: 10000,
      cooldown: character.cooldown
    };
  }

  if (player.character === "wukong") {
    const key = effectKey(playerId, "wukong");
    const last = lastActivation.get(key) || 0;
    const remaining = (last + character.cooldown) - now();
    if (remaining > 0) {
      return { success: false, message: `Cooldown: ${Math.ceil(remaining / 1000)}s` };
    }

    lastActivation.set(key, now());
    player.isCamouflaged = true;
    activeEffects.set(key, { expiresAt: now() + 10000 });
    return {
      success: true,
      skill: "wukong",
      duration: 10000,
      camouflaged: true,
      cooldown: character.cooldown
    };
  }

  return { success: false, message: "Skill unavailable" };
}

function applyDamage(attacker, victim, baseDamage) {
  if (!victim || !victim.alive) {
    return { damage: 0, eliminated: false, health: victim?.health || 0, shieldRemaining: 0 };
  }

  let damage = Math.max(0, Number(baseDamage) || 0);

  // Hayato: up to 20% armor penetration as health decreases
  if (attacker?.character === "hayato") {
    const maxHp = attacker.maxHealth || 100;
    const healthRatio = Math.max(0, Math.min(1, attacker.health / maxHp));
    const armorPenetration = (1 - healthRatio) * 0.20;
    damage *= (1 + armorPenetration);
  }

  // Chrono force field absorbs damage first
  if (victim.forceFieldHP > 0) {
    const absorbed = Math.min(victim.forceFieldHP, damage);
    victim.forceFieldHP -= absorbed;
    damage -= absorbed;
  }

  victim.health = Math.max(0, victim.health - damage);
  const eliminated = victim.health <= 0;
  if (eliminated) {
    victim.alive = false;
  }

  return {
    damage,
    shieldRemaining: victim.forceFieldHP || 0,
    health: victim.health,
    eliminated
  };
}

function getMovementMultiplier(playerId, player, sprinting) {
  let multiplier = 1;

  // Kelly: 6% sprint boost
  if (player.character === "kelly" && sprinting) {
    multiplier *= 1.06;
  }

  // Alok: 15% movement boost
  if (isEffectActive(playerId, "alok")) {
    multiplier *= 1.15;
  }

  // Chrono: 15% temporary movement boost
  if (isEffectActive(playerId, "chrono")) {
    multiplier *= 1.15;
  }

  return multiplier;
}

function isEffectActive(playerId, effect) {
  const item = activeEffects.get(effectKey(playerId, effect));
  return Boolean(item && item.expiresAt > now());
}

function onWeaponHit(attackerId, attacker, victimId) {
  if (!attacker || attacker.character !== "moco") return;
  const key = effectKey(attackerId, "moco");
  revealedEnemies.set(key + ":" + victimId, {
    victimId,
    expiresAt: now() + 5000
  });
}

function isEnemyRevealed(attackerId, victimId) {
  const key = effectKey(attackerId, "moco") + ":" + victimId;
  const mark = revealedEnemies.get(key);
  return Boolean(mark && mark.expiresAt > now());
}

function onElimination(killerId, killer, victim, weaponType) {
  if (!killer) return;

  // Jota: restore 20 HP after shotgun or SMG elimination
  const wType = String(weaponType || "").toLowerCase();
  if (killer.character === "jota" && (wType.includes("shotgun") || wType.includes("smg"))) {
    const maxHp = killer.maxHealth || 100;
    killer.health = Math.min(maxHp, killer.health + 20);
  }

  // Wukong: reset camouflage cooldown after a takedown
  if (killer.character === "wukong") {
    const key = effectKey(killerId, "wukong");
    lastActivation.delete(key);
  }
}

function isWeaponSilent(player, weaponType) {
  const wType = String(weaponType || "").toLowerCase();
  return (
    player?.character === "rafael" &&
    (wType.includes("sniper") || wType.includes("marksman"))
  );
}

function tick(players, io) {
  const currentTime = now();

  // Alok healing: 5 HP per second for nearby allies & self
  for (const [playerId, player] of Object.entries(players)) {
    if (!player.alive) continue;

    if (isEffectActive(playerId, "alok")) {
      const maxHp = player.maxHealth || 100;
      player.health = Math.min(maxHp, player.health + 0.25); // 5 HP per sec (at 50ms tick rate)

      for (const [allyId, ally] of Object.entries(players)) {
        if (allyId === playerId || !ally.alive) continue;
        if (ally.teamId != null && player.teamId != null && ally.teamId !== player.teamId) continue;

        const distance = Math.hypot(player.x - ally.x, player.z - ally.z);
        if (distance <= 10) {
          const allyMax = ally.maxHealth || 100;
          ally.health = Math.min(allyMax, ally.health + 0.25);
        }
      }
    }
  }

  // Expire active effects
  for (const [key, effect] of activeEffects.entries()) {
    if (effect.expiresAt <= currentTime) {
      const [playerId, effectName] = key.split(":");
      const player = players[playerId];
      if (player) {
        if (effectName === "wukong") {
          player.isCamouflaged = false;
        }
        if (effectName === "chrono") {
          player.forceFieldHP = 0;
        }
      }
      activeEffects.delete(key);
      io.to(playerId).emit("skillExpired", { skill: effectName });
      io.emit("playerSkillExpired", { playerId, skill: effectName });
    }
  }

  // Expire Moco enemy marks
  for (const [key, mark] of revealedEnemies.entries()) {
    if (mark.expiresAt <= currentTime) {
      revealedEnemies.delete(key);
    }
  }
}

function cleanupPlayer(playerId) {
  for (const key of activeEffects.keys()) {
    if (key.startsWith(playerId + ":")) {
      activeEffects.delete(key);
    }
  }
  for (const key of lastActivation.keys()) {
    if (key.startsWith(playerId + ":")) {
      lastActivation.delete(key);
    }
  }
  for (const key of revealedEnemies.keys()) {
    if (key.startsWith(playerId + ":") || key.endsWith(":" + playerId)) {
      revealedEnemies.delete(key);
    }
  }
}

module.exports = {
  CHARACTER_SKILLS,
  initializeCharacter,
  activateSkill,
  applyDamage,
  getMovementMultiplier,
  onWeaponHit,
  isEnemyRevealed,
  onElimination,
  isWeaponSilent,
  tick,
  cleanupPlayer
};
