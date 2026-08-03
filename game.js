(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const messageEl = document.getElementById('message');
  const resetBtn = document.getElementById('resetBtn');

  const W = canvas.width;
  const H = canvas.height;
  const ROOM = { left: 68, top: 58, right: W - 68, bottom: H - 52 };
  const DOOR = { x: W / 2 - 62, y: ROOM.top - 12, w: 124, h: 34 };

  const input = {
    up: false, down: false, left: false, right: false,
    dash: false, jump: false, stick: false,
    dashPressed: false, jumpPressed: false, stickPressed: false,
  };

  const keyMap = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ShiftLeft: 'dash', ShiftRight: 'dash', KeyX: 'dash',
    Space: 'jump', KeyZ: 'jump',
    KeyC: 'stick', KeyE: 'stick',
  };

  let player;
  let enemies;
  let obstacles;
  let pots;
  let particles;
  let doorOpen;
  let roomCleared;
  let lastTime = performance.now();
  let shake = 0;

  function resetGame() {
    player = {
      x: W / 2,
      y: H - 120,
      z: 0,
      vz: 0,
      radius: 24,
      speed: 250,
      facingX: 0,
      facingY: -1,
      dashTimer: 0,
      dashCooldown: 0,
      dashX: 0,
      dashY: -1,
      invuln: 0,
      slam: false,
      diagonalSlam: false,
      slamX: 0,
      slamY: -1,
      dashJump: false,
      dashJumpX: 0,
      dashJumpY: -1,
      airDashUsed: false,
      wallStick: 0,
      graceStick: 0,
      wallNormalX: 0,
      wallNormalY: 0,
      wallJumpTimer: 0,
      wallJumpX: 0,
      wallJumpY: 0,
      attachedEnemy: null,
      attachTimer: 0,
      hurtTimer: 0,
      hiddenPot: null,
      potCharge: 0,
      potRolling: false,
      potRollX: 0,
      potRollY: -1,
    };

    obstacles = [
      { x: 315, y: 205, w: 86, h: 112, height: 999, type: 'pillar' },
      { x: 585, y: 175, w: 116, h: 54, height: 58, type: 'crate' },
      { x: 510, y: 350, w: 88, h: 58, height: 58, type: 'crate' },
    ];
    pots = [
      { x: 235, y: 355, radius: 28, broken: false, shake: 0, rolling: false, rollSpeed: 0 },
      { x: 745, y: 330, radius: 28, broken: false, shake: 0, rolling: false, rollSpeed: 0 },
    ];
    enemies = [
      makeEnemy(205, 180, 'sword'),
      makeEnemy(500, 250, 'spear'),
      makeEnemy(755, 185, 'sword'),
    ];
    particles = [];
    doorOpen = false;
    roomCleared = false;
    messageEl.textContent = '敵を全員気絶させると扉が開きます';
  }

  function makeEnemy(x, y, weapon = 'sword') {
    const patrolRadius = weapon === 'spear' ? 115 : 145;
    return {
      x, y,
      radius: 25,
      hp: 2,
      state: 'walk', // walk, tripped, stunned（既存戦闘状態）
      stateTimer: 0,
      angle: Math.random() * Math.PI * 2,
      speed: 58 + Math.random() * 18,
      faceCooldown: 0,
      weapon,
      attackState: 'idle', // idle, windup, active, recover
      attackTimer: 0.5 + Math.random(),
      attackAngle: 0,
      attackHit: false,
      strugglePhase: Math.random() * Math.PI * 2,

      // v0.9 敵AI。戦闘状態とは分離し、既存の転倒・気絶処理を維持する。
      aiState: 'patrol', // patrol, chase, search, investigatePot
      visionRange: weapon === 'spear' ? 300 : 270,
      visionHalfAngle: weapon === 'spear' ? 0.62 : 0.78,
      alert: 0,
      lostSightTimer: 0,
      searchTimer: 0,
      lastSeenX: x,
      lastSeenY: y,
      targetPot: null,
      inspectTimer: 0,
      patrolIndex: 0,
      patrolWait: Math.random() * 0.8,
      patrolPoints: [
        { x: clamp(x - patrolRadius, ROOM.left + 38, ROOM.right - 38), y: clamp(y - patrolRadius * 0.45, ROOM.top + 38, ROOM.bottom - 38) },
        { x: clamp(x + patrolRadius, ROOM.left + 38, ROOM.right - 38), y: clamp(y - patrolRadius * 0.25, ROOM.top + 38, ROOM.bottom - 38) },
        { x: clamp(x + patrolRadius * 0.55, ROOM.left + 38, ROOM.right - 38), y: clamp(y + patrolRadius * 0.7, ROOM.top + 38, ROOM.bottom - 38) },
        { x: clamp(x - patrolRadius * 0.65, ROOM.left + 38, ROOM.right - 38), y: clamp(y + patrolRadius * 0.6, ROOM.top + 38, ROOM.bottom - 38) },
      ],
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setInput(name, value) {
    if (!(name in input)) return;
    if (value && !input[name]) input[name + 'Pressed'] = true;
    input[name] = value;
  }

  window.addEventListener('keydown', (e) => {
    const name = keyMap[e.code];
    if (!name) return;
    e.preventDefault();
    setInput(name, true);
  });
  window.addEventListener('keyup', (e) => {
    const name = keyMap[e.code];
    if (!name) return;
    e.preventDefault();
    setInput(name, false);
  });

  document.querySelectorAll('[data-key]').forEach((button) => {
    const name = button.dataset.key;
    const press = (e) => {
      e.preventDefault();
      button.classList.add('pressed');
      button.setPointerCapture?.(e.pointerId);
      setInput(name, true);
    };
    const release = (e) => {
      e.preventDefault();
      button.classList.remove('pressed');
      setInput(name, false);
    };
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  });

  // 円形アナログスティック。斜め入力にも対応します。
  const joystick = document.getElementById('joystick');
  const stickKnob = document.getElementById('stickKnob');
  let joystickPointer = null;

  function updateJoystick(e) {
    const rect = joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const max = rect.width * 0.29;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const length = Math.hypot(dx, dy);
    if (length > max) {
      dx = dx / length * max;
      dy = dy / length * max;
    }
    stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;

    const nx = dx / max;
    const ny = dy / max;
    const dead = 0.24;
    setInput('left', nx < -dead);
    setInput('right', nx > dead);
    setInput('up', ny < -dead);
    setInput('down', ny > dead);
  }

  function releaseJoystick(e) {
    if (joystickPointer !== null && e?.pointerId !== undefined && e.pointerId !== joystickPointer) return;
    joystickPointer = null;
    joystick.classList.remove('active');
    stickKnob.style.transform = 'translate(0px, 0px)';
    setInput('left', false);
    setInput('right', false);
    setInput('up', false);
    setInput('down', false);
  }

  joystick.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    joystickPointer = e.pointerId;
    joystick.setPointerCapture?.(e.pointerId);
    joystick.classList.add('active');
    updateJoystick(e);
  });
  joystick.addEventListener('pointermove', (e) => {
    if (e.pointerId === joystickPointer) updateJoystick(e);
  });
  joystick.addEventListener('pointerup', releaseJoystick);
  joystick.addEventListener('pointercancel', releaseJoystick);
  joystick.addEventListener('lostpointercapture', releaseJoystick);

  resetBtn.addEventListener('click', resetGame);

  function update(dt) {
    const p = player;
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.dashTimer = Math.max(0, p.dashTimer - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.wallStick = Math.max(0, p.wallStick - dt);
    p.graceStick = Math.max(0, p.graceStick - dt);
    p.hurtTimer = Math.max(0, p.hurtTimer - dt);
    p.wallJumpTimer = Math.max(0, p.wallJumpTimer - dt);
    shake = Math.max(0, shake - dt * 22);

    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const m = Math.hypot(mx, my);
    if (m > 0) {
      mx /= m; my /= m;
      p.facingX = mx; p.facingY = my;
    }

    // 壺の中では安全に隠れる。方向入力＋ダッシュ長押しで震え、転がり始める。
    if (p.hiddenPot) {
      const pot = p.hiddenPot;
      p.x = pot.x;
      p.y = pot.y + 4;
      p.z = 0;
      p.vz = 0;
      p.dashTimer = 0;
      p.slam = false;

      if (input.jumpPressed) {
        exitPot(pot, false);
      } else {
        if (!p.potRolling && input.dash && m > 0) {
          p.potCharge += dt;
          pot.shake = Math.min(1, p.potCharge / 0.38);
          if (p.potCharge > 0.10) alertEnemiesToPot(pot, 185 + pot.shake * 80, false);
          p.potRollX = mx;
          p.potRollY = my;
          if (p.potCharge >= 0.38) {
            p.potRolling = true;
            pot.rolling = true;
            pot.rollSpeed = 455;
            pot.shake = 0;
            shake = Math.max(shake, 3);
            burst(pot.x, pot.y, 8);
            messageEl.textContent = '壺が転がり出した！ 最初の衝突で割れます';
          }
        } else if (!p.potRolling) {
          p.potCharge = Math.max(0, p.potCharge - dt * 2.5);
          pot.shake = p.potCharge > 0 ? Math.min(1, p.potCharge / 0.38) : 0;
        }

        if (p.potRolling) updateRollingPot(pot, dt);
      }

      for (const e of enemies) updateEnemy(e, dt);
      updateParticles(dt);
      checkDoorOpen();
      clearPressed();
      return;
    }

    if (input.jumpPressed && p.attachedEnemy) {
      p.attachedEnemy = null;
      p.attachTimer = 0;
      p.vz = 370;
      p.airDashUsed = false;
    } else if (input.jumpPressed && (p.z <= 0.01 || p.wallStick > 0 || p.graceStick > 0)) {
      const fromWall = p.wallStick > 0 || p.graceStick > 0;
      const fromDash = p.dashTimer > 0 && !fromWall;

      if (fromDash) {
        // ダッシュの勢いをジャンプへ変換。通常より高く、遠くまで飛ぶ。
        p.vz = 475;
        p.dashJump = true;
        p.dashJumpX = p.dashX;
        p.dashJumpY = p.dashY;
        p.dashTimer = 0;
        p.invuln = Math.max(p.invuln, 0.12);
        burst(p.x, p.y, 12);
      } else {
        p.vz = fromWall ? 410 : 370;
        p.dashJump = false;
      }

      p.airDashUsed = false;
      p.diagonalSlam = false;
      p.z = Math.max(p.z, 1);
      if (fromWall) {
        // 接している面の反対方向へ強く跳ね返る。
        p.wallJumpX = p.wallNormalX;
        p.wallJumpY = p.wallNormalY;
        p.wallJumpTimer = 0.30;
        p.x += p.wallNormalX * 10;
        p.y += p.wallNormalY * 10;
        burst(p.x, p.y, 12);
      }
      p.wallStick = 0;
      p.graceStick = 0;
    }

    if (input.dashPressed && !p.attachedEnemy) {
      if (p.z > 8 && !p.airDashUsed) {
        p.slam = true;
        p.airDashUsed = true;
        p.diagonalSlam = p.dashJump;
        p.slamX = p.dashJump ? p.dashJumpX : (m > 0 ? mx : p.facingX);
        p.slamY = p.dashJump ? p.dashJumpY : (m > 0 ? my : p.facingY);
        p.vz = p.diagonalSlam ? -650 : -760;
        p.invuln = Math.max(p.invuln, 0.18);
        burst(p.x, p.y, p.diagonalSlam ? 14 : 9);
      } else if (p.z <= 8 && p.dashCooldown <= 0) {
        p.dashTimer = 0.23;
        p.dashCooldown = 0.42;
        p.invuln = 0.28;
        p.dashX = m > 0 ? mx : p.facingX;
        p.dashY = m > 0 ? my : p.facingY;
        p.dashJump = false;
        p.airDashUsed = false;
        burst(p.x, p.y, 8);
      }
    }

    if (p.attachedEnemy) {
      const e = p.attachedEnemy;
      if (e.state === 'stunned') {
        p.attachedEnemy = null;
      } else {
        e.attackState = 'idle';
        e.attackTimer = Math.max(e.attackTimer, 0.45);
        e.strugglePhase += dt * 14;
        p.x = e.x + Math.sin(e.strugglePhase) * 3;
        p.y = e.y - 3;
        p.z = 39 + Math.cos(e.strugglePhase * 1.7) * 2;
        p.vz = 0;
        p.attachTimer += dt;
        if (!input.stick) {
          p.attachedEnemy = null;
          p.z = 20;
          p.vz = 80;
          e.faceCooldown = 0.7;
        } else if (p.attachTimer >= 1.25) {
          e.state = 'stunned';
          e.stateTimer = 999;
          p.attachedEnemy = null;
          p.z = 15;
          p.vz = 110;
          burst(e.x, e.y, 16);
        }
      }
    } else {
      const oldX = p.x;
      const oldY = p.y;
      if (p.wallJumpTimer > 0) {
        p.x += (p.wallJumpX * 470 + mx * 80) * dt;
        p.y += (p.wallJumpY * 470 + my * 80) * dt;
      } else if (p.dashTimer > 0) {
        p.x += p.dashX * 720 * dt;
        p.y += p.dashY * 720 * dt;
      } else if (p.slam && p.diagonalSlam) {
        // ダッシュジャンプからの急降下は、進行方向へ斜めに突っ込む。
        p.x += p.slamX * 520 * dt;
        p.y += p.slamY * 520 * dt;
      } else if (p.dashJump && p.z > 0) {
        // 慣性を残しつつ、スティックでも少し軌道修正できる。
        p.x += (p.dashJumpX * 390 + mx * 95) * dt;
        p.y += (p.dashJumpY * 390 + my * 95) * dt;
      } else {
        const airControl = p.z > 0 ? 0.88 : 1;
        p.x += mx * p.speed * airControl * dt;
        p.y += my * p.speed * airControl * dt;
      }

      resolvePlayerObstacles(oldX, oldY);

      if (p.z > 0 || p.vz !== 0) {
        p.vz -= 590 * dt; // 弱めの重力
        p.z += p.vz * dt;
        if (p.vz < 0 && p.z <= 34 && !p.slam) {
          const pot = pots.find((pot) => !pot.broken && Math.hypot(p.x - pot.x, p.y - pot.y) < 24);
          if (pot) {
            p.hiddenPot = pot;
            p.z = 0;
            p.vz = 0;
            p.dashJump = false;
            p.airDashUsed = false;
            messageEl.textContent = '壺の中に隠れた！ 見られていなければ安全です';
            burst(pot.x, pot.y, 8);
            alertEnemiesToPot(pot, 0, true);
          }
        }
        if (!p.hiddenPot && p.z <= 0) {
          const impact = p.slam;
          p.z = 0;
          p.vz = 0;
          p.slam = false;
          p.diagonalSlam = false;
          p.dashJump = false;
          p.airDashUsed = false;
          if (impact) slamImpact();
        }
      }
    }

    const wall = findStickSurface(p);
    if (input.stick && wall && p.z > 3 && !p.attachedEnemy) {
      p.wallStick = 0.12;
      p.graceStick = 0.30;
      p.wallNormalX = wall.nx;
      p.wallNormalY = wall.ny;
      p.vz = Math.max(p.vz, -18);
      // 壁面へ軽く吸いつけ、入力が多少ずれても外れにくくする。
      p.x += wall.nx * wall.push;
      p.y += wall.ny * wall.push;
    } else if (!input.stick && p.wallStick > 0) {
      p.graceStick = 0.30;
      p.wallStick = 0;
    }

    p.x = Math.max(ROOM.left + p.radius, Math.min(ROOM.right - p.radius, p.x));
    p.y = Math.max(ROOM.top + p.radius, Math.min(ROOM.bottom - p.radius, p.y));

    for (const e of enemies) updateEnemy(e, dt);
    handlePlayerEnemyInteractions();

    updateParticles(dt);

    checkDoorOpen();
    if (doorOpen && !roomCleared && p.y < ROOM.top + 34 && p.x > DOOR.x && p.x < DOOR.x + DOOR.w) {
      roomCleared = true;
      messageEl.textContent = '試作クリア！';
      burst(p.x, p.y, 28);
    }

    clearPressed();
  }

  function checkDoorOpen() {
    if (!doorOpen && enemies.every((e) => e.state === 'stunned')) {
      doorOpen = true;
      messageEl.textContent = '扉が開いた！ 上の出口へ！';
    }
  }

  function exitPot(pot, broken, launchX = player.facingX, launchY = player.facingY) {
    player.hiddenPot = null;
    player.potCharge = 0;
    player.potRolling = false;
    player.z = 20;
    player.vz = broken ? 440 : 390;
    player.airDashUsed = false;
    player.dashJump = false;
    const len = Math.hypot(launchX, launchY) || 1;
    player.x = pot.x + launchX / len * (broken ? 30 : 12);
    player.y = pot.y + launchY / len * (broken ? 30 : 12);
    pot.rolling = false;
    pot.rollSpeed = 0;
    pot.shake = 0;
    burst(pot.x, pot.y, broken ? 22 : 10);
    messageEl.textContent = broken ? '壺が割れ、スライムが勢いよく飛び出した！' : '壺から飛び出した！';
  }

  function breakPot(pot, cause, hitEnemy = null) {
    if (pot.broken) return;
    pot.broken = true;
    pot.rolling = false;
    pot.rollSpeed = 0;
    shake = Math.max(shake, 9);

    if (hitEnemy) {
      if (hitEnemy.weapon === 'spear') {
        hitEnemy.hp = 0;
        hitEnemy.state = 'stunned';
        hitEnemy.stateTimer = 999;
        hitEnemy.attackState = 'idle';
        messageEl.textContent = '壺が槍兵を直撃！ 槍兵を気絶させた！';
      } else {
        hitEnemy.attackState = 'recover';
        hitEnemy.attackTimer = 0.35;
        messageEl.textContent = '剣兵に壺を斬り割られた！';
      }
    } else if (cause === 'sword') {
      messageEl.textContent = '剣兵に壺を斬り割られた！';
    }

    exitPot(pot, true, -player.potRollX || 0, -player.potRollY || -1);
    if (hitEnemy?.weapon === 'spear') messageEl.textContent = '壺が槍兵を直撃！ 槍兵を気絶させた！';
    else if (cause === 'sword' || hitEnemy?.weapon === 'sword') messageEl.textContent = '剣兵に壺を斬り割られた！ スライムが飛び出した！';
    checkDoorOpen();
  }

  function updateRollingPot(pot, dt) {
    const p = player;
    const oldX = pot.x;
    const oldY = pot.y;
    pot.x += p.potRollX * pot.rollSpeed * dt;
    pot.y += p.potRollY * pot.rollSpeed * dt;
    pot.rollSpeed = Math.min(560, pot.rollSpeed + 70 * dt);

    const wallHit = pot.x - pot.radius <= ROOM.left || pot.x + pot.radius >= ROOM.right ||
      pot.y - pot.radius <= ROOM.top || pot.y + pot.radius >= ROOM.bottom;
    const obstacleHit = circleHitsAnyObstacle(pot.x, pot.y, pot.radius, 0);
    if (wallHit || obstacleHit) {
      pot.x = oldX; pot.y = oldY;
      p.x = pot.x; p.y = pot.y + 4;
      breakPot(pot, wallHit ? 'wall' : 'obstacle');
      return;
    }

    for (const e of enemies) {
      if (e.state === 'stunned') continue;
      if (Math.hypot(pot.x - e.x, pot.y - e.y) < pot.radius + e.radius - 2) {
        breakPot(pot, 'enemy', e);
        return;
      }
    }

    p.x = pot.x;
    p.y = pot.y + 4;
  }

  function trySwordBreakPot(e) {
    if (e.attackHit || !player.hiddenPot || !player.potRolling) return;
    const pot = player.hiddenPot;
    const dx = pot.x - e.x;
    const dy = pot.y - e.y;
    const dist = Math.hypot(dx, dy);
    const angleToPot = Math.atan2(dy, dx);
    const angleDiff = Math.atan2(Math.sin(angleToPot - e.attackAngle), Math.cos(angleToPot - e.attackAngle));
    if (dist < 92 && Math.abs(angleDiff) < 1.05) {
      e.attackHit = true;
      breakPot(pot, 'sword', e);
    }
  }

  function updateEnemy(e, dt) {
    e.faceCooldown = Math.max(0, e.faceCooldown - dt);
    e.alert = Math.max(0, e.alert - dt * 0.32);
    if (e.state === 'stunned') return;
    if (player.attachedEnemy === e) return;

    if (e.state === 'tripped') {
      e.attackState = 'idle';
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.state = 'walk';
        e.angle += Math.PI;
        e.attackTimer = 0.55;
        e.aiState = e.alert > 0 ? 'search' : 'patrol';
      }
      return;
    }

    // 転がる壺は従来どおり剣兵が迎撃する。槍兵には直撃が有効。
    if (player.hiddenPot && player.potRolling) {
      const pot = player.hiddenPot;
      e.targetPot = pot;
      e.aiState = 'investigatePot';
      if (e.weapon === 'sword') {
        const dx = pot.x - e.x;
        const dy = pot.y - e.y;
        const dist = Math.hypot(dx, dy);
        if (e.attackState !== 'idle') {
          e.attackTimer -= dt;
          if (e.attackState === 'windup') {
            e.attackAngle = Math.atan2(dy, dx);
            if (e.attackTimer <= 0) {
              e.attackState = 'active'; e.attackTimer = 0.22; e.attackHit = false;
            }
          } else if (e.attackState === 'active') {
            trySwordBreakPot(e);
            if (e.attackTimer <= 0) { e.attackState = 'recover'; e.attackTimer = 0.42; }
          } else if (e.attackState === 'recover' && e.attackTimer <= 0) {
            e.attackState = 'idle'; e.attackTimer = 0.35;
          }
          return;
        }
        e.attackTimer -= dt;
        if (dist < 92 && e.attackTimer <= 0) {
          e.attackState = 'windup'; e.attackTimer = 0.34; e.attackAngle = Math.atan2(dy, dx);
          return;
        }
        moveEnemyToward(e, pot.x, pot.y, e.speed * 0.95, dt);
      } else {
        // 槍兵は危険な壺を避けながら向きを合わせる。
        const dx = pot.x - e.x, dy = pot.y - e.y;
        const dist = Math.hypot(dx, dy) || 1;
        e.angle = Math.atan2(dy, dx);
        if (dist < 145) moveEnemyToward(e, e.x - dx, e.y - dy, e.speed * 0.8, dt);
      }
      return;
    }

    const seesPlayer = !player.hiddenPot && player.z < 48 && enemyCanSeePoint(e, player.x, player.y);
    if (seesPlayer) {
      e.aiState = 'chase';
      e.alert = 1;
      e.lostSightTimer = 1.45;
      e.lastSeenX = player.x;
      e.lastSeenY = player.y;
      e.targetPot = null;
    } else if (e.aiState === 'chase') {
      e.lostSightTimer -= dt;
      if (e.lostSightTimer <= 0) {
        e.aiState = 'search';
        e.searchTimer = 3.2;
        e.attackState = 'idle';
      }
    }

    if (player.hiddenPot && e.targetPot?.broken) {
      e.targetPot = null;
      e.aiState = 'search';
      e.searchTimer = 2;
    }

    if (e.aiState === 'investigatePot' && e.targetPot && !e.targetPot.broken) {
      updatePotInvestigation(e, dt);
      return;
    }

    if (e.aiState === 'chase') {
      updateEnemyCombatAndChase(e, dt, seesPlayer ? player.x : e.lastSeenX, seesPlayer ? player.y : e.lastSeenY);
      return;
    }

    if (e.aiState === 'search') {
      e.searchTimer -= dt;
      const arrived = moveEnemyToward(e, e.lastSeenX, e.lastSeenY, e.speed * 0.72, dt);
      if (arrived) {
        e.angle += dt * 2.2;
        e.lastSeenX = clamp(e.lastSeenX + Math.cos(e.angle * 2.1) * 28, ROOM.left + 35, ROOM.right - 35);
        e.lastSeenY = clamp(e.lastSeenY + Math.sin(e.angle * 1.7) * 28, ROOM.top + 35, ROOM.bottom - 35);
      }
      if (e.searchTimer <= 0) {
        e.aiState = 'patrol';
        e.alert = 0;
        e.patrolWait = 0.4;
      }
      return;
    }

    updateEnemyPatrol(e, dt);
  }

  function updateEnemyPatrol(e, dt) {
    e.attackState = 'idle';
    if (e.patrolWait > 0) {
      e.patrolWait -= dt;
      e.angle += Math.sin(performance.now() * 0.002 + e.x) * dt * 0.25;
      return;
    }
    const target = e.patrolPoints[e.patrolIndex];
    if (moveEnemyToward(e, target.x, target.y, e.speed * 0.55, dt)) {
      e.patrolIndex = (e.patrolIndex + 1) % e.patrolPoints.length;
      e.patrolWait = 0.45 + Math.random() * 0.9;
      e.angle += (Math.random() - 0.5) * 0.7;
    }
  }

  function updateEnemyCombatAndChase(e, dt, targetX, targetY) {
    const dx = targetX - e.x;
    const dy = targetY - e.y;
    const dist = Math.hypot(dx, dy);
    const reach = e.weapon === 'spear' ? 122 : 82;

    if (e.attackState !== 'idle') {
      e.attackTimer -= dt;
      if (e.attackState === 'windup') {
        if (!player.hiddenPot) e.attackAngle = Math.atan2(player.y - e.y, player.x - e.x);
        if (e.attackTimer <= 0) {
          e.attackState = 'active';
          e.attackTimer = e.weapon === 'spear' ? 0.18 : 0.22;
          e.attackHit = false;
        }
      } else if (e.attackState === 'active') {
        tryEnemyAttackHit(e);
        if (e.attackTimer <= 0) {
          e.attackState = 'recover';
          e.attackTimer = e.weapon === 'spear' ? 0.55 : 0.42;
        }
      } else if (e.attackState === 'recover' && e.attackTimer <= 0) {
        e.attackState = 'idle';
        e.attackTimer = 0.45 + Math.random() * 0.45;
      }
      return;
    }

    e.attackTimer -= dt;
    if (!player.hiddenPot && dist < reach && player.z < 34 && e.attackTimer <= 0) {
      e.attackState = 'windup';
      e.attackTimer = e.weapon === 'spear' ? 0.52 : 0.42;
      e.attackAngle = Math.atan2(dy, dx);
      return;
    }
    moveEnemyToward(e, targetX, targetY, e.speed * 1.12, dt);
  }

  function updatePotInvestigation(e, dt) {
    const pot = e.targetPot;
    const dx = pot.x - e.x, dy = pot.y - e.y;
    const dist = Math.hypot(dx, dy);
    e.angle = Math.atan2(dy, dx);
    e.attackState = 'idle';

    if (dist > e.radius + pot.radius + 18) {
      e.inspectTimer = 0;
      moveEnemyToward(e, pot.x, pot.y, e.speed * 0.68, dt);
      return;
    }

    e.inspectTimer += dt;
    pot.shake = Math.max(pot.shake, Math.sin(e.inspectTimer * 16) > 0.72 ? 0.18 : 0);
    if (e.inspectTimer > 0.85 && player.hiddenPot === pot && !player.potRolling) {
      // 調査された壺から強制的に飛び出す。壺そのものは壊さずv8の資源を維持。
      exitPot(pot, false, -Math.cos(e.angle), -Math.sin(e.angle));
      player.hurtTimer = Math.max(player.hurtTimer, 0.35);
      e.aiState = 'chase';
      e.alert = 1;
      e.lostSightTimer = 1.5;
      e.lastSeenX = player.x;
      e.lastSeenY = player.y;
      e.targetPot = null;
      e.inspectTimer = 0;
      messageEl.textContent = '壺を調べられた！ 見られず静かに入ると安全です';
      return;
    }
    if (e.inspectTimer > 1.2) {
      e.targetPot = null;
      e.aiState = 'search';
      e.searchTimer = 1.8;
      e.lastSeenX = pot.x;
      e.lastSeenY = pot.y;
      e.inspectTimer = 0;
    }
  }

  function moveEnemyToward(e, tx, ty, speed, dt) {
    const dx = tx - e.x, dy = ty - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 10) return true;
    e.angle = Math.atan2(dy, dx);
    const oldX = e.x, oldY = e.y;
    e.x += dx / dist * speed * dt;
    e.y += dy / dist * speed * dt;
    if (circleHitsAnyObstacle(e.x, e.y, e.radius, 0)) {
      e.x = oldX; e.y = oldY;
      // 正面が塞がれたら左右へ回り込む。柱越しの直進停止を防ぐ。
      const side = Math.sin(e.x * 0.031 + e.y * 0.017) > 0 ? 1 : -1;
      const sideAngle = e.angle + side * Math.PI / 2;
      e.x += Math.cos(sideAngle) * speed * 0.72 * dt;
      e.y += Math.sin(sideAngle) * speed * 0.72 * dt;
      if (circleHitsAnyObstacle(e.x, e.y, e.radius, 0)) { e.x = oldX; e.y = oldY; }
    }
    e.x = clamp(e.x, ROOM.left + 30, ROOM.right - 30);
    e.y = clamp(e.y, ROOM.top + 30, ROOM.bottom - 30);
    return false;
  }

  function enemyCanSeePoint(e, x, y) {
    const dx = x - e.x, dy = y - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist > e.visionRange || dist < 1) return false;
    const targetAngle = Math.atan2(dy, dx);
    const diff = Math.atan2(Math.sin(targetAngle - e.angle), Math.cos(targetAngle - e.angle));
    if (Math.abs(diff) > e.visionHalfAngle) return false;
    return !pillarBlocksSight(e.x, e.y, x, y);
  }

  function pillarBlocksSight(x1, y1, x2, y2) {
    return obstacles.some((o) => o.type === 'pillar' && segmentHitsRect(x1, y1, x2, y2, o));
  }

  function segmentHitsRect(x1, y1, x2, y2, rect) {
    const pad = 5;
    const left = rect.x - pad, right = rect.x + rect.w + pad;
    const top = rect.y - pad, bottom = rect.y + rect.h + pad;
    let t0 = 0, t1 = 1;
    const dx = x2 - x1, dy = y2 - y1;
    const checks = [[-dx, x1 - left], [dx, right - x1], [-dy, y1 - top], [dy, bottom - y1]];
    for (const [p, q] of checks) {
      if (p === 0) { if (q < 0) return false; continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
      else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
    return t0 < t1 && t0 > 0.01 && t0 < 0.99;
  }

  function alertEnemiesToPot(pot, hearingRange, requireSight) {
    for (const e of enemies) {
      if (e.state === 'stunned' || e.state === 'tripped') continue;
      const dist = Math.hypot(pot.x - e.x, pot.y - e.y);
      const noticed = requireSight ? enemyCanSeePoint(e, pot.x, pot.y) : dist <= hearingRange;
      if (!noticed) continue;
      e.targetPot = pot;
      e.aiState = 'investigatePot';
      e.alert = 0.75;
      e.inspectTimer = 0;
      e.lastSeenX = pot.x;
      e.lastSeenY = pot.y;
    }
  }

  function tryEnemyAttackHit(e) {
    if (e.attackHit || player.invuln > 0 || player.hurtTimer > 0 || player.attachedEnemy) return;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy);
    const angleToPlayer = Math.atan2(dy, dx);
    const angleDiff = Math.atan2(Math.sin(angleToPlayer - e.attackAngle), Math.cos(angleToPlayer - e.attackAngle));
    const reach = e.weapon === 'spear' ? 128 : 88;
    const arc = e.weapon === 'spear' ? 0.34 : 1.05;
    if (player.z < 32 && dist < reach && Math.abs(angleDiff) < arc) {
      e.attackHit = true;
      player.hurtTimer = 0.8;
      const nx = dist ? dx / dist : 1;
      const ny = dist ? dy / dist : 0;
      player.x += nx * 38;
      player.y += ny * 38;
      player.dashTimer = 0;
      messageEl.textContent = e.weapon === 'spear' ? '槍攻撃！ 構えを見たら横へダッシュ！' : '剣攻撃！ ダッシュの無敵時間で回避！';
      shake = 6;
      burst(player.x, player.y, 10);
    }
  }

  function circleRectHit(cx, cy, radius, rect) {
    const qx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const qy = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const dx = cx - qx, dy = cy - qy;
    return dx * dx + dy * dy < radius * radius;
  }

  function circleHitsAnyObstacle(x, y, radius, z) {
    return obstacles.some((o) => z < o.height && circleRectHit(x, y, radius, o));
  }

  function resolvePlayerObstacles(oldX, oldY) {
    const p = player;
    for (const o of obstacles) {
      if (p.z >= o.height || !circleRectHit(p.x, p.y, p.radius, o)) continue;

      // 軸ごとに戻すと、障害物の縁に沿って滑れる。
      const hitXOnly = circleRectHit(p.x, oldY, p.radius, o);
      const hitYOnly = circleRectHit(oldX, p.y, p.radius, o);
      if (!hitXOnly) p.y = oldY;
      else if (!hitYOnly) p.x = oldX;
      else { p.x = oldX; p.y = oldY; }

      if (p.dashTimer > 0) p.dashTimer = 0;
    }
  }

  function findStickSurface(p) {
    const gap = 15;
    let best = null;
    const consider = (distance, nx, ny, push = 0) => {
      if (distance < -2 || distance > gap) return;
      if (!best || distance < best.distance) best = { distance, nx, ny, push };
    };

    consider(p.x - p.radius - ROOM.left, 1, 0);
    consider(ROOM.right - (p.x + p.radius), -1, 0);
    consider(p.y - p.radius - ROOM.top, 0, 1);
    consider(ROOM.bottom - (p.y + p.radius), 0, -1);

    for (const o of obstacles) {
      // 高さのある面だけに張りつける。低い箱でも、飛び越える高さ未満なら有効。
      if (p.z >= o.height) continue;
      const withinY = p.y > o.y - p.radius && p.y < o.y + o.h + p.radius;
      const withinX = p.x > o.x - p.radius && p.x < o.x + o.w + p.radius;
      if (withinY) {
        consider(Math.abs((p.x + p.radius) - o.x), -1, 0);
        consider(Math.abs(p.x - p.radius - (o.x + o.w)), 1, 0);
      }
      if (withinX) {
        consider(Math.abs((p.y + p.radius) - o.y), 0, -1);
        consider(Math.abs(p.y - p.radius - (o.y + o.h)), 0, 1);
      }
    }
    return best;
  }

  function handlePlayerEnemyInteractions() {
    const p = player;
    if (p.attachedEnemy) return;

    for (const e of enemies) {
      if (e.state === 'stunned') continue;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy);

      if (input.stickPressed && p.dashTimer > 0 && p.z < 12 && dist < 56 && e.state === 'walk') {
        e.state = 'tripped';
        e.stateTimer = 2.2;
        p.dashTimer = 0;
        burst(e.x, e.y, 12);
        continue;
      }

      if (input.stickPressed && p.z > 28 && dist < 48 && e.faceCooldown <= 0 && e.state !== 'stunned') {
        p.attachedEnemy = e;
        p.attachTimer = 0;
        e.faceCooldown = 0.5;
        e.attackState = 'idle';
        e.attackTimer = 0.8;
        continue;
      }

      if (dist < p.radius + e.radius - 4 && p.z < 16 && e.state === 'walk' && p.invuln <= 0 && p.hurtTimer <= 0) {
        p.hurtTimer = 0.7;
        const len = dist || 1;
        p.x += (dx / len) * 26;
        p.y += (dy / len) * 26;
        messageEl.textContent = '接触！ ダッシュ回避を使おう';
      }
    }
  }

  function slamImpact() {
    shake = 8;
    burst(player.x, player.y, 22);
    for (const e of enemies) {
      if (e.state === 'stunned') continue;
      const dist = Math.hypot(player.x - e.x, player.y - e.y);
      if (dist < 76) {
        e.hp -= e.state === 'tripped' ? 2 : 1;
        e.state = e.hp <= 0 ? 'stunned' : 'tripped';
        e.stateTimer = e.state === 'stunned' ? 999 : 1.8;
      }
    }
  }

  function updateParticles(dt) {
    for (const pt of particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
    }
    particles = particles.filter((pt) => pt.life > 0);
  }

  function burst(x, y, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 35 + Math.random() * 130;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.25 + Math.random() * 0.35 });
    }
  }

  function clearPressed() {
    input.dashPressed = false;
    input.jumpPressed = false;
    input.stickPressed = false;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    drawRoom();
    drawDoor();
    drawEnemySenses();

    const drawableObstacles = obstacles.map((o) => ({ ...o, isObstacle: true, sortY: o.y + o.h }));
    const drawablePots = pots.filter((pot) => !pot.broken).map((pot) => ({ ...pot, isPot: true, sortY: pot.y + pot.radius }));
    const sorted = [...enemies, player, ...drawableObstacles, ...drawablePots].sort((a, b) => (a.sortY ?? a.y) - (b.sortY ?? b.y));
    for (const obj of sorted) {
      if (obj === player) { if (!player.attachedEnemy && !player.hiddenPot) drawPlayer(); }
      else if (obj.isObstacle) drawObstacle(obj);
      else if (obj.isPot) drawPot(obj);
      else drawEnemy(obj);
    }

    for (const pt of particles) {
      ctx.globalAlpha = Math.max(0, pt.life * 2);
      ctx.fillStyle = '#9cf3ff';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (roomCleared) {
      ctx.fillStyle = 'rgba(7,10,15,.68)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#080a0e';
      ctx.lineWidth = 9;
      ctx.font = '900 52px system-ui';
      ctx.strokeText('試作クリア！', W / 2, H / 2 - 6);
      ctx.fillText('試作クリア！', W / 2, H / 2 - 6);
      ctx.font = '800 22px system-ui';
      ctx.fillText('「やり直し」で再プレイ', W / 2, H / 2 + 38);
    }

    ctx.restore();
  }

  function drawEnemySenses() {
    for (const e of enemies) {
      if (e.state === 'stunned' || e.state === 'tripped') continue;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle);
      ctx.globalAlpha = e.aiState === 'chase' ? 0.18 : 0.075;
      ctx.fillStyle = e.aiState === 'chase' ? '#ff6f5f' : '#ffe58a';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.arc(0, 0, e.visionRange, -e.visionHalfAngle, e.visionHalfAngle);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawRoom() {
    // 砂色の石床と不揃いな目地で、古い遺跡らしさを出す。
    ctx.fillStyle = '#807764';
    ctx.fillRect(0, 0, W, H);
    const tile = 48;
    for (let y = ROOM.top; y < ROOM.bottom; y += tile) {
      for (let x = ROOM.left; x < ROOM.right; x += tile) {
        const odd = ((x / tile) + (y / tile)) % 2;
        ctx.fillStyle = odd ? '#c8b98e' : '#d5c79d';
        ctx.fillRect(x, y, tile, tile);
        ctx.strokeStyle = 'rgba(73,62,48,.22)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, tile, tile);
      }
    }
    // 床のひび。
    ctx.strokeStyle = 'rgba(72,58,43,.42)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(135, 132); ctx.lineTo(157, 145); ctx.lineTo(149, 163); ctx.lineTo(171, 177);
    ctx.moveTo(690, 390); ctx.lineTo(710, 374); ctx.lineTo(732, 385); ctx.lineTo(742, 366);
    ctx.stroke();

    ctx.strokeStyle = '#11151d';
    ctx.lineWidth = 16;
    ctx.strokeRect(ROOM.left, ROOM.top, ROOM.right - ROOM.left, ROOM.bottom - ROOM.top);
    ctx.strokeStyle = '#756d5c';
    ctx.lineWidth = 22;
    ctx.strokeRect(ROOM.left, ROOM.top, ROOM.right - ROOM.left, ROOM.bottom - ROOM.top);
    ctx.strokeStyle = '#b7aa82';
    ctx.lineWidth = 10;
    ctx.strokeRect(ROOM.left, ROOM.top, ROOM.right - ROOM.left, ROOM.bottom - ROOM.top);
    ctx.strokeStyle = '#11151d';
    ctx.lineWidth = 4;
    ctx.strokeRect(ROOM.left, ROOM.top, ROOM.right - ROOM.left, ROOM.bottom - ROOM.top);
  }

  function drawDoor() {
    ctx.save();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#11151d';
    // 石造りの門枠。
    ctx.fillStyle = '#aaa07f';
    ctx.fillRect(DOOR.x - 14, ROOM.top - 24, DOOR.w + 28, 58);
    ctx.strokeRect(DOOR.x - 14, ROOM.top - 24, DOOR.w + 28, 58);
    if (doorOpen) {
      ctx.fillStyle = '#18212a';
      ctx.fillRect(DOOR.x, ROOM.top - 14, DOOR.w, 48);
      ctx.strokeRect(DOOR.x, ROOM.top - 14, DOOR.w, 48);
      ctx.fillStyle = '#d5f1ff';
      ctx.fillRect(DOOR.x + 15, ROOM.top + 1, DOOR.w - 30, 12);
    } else {
      ctx.fillStyle = '#66503d';
      ctx.fillRect(DOOR.x, ROOM.top - 14, DOOR.w, 48);
      ctx.strokeRect(DOOR.x, ROOM.top - 14, DOOR.w, 48);
      ctx.strokeStyle = '#c3ad7c';
      ctx.lineWidth = 7;
      for (let x = DOOR.x + 15; x < DOOR.x + DOOR.w; x += 22) {
        ctx.beginPath(); ctx.moveTo(x, ROOM.top - 9); ctx.lineTo(x, ROOM.top + 28); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawObstacle(o) {
    ctx.save();
    ctx.strokeStyle = '#0a0d12';
    ctx.lineWidth = 7;
    if (o.type === 'pillar') {
      ctx.fillStyle = 'rgba(16,20,25,.24)';
      ctx.beginPath();
      ctx.ellipse(o.x + o.w / 2 + 8, o.y + o.h + 8, o.w * .58, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      // 柱頭・柱身・柱礎を分け、中央に縦溝を入れる。
      const capH = 22;
      ctx.fillStyle = '#b8ad8c';
      ctx.beginPath(); ctx.roundRect(o.x, o.y, o.w, capH, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(o.x - 5, o.y + o.h - capH, o.w + 10, capH, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9bd98';
      ctx.beginPath(); ctx.roundRect(o.x + 10, o.y + capH - 2, o.w - 20, o.h - capH * 2 + 4, 6); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#8e8267';
      ctx.lineWidth = 4;
      for (let x = o.x + 20; x < o.x + o.w - 14; x += 13) {
        ctx.beginPath(); ctx.moveTo(x, o.y + capH + 5); ctx.lineTo(x, o.y + o.h - capH - 5); ctx.stroke();
      }
      ctx.strokeStyle = '#6d6250'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(o.x + o.w - 23, o.y + 9); ctx.lineTo(o.x + o.w - 34, o.y + 20); ctx.lineTo(o.x + o.w - 25, o.y + 31);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(16,20,25,.22)';
      ctx.beginPath();
      ctx.ellipse(o.x + o.w / 2 + 7, o.y + o.h + 7, o.w * .5, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a9643f';
      ctx.beginPath();
      ctx.roundRect(o.x, o.y, o.w, o.h, 7);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#d58a55';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(o.x + 12, o.y + 10); ctx.lineTo(o.x + o.w - 12, o.y + o.h - 10);
      ctx.moveTo(o.x + o.w - 12, o.y + 10); ctx.lineTo(o.x + 12, o.y + o.h - 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPot(pot) {
    ctx.save();
    const potWobble = pot.shake > 0 ? Math.sin(performance.now() * 0.055) * pot.shake * 5 : 0;
    ctx.translate(pot.x + potWobble, pot.y);
    if (pot.rolling) ctx.rotate(performance.now() * 0.018 * (player.potRollX >= 0 ? 1 : -1));
    ctx.fillStyle = 'rgba(16,20,25,.25)';
    ctx.beginPath(); ctx.ellipse(7, 17, 31, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0a0d12'; ctx.lineWidth = 7;
    ctx.fillStyle = '#b8643f';
    ctx.beginPath();
    ctx.moveTo(-18, -12);
    ctx.quadraticCurveTo(-25, 4, -18, 22);
    ctx.quadraticCurveTo(0, 34, 18, 22);
    ctx.quadraticCurveTo(25, 4, 18, -12);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d98a58';
    ctx.beginPath(); ctx.ellipse(0, -13, 23, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#402b23';
    ctx.beginPath(); ctx.ellipse(0, -13, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7d3f2c'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-18, 8); ctx.quadraticCurveTo(0, 16, 18, 8); ctx.stroke();
    if (player.hiddenPot && Math.hypot(player.hiddenPot.x - pot.x, player.hiddenPot.y - pot.y) < 2) {
      ctx.fillStyle = '#5ee4cf'; ctx.strokeStyle = '#0a0d12'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, -14, 10, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#10141b'; ctx.beginPath(); ctx.arc(-4, -17, 1.8, 0, Math.PI * 2); ctx.arc(4, -17, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayer() {
    const p = player;
    const shadowScale = Math.max(0.35, 1 - p.z / 250);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(shadowScale, shadowScale * 0.55);
    ctx.fillStyle = 'rgba(18,22,28,.28)';
    ctx.beginPath();
    ctx.ellipse(0, 11, 27, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(p.x, p.y - p.z);
    if (p.slam && p.diagonalSlam) ctx.rotate(Math.atan2(p.slamY, p.slamX) + Math.PI / 2);
    let sx = 1, sy = 1;
    if (p.dashTimer > 0) { sx = 1.55; sy = 0.58; }
    if (p.slam) { sx = p.diagonalSlam ? 1.28 : 0.82; sy = p.diagonalSlam ? 0.72 : 1.22; }
    if (p.wallStick > 0 || p.graceStick > 0) { sx = 1.25; sy = 0.78; }
    ctx.scale(sx, sy);
    ctx.fillStyle = p.hurtTimer > 0 ? '#ff7791' : '#5ee4cf';
    ctx.strokeStyle = '#0a0d12';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(0, 0, 25, 23, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#d8fff8';
    ctx.beginPath();
    ctx.ellipse(-8, -8, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10141b';
    ctx.beginPath();
    ctx.arc(-7, -7, 2.8, 0, Math.PI * 2);
    ctx.arc(8, -7, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.state !== 'stunned' && e.state !== 'tripped') {
      ctx.textAlign = 'center';
      ctx.font = '900 25px system-ui';
      if (e.aiState === 'chase') { ctx.fillStyle = '#ff625f'; ctx.fillText('!', 0, -53); }
      else if (e.aiState === 'investigatePot' || e.aiState === 'search') { ctx.fillStyle = '#ffe27a'; ctx.fillText('?', 0, -53); }
    }
    ctx.strokeStyle = '#0a0d12';
    ctx.lineWidth = 7;

    if (e.state === 'stunned') {
      ctx.rotate(-0.2);
      ctx.fillStyle = '#d98b5f';
      ctx.beginPath(); ctx.ellipse(0, 10, 31, 17, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f4bd8a';
      ctx.beginPath(); ctx.arc(7, -4, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = '900 22px system-ui'; ctx.fillStyle = '#fff7a8';
      ctx.fillText('★', -23, -22); ctx.fillText('★', 13, -30);
    } else if (e.state === 'tripped') {
      ctx.rotate(0.18);
      ctx.fillStyle = '#d98b5f';
      ctx.beginPath(); ctx.ellipse(0, 7, 34, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f4bd8a';
      ctx.beginPath(); ctx.arc(20, -3, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      drawWeapon(e, true);
    } else {
      ctx.fillStyle = '#d98b5f';
      ctx.beginPath(); ctx.roundRect(-20, -5, 40, 43, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f4bd8a';
      ctx.beginPath(); ctx.arc(0, -18, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (player.attachedEnemy !== e) {
        ctx.fillStyle = '#1a1e26';
        ctx.beginPath(); ctx.arc(-6, -20, 2.5, 0, Math.PI * 2); ctx.arc(6, -20, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      drawWeapon(e, false);

      if (player.attachedEnemy === e) {
        const wobble = Math.sin(e.strugglePhase) * 0.12;
        ctx.save();
        ctx.translate(Math.sin(e.strugglePhase) * 3, -19);
        ctx.rotate(wobble);
        ctx.fillStyle = '#5ee4cf'; ctx.strokeStyle = '#0a0d12'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.ellipse(0, 0, 25, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#d8fff8'; ctx.beginPath(); ctx.ellipse(-8, -7, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#10141b'; ctx.beginPath(); ctx.arc(-7, -6, 2.7, 0, Math.PI * 2); ctx.arc(8, -6, 2.7, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        const ratio = Math.min(1, player.attachTimer / 1.25);
        ctx.fillStyle = '#11151d'; ctx.fillRect(-31, -58, 62, 10);
        ctx.fillStyle = '#8ff57f'; ctx.fillRect(-28, -55, 56 * ratio, 4);
      }
    }
    ctx.restore();
  }

  function drawWeapon(e, dropped) {
    ctx.save();
    if (dropped) {
      ctx.translate(-20, 18); ctx.rotate(0.65);
    } else {
      ctx.rotate(e.attackAngle || e.angle || 0);
    }

    const windup = e.attackState === 'windup';
    const active = e.attackState === 'active';
    if (!dropped && (windup || active)) {
      ctx.globalAlpha = windup ? 0.28 : 0.48;
      ctx.strokeStyle = active ? '#fff2a8' : '#ffb071';
      ctx.lineWidth = e.weapon === 'spear' ? 12 : 18;
      ctx.beginPath();
      if (e.weapon === 'spear') { ctx.moveTo(25, 0); ctx.lineTo(126, 0); }
      else { ctx.arc(0, 0, 82, -0.72, 0.72); }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = '#0a0d12'; ctx.fillStyle = '#d7e2e7'; ctx.lineWidth = 6;
    if (e.weapon === 'spear') {
      ctx.strokeStyle = '#69452d'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(12, 8); ctx.lineTo(86, 8); ctx.stroke();
      ctx.fillStyle = '#d7e2e7'; ctx.strokeStyle = '#0a0d12'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(102, 8); ctx.lineTo(82, -2); ctx.lineTo(82, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      ctx.strokeStyle = '#69452d'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(13, 8); ctx.lineTo(31, 8); ctx.stroke();
      ctx.fillStyle = '#d7e2e7'; ctx.strokeStyle = '#0a0d12'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(27, 2); ctx.lineTo(74, 8); ctx.lineTo(27, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  resetGame();
  requestAnimationFrame(frame);
})();
