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
      wallStick: 0,
      graceStick: 0,
      attachedEnemy: null,
      attachTimer: 0,
      hurtTimer: 0,
    };

    enemies = [
      makeEnemy(250, 190),
      makeEnemy(480, 245),
      makeEnemy(710, 170),
    ];
    particles = [];
    doorOpen = false;
    roomCleared = false;
    messageEl.textContent = '敵を全員気絶させると扉が開きます';
  }

  function makeEnemy(x, y) {
    return {
      x, y,
      radius: 25,
      hp: 2,
      state: 'walk', // walk, tripped, stunned
      stateTimer: 0,
      angle: Math.random() * Math.PI * 2,
      speed: 58 + Math.random() * 18,
      faceCooldown: 0,
    };
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
    button.addEventListener('pointerleave', (e) => { if (e.buttons === 0) release(e); });
  });

  resetBtn.addEventListener('click', resetGame);

  function update(dt) {
    const p = player;
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.dashTimer = Math.max(0, p.dashTimer - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.wallStick = Math.max(0, p.wallStick - dt);
    p.graceStick = Math.max(0, p.graceStick - dt);
    p.hurtTimer = Math.max(0, p.hurtTimer - dt);
    shake = Math.max(0, shake - dt * 22);

    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const m = Math.hypot(mx, my);
    if (m > 0) {
      mx /= m; my /= m;
      p.facingX = mx; p.facingY = my;
    }

    if (input.jumpPressed && p.attachedEnemy) {
      p.attachedEnemy = null;
      p.attachTimer = 0;
      p.vz = 370;
    } else if (input.jumpPressed && (p.z <= 0.01 || p.wallStick > 0 || p.graceStick > 0)) {
      p.vz = p.wallStick > 0 || p.graceStick > 0 ? 410 : 370;
      p.z = Math.max(p.z, 1);
      if (p.wallStick > 0 || p.graceStick > 0) {
        const cx = W / 2, cy = H / 2;
        let dx = p.x - cx, dy = p.y - cy;
        const len = Math.hypot(dx, dy) || 1;
        p.x -= (dx / len) * 18;
        p.y -= (dy / len) * 18;
      }
      p.wallStick = 0;
      p.graceStick = 0;
    }

    if (input.dashPressed && p.dashCooldown <= 0 && !p.attachedEnemy) {
      if (p.z > 8) {
        p.slam = true;
        p.vz = -760;
      } else {
        p.dashTimer = 0.23;
        p.dashCooldown = 0.42;
        p.invuln = 0.28;
        p.dashX = m > 0 ? mx : p.facingX;
        p.dashY = m > 0 ? my : p.facingY;
        burst(p.x, p.y, 8);
      }
    }

    if (p.attachedEnemy) {
      const e = p.attachedEnemy;
      if (e.state === 'stunned') {
        p.attachedEnemy = null;
      } else {
        p.x = e.x;
        p.y = e.y - 4;
        p.z = 38;
        p.vz = 0;
        p.attachTimer += dt;
        if (!input.stick) {
          p.attachedEnemy = null;
          p.z = 20;
          p.vz = 80;
        } else if (p.attachTimer >= 1.15) {
          e.state = 'stunned';
          e.stateTimer = 999;
          p.attachedEnemy = null;
          p.z = 15;
          p.vz = 110;
          burst(e.x, e.y, 16);
        }
      }
    } else {
      if (p.dashTimer > 0) {
        p.x += p.dashX * 720 * dt;
        p.y += p.dashY * 720 * dt;
      } else {
        const airControl = p.z > 0 ? 0.88 : 1;
        p.x += mx * p.speed * airControl * dt;
        p.y += my * p.speed * airControl * dt;
      }

      if (p.z > 0 || p.vz !== 0) {
        p.vz -= 590 * dt; // 弱めの重力
        p.z += p.vz * dt;
        if (p.z <= 0) {
          const impact = p.slam;
          p.z = 0;
          p.vz = 0;
          p.slam = false;
          if (impact) slamImpact();
        }
      }
    }

    const nearWall = p.x < ROOM.left + 18 || p.x > ROOM.right - 18 || p.y < ROOM.top + 18 || p.y > ROOM.bottom - 18;
    if (input.stick && nearWall && p.z > 0 && !p.attachedEnemy) {
      p.wallStick = 0.12;
      p.graceStick = 0.28;
      p.vz = Math.max(p.vz, -25);
    } else if (!input.stick && p.wallStick > 0) {
      p.graceStick = 0.28;
      p.wallStick = 0;
    }

    p.x = Math.max(ROOM.left + p.radius, Math.min(ROOM.right - p.radius, p.x));
    p.y = Math.max(ROOM.top + p.radius, Math.min(ROOM.bottom - p.radius, p.y));

    for (const e of enemies) updateEnemy(e, dt);
    handlePlayerEnemyInteractions();

    for (const pt of particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
    }
    particles = particles.filter((pt) => pt.life > 0);

    if (!doorOpen && enemies.every((e) => e.state === 'stunned')) {
      doorOpen = true;
      messageEl.textContent = '扉が開いた！ 上の出口へ！';
    }
    if (doorOpen && !roomCleared && p.y < ROOM.top + 34 && p.x > DOOR.x && p.x < DOOR.x + DOOR.w) {
      roomCleared = true;
      messageEl.textContent = '試作クリア！';
      burst(p.x, p.y, 28);
    }

    clearPressed();
  }

  function updateEnemy(e, dt) {
    e.faceCooldown = Math.max(0, e.faceCooldown - dt);
    if (e.state === 'stunned') return;
    if (e.state === 'tripped') {
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.state = 'walk';
        e.angle += Math.PI;
      }
      return;
    }

    e.stateTimer -= dt;
    if (e.stateTimer <= 0) {
      e.stateTimer = 0.7 + Math.random() * 1.5;
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      e.angle = aim + (Math.random() - 0.5) * 1.1;
    }
    e.x += Math.cos(e.angle) * e.speed * dt;
    e.y += Math.sin(e.angle) * e.speed * dt;
    if (e.x < ROOM.left + 30 || e.x > ROOM.right - 30) e.angle = Math.PI - e.angle;
    if (e.y < ROOM.top + 30 || e.y > ROOM.bottom - 30) e.angle = -e.angle;
    e.x = Math.max(ROOM.left + 30, Math.min(ROOM.right - 30, e.x));
    e.y = Math.max(ROOM.top + 30, Math.min(ROOM.bottom - 30, e.y));
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

    const sorted = [...enemies, player].sort((a, b) => a.y - b.y);
    for (const obj of sorted) {
      if (obj === player) drawPlayer(); else drawEnemy(obj);
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

  function drawRoom() {
    ctx.fillStyle = '#889879';
    ctx.fillRect(0, 0, W, H);
    for (let y = ROOM.top; y < ROOM.bottom; y += 48) {
      for (let x = ROOM.left; x < ROOM.right; x += 48) {
        ctx.fillStyle = ((x / 48 + y / 48) % 2) ? '#a9b98f' : '#b5c69a';
        ctx.fillRect(x, y, 48, 48);
      }
    }

    ctx.strokeStyle = '#11151d';
    ctx.lineWidth = 14;
    ctx.strokeRect(ROOM.left, ROOM.top, ROOM.right - ROOM.left, ROOM.bottom - ROOM.top);
    ctx.strokeStyle = '#59624f';
    ctx.lineWidth = 20;
    ctx.strokeRect(ROOM.left, ROOM.top, ROOM.right - ROOM.left, ROOM.bottom - ROOM.top);
    ctx.strokeStyle = '#11151d';
    ctx.lineWidth = 5;
    ctx.strokeRect(ROOM.left, ROOM.top, ROOM.right - ROOM.left, ROOM.bottom - ROOM.top);
  }

  function drawDoor() {
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#11151d';
    if (doorOpen) {
      ctx.fillStyle = '#18212a';
      ctx.fillRect(DOOR.x, ROOM.top - 16, DOOR.w, 48);
      ctx.strokeRect(DOOR.x, ROOM.top - 16, DOOR.w, 48);
      ctx.fillStyle = '#d5f1ff';
      ctx.fillRect(DOOR.x + 15, ROOM.top - 2, DOOR.w - 30, 16);
    } else {
      ctx.fillStyle = '#7c4932';
      ctx.fillRect(DOOR.x, ROOM.top - 16, DOOR.w, 48);
      ctx.strokeRect(DOOR.x, ROOM.top - 16, DOOR.w, 48);
      ctx.fillStyle = '#bd8257';
      for (let x = DOOR.x + 16; x < DOOR.x + DOOR.w; x += 23) ctx.fillRect(x, ROOM.top - 12, 8, 38);
    }
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
    let sx = 1, sy = 1;
    if (p.dashTimer > 0) { sx = 1.55; sy = 0.58; }
    if (p.slam) { sx = 0.82; sy = 1.22; }
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
    ctx.strokeStyle = '#0a0d12';
    ctx.lineWidth = 7;

    if (e.state === 'stunned') {
      ctx.rotate(-0.2);
      ctx.fillStyle = '#d98b5f';
      ctx.beginPath();
      ctx.ellipse(0, 10, 31, 17, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f4bd8a';
      ctx.beginPath();
      ctx.arc(7, -4, 18, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.font = '900 22px system-ui';
      ctx.fillStyle = '#fff7a8';
      ctx.fillText('★', -23, -22);
      ctx.fillText('★', 13, -30);
    } else if (e.state === 'tripped') {
      ctx.rotate(0.18);
      ctx.fillStyle = '#d98b5f';
      ctx.beginPath();
      ctx.ellipse(0, 7, 34, 18, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f4bd8a';
      ctx.beginPath();
      ctx.arc(20, -3, 17, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = '#d98b5f';
      ctx.beginPath();
      ctx.roundRect(-20, -5, 40, 43, 12);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f4bd8a';
      ctx.beginPath();
      ctx.arc(0, -18, 19, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a1e26';
      ctx.beginPath();
      ctx.arc(-6, -20, 2.5, 0, Math.PI * 2);
      ctx.arc(6, -20, 2.5, 0, Math.PI * 2);
      ctx.fill();
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
