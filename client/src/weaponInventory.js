import * as THREE from "three";
import {
  WEAPON_DATA,
  createWeapon
} from "./weaponSystem.js";

export class WeaponInventory {
  constructor(scene, player, camera, socket) {
    this.scene = scene;
    this.player = player;
    this.camera = camera;
    this.socket = socket;

    this.groundWeapons = new Map();

    this.inventory = [null, null, null];
    this.currentSlot = 0;
    this.currentWeapon = null;

    this.nearestWeapon = null;
    this.lastShotTime = 0;
    this.isReloading = false;

    this.raycaster = new THREE.Raycaster();

    this.pickupDistance = 3.5;
    this.playerWeaponSocket = null;

    // Create a hand attachment point
    this.playerWeaponSocket = new THREE.Group();
    this.playerWeaponSocket.name = "PlayerWeaponSocket";
    this.player.add(this.playerWeaponSocket);

    this.playerWeaponSocket.position.set(
      0.35,
      1.15,
      -0.35
    );

    this.playerWeaponSocket.rotation.set(
      0,
      0,
      0
    );

    window.addEventListener("keydown", event => {
      if (event.repeat) return;

      if (event.code === "KeyE") {
        this.pickupNearest();
      }

      if (event.code === "Digit1") {
        this.switchWeapon(0);
      }

      if (event.code === "Digit2") {
        this.switchWeapon(1);
      }

      if (event.code === "Digit3") {
        this.switchWeapon(2);
      }

      if (event.code === "KeyR") {
        this.reload();
      }
    });

    window.addEventListener("mousedown", event => {
      if (event.button === 0) {
        this.shoot();
      }
    });
  }

  async addGroundWeapon(id, type, position) {
    const weapon = await createWeapon(type);

    weapon.model.position.set(
      position.x,
      position.y + 0.35,
      position.z
    );

    weapon.model.rotation.x = -0.15;

    this.scene.add(weapon.model);

    this.groundWeapons.set(id, {
      id,
      type,
      model: weapon.model,
      data: weapon.data
    });
  }

  update() {
    let nearest = null;
    let nearestDistance = Infinity;

    for (const weapon of this.groundWeapons.values()) {
      const distance = this.player.position.distanceTo(
        weapon.model.position
      );

      if (
        distance < this.pickupDistance &&
        distance < nearestDistance
      ) {
        nearest = weapon;
        nearestDistance = distance;
      }
    }

    this.nearestWeapon = nearest;

    this.updatePickupUI();
  }

  updatePickupUI() {
    const prompt = document.getElementById("pickupPrompt");

    if (!prompt) return;

    if (this.nearestWeapon) {
      prompt.style.display = "block";

      prompt.textContent =
        `Press E to collect ${this.nearestWeapon.data.name}`;
    } else {
      prompt.style.display = "none";
    }
  }

  pickupNearest() {
    if (!this.nearestWeapon) return;

    const weapon = this.nearestWeapon;

    this.socket.emit("pickupWeapon", {
      weaponId: weapon.id
    });
  }

  async confirmPickup(weaponId, type) {
    const weapon = this.groundWeapons.get(weaponId);

    if (!weapon) return;

    const emptySlot = this.inventory.findIndex(
      slot => slot === null
    );

    if (emptySlot === -1) {
      this.showMessage("Inventory full!");
      return;
    }

    this.scene.remove(weapon.model);
    this.groundWeapons.delete(weaponId);

    const data = WEAPON_DATA[type];

    this.inventory[emptySlot] = {
      type,
      data,
      ammo: data.magazine,
      reserveAmmo: data.reserveAmmo,
      model: null
    };

    this.showMessage(`${data.name} collected!`);

    if (this.currentSlot === emptySlot || !this.currentWeapon) {
      await this.equipWeapon(emptySlot);
    }

    this.updateInventoryUI();
  }

  async equipWeapon(slot) {
    const weapon = this.inventory[slot];

    if (!weapon) return;

    if (this.currentWeapon?.model) {
      this.playerWeaponSocket.remove(
        this.currentWeapon.model
      );
    }

    if (!weapon.model) {
      const loaded = await createWeapon(weapon.type);
      weapon.model = loaded.model;
    }

    this.playerWeaponSocket.add(weapon.model);

    weapon.model.position.set(0, 0, 0);
    weapon.model.rotation.set(0, 0, 0);
    weapon.model.scale.setScalar(1);

    this.currentWeapon = weapon;
    this.currentSlot = slot;

    this.updateInventoryUI();
  }

  switchWeapon(slot) {
    if (slot < 0 || slot > 2) return;
    if (!this.inventory[slot]) return;

    this.equipWeapon(slot);
  }

  shoot() {
    const weapon = this.currentWeapon;

    if (!weapon || this.isReloading) return;

    const now = performance.now();

    if (now - this.lastShotTime < weapon.data.fireRate) {
      return;
    }

    if (weapon.ammo <= 0) {
      this.showMessage("Press R to reload!");
      return;
    }

    this.lastShotTime = now;
    weapon.ammo--;

    this.updateInventoryUI();

    // Server validates ammo, fire rate and damage.
    this.socket.emit("shootWeapon", {
      weaponType: weapon.type,
      slot: this.currentSlot,
      origin: this.camera.position.toArray(),
      direction: this.getAimDirection().toArray()
    });
  }

  getAimDirection() {
    const direction = new THREE.Vector3();

    this.camera.getWorldDirection(direction);

    return direction.normalize();
  }

  reload() {
    const weapon = this.currentWeapon;

    if (!weapon || this.isReloading) return;

    if (weapon.ammo >= weapon.data.magazine) return;
    if (weapon.reserveAmmo <= 0) return;

    this.isReloading = true;
    this.showMessage("Reloading...");

    this.socket.emit("reloadWeapon", {
      slot: this.currentSlot
    });
  }

  confirmReload(slot, ammo, reserveAmmo) {
    const weapon = this.inventory[slot];

    if (!weapon) return;

    weapon.ammo = ammo;
    weapon.reserveAmmo = reserveAmmo;

    this.isReloading = false;

    this.updateInventoryUI();
  }

  showMessage(message) {
    const element = document.getElementById("gameMessage");

    if (!element) return;

    element.textContent = message;
    element.style.display = "block";

    setTimeout(() => {
      element.style.display = "none";
    }, 1800);
  }

  updateInventoryUI() {
    const name = document.getElementById("weaponName");
    const ammo = document.getElementById("weaponAmmo");

    if (name) {
      name.textContent =
        this.currentWeapon?.data.name || "No weapon";
    }

    if (ammo) {
      ammo.textContent = this.currentWeapon
        ? `${this.currentWeapon.ammo} / ${this.currentWeapon.reserveAmmo}`
        : "0 / 0";
    }

    // Highlight active slot button
    [0, 1, 2].forEach(s => {
      const btn = document.getElementById(`slot${s + 1}`);
      if (btn) {
        if (s === this.currentSlot && this.currentWeapon) {
          btn.style.borderColor = "#00ff88";
          btn.style.background = "#1e3a29";
        } else {
          btn.style.borderColor = "white";
          btn.style.background = "#333";
        }
      }
    });
  }
}
