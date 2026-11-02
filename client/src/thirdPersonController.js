import * as THREE from "three";

export function createThirdPersonController(
  player,
  camera,
  renderer
) {
  const keys = {};

  let yaw = 0;
  let pitch = 0.25;

  let verticalVelocity = 0;
  let grounded = true;

  let crouching = false;
  let aiming = false;
  let shooting = false;

  const walkSpeed = 5;
  const runSpeed = 9;
  const crouchSpeed = 2.5;
  const jumpPower = 8;
  const gravity = 22;

  const cameraTarget = new THREE.Vector3();
  const cameraPosition = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();

  const joystick = {
    x: 0,
    y: 0
  };

  window.addEventListener("keydown", event => {
    keys[event.code] = true;

    if (event.code === "Space") {
      event.preventDefault();
      jump();
    }

    if (event.code === "ControlLeft" || event.code === "ControlRight" || event.code === "KeyC") {
      crouching = !crouching;
    }
  });

  window.addEventListener("keyup", event => {
    keys[event.code] = false;
  });

  renderer.domElement.addEventListener(
    "contextmenu",
    event => event.preventDefault()
  );

  window.addEventListener("mousemove", event => {
    if (document.pointerLockElement !== renderer.domElement && document.pointerLockElement !== document.body) {
      return;
    }

    yaw -= event.movementX * 0.002;
    pitch -= event.movementY * 0.002;

    pitch = THREE.MathUtils.clamp(
      pitch,
      -0.25,
      0.8
    );
  });

  window.addEventListener("mousedown", event => {
    if (event.button === 2) aiming = true;
    if (event.button === 0) shooting = true;
  });

  window.addEventListener("mouseup", event => {
    if (event.button === 2) aiming = false;
    if (event.button === 0) shooting = false;
  });

  function jump() {
    if (grounded && !crouching) {
      verticalVelocity = jumpPower;
      grounded = false;
    }
  }

  function setCrouching(value) {
    crouching = value;
  }

  function setAiming(value) {
    aiming = value;
  }

  function setJoystick(x, y) {
    joystick.x = THREE.MathUtils.clamp(x, -1, 1);
    joystick.y = THREE.MathUtils.clamp(y, -1, 1);
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
      (keys.ShiftLeft || keys.ShiftRight) &&
      moving &&
      !crouching;

    let speed = walkSpeed;

    if (running) speed = runSpeed;
    if (crouching) speed = crouchSpeed;

    player.position.addScaledVector(
      direction,
      speed * delta
    );

    // Character rotation
    if (moving && !aiming) {
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
    } else if (aiming) {
      // Face camera look direction while aiming
      player.rotation.y = yaw;
    }

    // Jump and gravity
    verticalVelocity -= gravity * delta;
    player.position.y += verticalVelocity * delta;

    if (player.position.y <= 0) {
      player.position.y = 0;
      verticalVelocity = 0;
      grounded = true;
    }

    // World boundaries
    player.position.x = THREE.MathUtils.clamp(
      player.position.x, -145, 145
    );

    player.position.z = THREE.MathUtils.clamp(
      player.position.z, -145, 145
    );

    // Camera positioning
    const distance = aiming ? 4 : 7;
    const height = aiming ? 2.2 : 3;

    cameraPosition.set(
      player.position.x + Math.sin(yaw) * distance,
      player.position.y + height +
        Math.sin(pitch) * distance,
      player.position.z + Math.cos(yaw) * distance
    );

    camera.position.lerp(
      cameraPosition,
      Math.min(1, delta * 10)
    );

    cameraTarget.set(
      player.position.x,
      player.position.y + 1.5,
      player.position.z
    );

    camera.lookAt(cameraTarget);

    return {
      moving,
      running,
      crouching,
      aiming,
      shooting,
      jumping: !grounded,
      rotation: player.rotation.y
    };
  }

  return {
    update,
    jump,
    setCrouching,
    setAiming,
    setJoystick
  };
}
