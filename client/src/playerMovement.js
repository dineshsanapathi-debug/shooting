import * as THREE from "three";

export function createPlayerMovement(player, camera) {
  const keys = {};

  let verticalVelocity = 0;
  let isGrounded = true;

  let yaw = 0;
  let pitch = 0.25;

  const gravity = 22;
  const jumpPower = 8;
  const walkSpeed = 6;
  const runSpeed = 11;
  const cameraDistance = 8;

  const joystick = { x: 0, y: 0 };

  const direction = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const cameraOffset = new THREE.Vector3();

  window.addEventListener("keydown", event => {
    keys[event.code] = true;
  });

  window.addEventListener("keyup", event => {
    keys[event.code] = false;
  });

  window.addEventListener("mousemove", event => {
    if (document.pointerLockElement) {
      yaw -= event.movementX * 0.002;
      pitch -= event.movementY * 0.002;

      pitch = THREE.MathUtils.clamp(
        pitch,
        -0.2,
        0.8
      );
    }
  });

  window.addEventListener("keydown", event => {
    if (event.code === "Space" && isGrounded) {
      verticalVelocity = jumpPower;
      isGrounded = false;
    }
  });

  // Mobile joystick
  const joystickElement =
    document.getElementById("joystick");

  const knob =
    document.getElementById("joystickKnob");

  if (joystickElement && knob) {
    let activeTouch = null;

    joystickElement.addEventListener(
      "pointerdown",
      event => {
        activeTouch = event.pointerId;
        joystickElement.setPointerCapture(activeTouch);
        updateJoystick(event);
      }
    );

    joystickElement.addEventListener(
      "pointermove",
      event => {
        if (event.pointerId === activeTouch) {
          updateJoystick(event);
        }
      }
    );

    function updateJoystick(event) {
      const rect =
        joystickElement.getBoundingClientRect();

      let dx =
        event.clientX - (rect.left + rect.width / 2);

      let dy =
        event.clientY - (rect.top + rect.height / 2);

      const maxDistance = 35;
      const length = Math.hypot(dx, dy);

      if (length > maxDistance) {
        dx = dx / length * maxDistance;
        dy = dy / length * maxDistance;
      }

      joystick.x = dx / maxDistance;
      joystick.y = dy / maxDistance;

      knob.style.transform =
        `translate(${dx}px, ${dy}px)`;
    }

    function resetJoystick() {
      activeTouch = null;
      joystick.x = 0;
      joystick.y = 0;
      knob.style.transform = "translate(0px, 0px)";
    }

    joystickElement.addEventListener(
      "pointerup",
      resetJoystick
    );

    joystickElement.addEventListener(
      "pointercancel",
      resetJoystick
    );
  }

  function update(delta) {
    const forwardInput =
      (keys.KeyW ? 1 : 0) -
      (keys.KeyS ? 1 : 0) -
      joystick.y;

    const sideInput =
      (keys.KeyD ? 1 : 0) -
      (keys.KeyA ? 1 : 0) +
      joystick.x;

    forward.set(
      -Math.sin(yaw),
      0,
      -Math.cos(yaw)
    );

    right.set(
      Math.cos(yaw),
      0,
      -Math.sin(yaw)
    );

    direction.set(0, 0, 0);
    direction.addScaledVector(forward, forwardInput);
    direction.addScaledVector(right, sideInput);

    if (direction.lengthSq() > 1) {
      direction.normalize();
    }

    const moving = direction.lengthSq() > 0.001;

    const running =
      keys.ShiftLeft || keys.ShiftRight;

    if (moving) {
      player.position.addScaledVector(
        direction,
        (running ? runSpeed : walkSpeed) * delta
      );

      const targetRotation = Math.atan2(
        -direction.x,
        -direction.z
      );

      let difference =
        targetRotation - player.rotation.y;

      difference = Math.atan2(
        Math.sin(difference),
        Math.cos(difference)
      );

      player.rotation.y +=
        difference * Math.min(1, delta * 12);
    }

    // Gravity
    verticalVelocity -= gravity * delta;
    player.position.y += verticalVelocity * delta;

    // Ground collision
    if (player.position.y <= 0) {
      player.position.y = 0;
      verticalVelocity = 0;
      isGrounded = true;
    }

    // World boundaries
    player.position.x = THREE.MathUtils.clamp(
      player.position.x, -145, 145
    );

    player.position.z = THREE.MathUtils.clamp(
      player.position.z, -145, 145
    );

    // Third-person camera
    const horizontalDistance =
      Math.cos(pitch) * cameraDistance;

    cameraOffset.set(
      Math.sin(yaw) * horizontalDistance,
      3 + Math.sin(pitch) * cameraDistance,
      Math.cos(yaw) * horizontalDistance
    );

    const desiredCameraPosition =
      player.position.clone().add(cameraOffset);

    camera.position.lerp(
      desiredCameraPosition,
      Math.min(1, delta * 8)
    );

    camera.lookAt(
      player.position.x,
      player.position.y + 1.5,
      player.position.z
    );

    return {
      moving,
      running: moving && running,
      jumping: !isGrounded,
      rotation: player.rotation.y
    };
  }

  return { update, keys };
}

