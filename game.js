(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const messageEl = document.getElementById('message');
  const resetBtn = document.getElementById('resetBtn');
  const titleScreen = document.getElementById('titleScreen');
  const startBtn = document.getElementById('startBtn');
  const continueBtn = document.getElementById('continueBtn');
  const saveStatus = document.getElementById('saveStatus');

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
  let arrows;
  let plants;
  let vines;
  let hazards;
  let currentRoomData;
  let doorOpen;
  let roomCleared;
  let lastTime = performance.now();
  let shake = 0;
  let currentRoomIndex = 0;
  let gameMode = 'title';
  const TOTAL_ROOMS = 20;
  const SAVE_KEY = 'slimesRevengeSaveV2';
  const LEGACY_SAVE_KEY = 'slimesRevengeSaveV1';
  let runStats = { hp: 5, maxHp: 5, maxFruitTaken: [] };

  function makePlayer() {
    return {
      x: W / 2, y: H - 120, z: 0, vz: 0, radius: 24, speed: 250,
      facingX: 0, facingY: -1, dashTimer: 0, dashCooldown: 0, dashX: 0, dashY: -1,
      invuln: 0, slam: false, diagonalSlam: false, slamX: 0, slamY: -1,
      dashJump: false, dashJumpX: 0, dashJumpY: -1, airDashUsed: false,
      wallStick: 0, graceStick: 0, wallNormalX: 0, wallNormalY: 0,
      wallJumpTimer: 0, wallJumpX: 0, wallJumpY: 0,
      attachedEnemy: null, attachTimer: 0, hurtTimer: 0, hiddenPot: null,
      potCharge: 0, potRolling: false, potRollX: 0, potRollY: -1,
      hp: runStats.hp, maxHp: runStats.maxHp, deathTimer: 0,
      vineAttached: null, vineGrace: 0, vineAngle: 0, vineAngularVelocity: 0,
    };
  }

  function roomData(index) {
    const rooms = [
      { name: '入口の間', obstacles: [{x:315,y:205,w:86,h:112,height:999,type:'pillar'}], pots:[{x:735,y:340}], plants:[{x:190,y:385,type:'heal'}], vines:[], hazards:[], enemies:[[235,190,'sword']] },
      { name: '二本柱の回廊', obstacles: [{x:260,y:185,w:78,h:125,height:999,type:'pillar'},{x:625,y:255,w:78,h:125,height:999,type:'pillar'}], pots:[{x:475,y:360},{x:790,y:360,mystic:true}], plants:[{x:145,y:375,type:'heal'}], vines:[], hazards:[], enemies:[[200,180,'sword'],[745,180,'spear'],[480,170,'bow']] },
      { name: '壺蔵', obstacles: [{x:450,y:205,w:82,h:118,height:999,type:'pillar'},{x:270,y:350,w:90,h:55,height:58,type:'crate'}], pots:[{x:195,y:300},{x:740,y:330},{x:565,y:390}], plants:[{x:790,y:405,type:'max',id:'max-room-3'}], vines:[], hazards:[], enemies:[[210,170,'spear'],[700,175,'sword'],[510,290,'spear']] },
      { name: '兵士の広間', obstacles: [{x:250,y:210,w:82,h:118,height:999,type:'pillar'},{x:625,y:210,w:82,h:118,height:999,type:'pillar'},{x:435,y:350,w:92,h:55,height:58,type:'crate'}], pots:[{x:165,y:380},{x:790,y:380,mystic:true}], plants:[{x:480,y:165,type:'heal'}], vines:[], hazards:[], enemies:[[170,160,'sword'],[385,170,'spear'],[575,170,'bow'],[790,160,'spear']] },
      { name: '王座前廊', obstacles: [{x:355,y:185,w:75,h:135,height:999,type:'pillar'},{x:530,y:185,w:75,h:135,height:999,type:'pillar'}], pots:[{x:220,y:355},{x:740,y:355}], plants:[{x:480,y:390,type:'max',id:'max-room-5'}], vines:[], hazards:[], enemies:[[190,170,'sword'],[350,335,'bow'],[610,335,'spear'],[770,170,'sword']] },
      { name: '吊り庭の間', obstacles: [{x:430,y:260,w:100,h:54,height:58,type:'crate'}], pots:[{x:180,y:380,mystic:true}], plants:[{x:790,y:390,type:'heal'}], vines:[{x:305,y:82,length:150},{x:635,y:82,length:245}], hazards:[], enemies:[[190,170,'sword'],[770,175,'bow'],[480,350,'spear']] },
      { name: '棘床の水路', obstacles: [{x:210,y:175,w:72,h:118,height:999,type:'pillar'},{x:678,y:175,w:72,h:118,height:999,type:'pillar'}], pots:[{x:145,y:405},{x:815,y:405,mystic:true}], plants:[{x:790,y:150,type:'max',id:'max-room-7'}], vines:[{x:480,y:76,length:285},{x:305,y:72,length:175},{x:655,y:72,length:215}], hazards:[{x:315,y:205,w:330,h:175,type:'spikes'}], enemies:[[165,150,'bow'],[795,150,'bow'],[480,170,'spear']] },
      { name: '守護門前', obstacles: [{x:295,y:190,w:76,h:132,height:999,type:'pillar'},{x:590,y:190,w:76,h:132,height:999,type:'pillar'},{x:430,y:330,w:100,h:58,height:60,type:'crate'}], pots:[{x:175,y:365,mystic:true},{x:785,y:365},{x:480,y:405}], plants:[{x:480,y:145,type:'heal'}], vines:[{x:350,y:72,length:185},{x:580,y:72,length:265}], hazards:[{x:405,y:205,w:150,h:105,type:'spikes'}], enemies:[[160,160,'sword'],[320,350,'bow'],[480,190,'spear'],[640,350,'bow'],[800,160,'sword']] },
      { name: '茨の大広間', obstacles: [
        {x:235,y:185,w:76,h:128,height:999,type:'pillar'},
        // 右上の回復壺を守る木箱。上から跳び込めるが、地上からは回り込めない。
        {x:742,y:116,w:52,h:142,height:58,type:'crate'},
        {x:742,y:224,w:132,h:52,height:58,type:'crate'}
      ], pots:[{x:830,y:175,mystic:true},{x:180,y:390}], plants:[{x:205,y:145,type:'heal'}],
      // 回復壺は右上隅。中央寄りの2本のツタ、または精密なダッシュジャンプで狙う。
      vines:[{x:520,y:70,length:250},{x:665,y:72,length:205}],
      hazards:[
        // 天井側まで棘をつなぎ、上端を歩いて回り込めないようにする。
        {x:498,y:82,w:374,h:42,type:'spikes'},
        {x:498,y:118,w:244,h:304,type:'spikes'},
        {x:794,y:276,w:78,h:146,type:'spikes'},
        {x:742,y:276,w:52,h:146,type:'spikes'}
      ],
      enemies:[[175,180,'sword'],[350,345,'bow'],[420,175,'heavy']] },
      { name: '十の守護門', checkpointBoss:true, bossLives:5, obstacles: [{x:205,y:215,w:72,h:122,height:999,type:'pillar'},{x:683,y:215,w:72,h:122,height:999,type:'pillar'}], pots:[{x:165,y:390,mystic:true},{x:795,y:390,mystic:true}], plants:[{x:480,y:400,type:'heal'}], vines:[{x:480,y:72,length:185}], hazards:[], enemies:[[480,205,'boss']] },
      { name: '連環の吊り橋', obstacles: [{x:205,y:245,w:72,h:120,height:999,type:'pillar'},{x:700,y:175,w:72,h:120,height:999,type:'pillar'}], pots:[{x:155,y:390},{x:805,y:390,mystic:true}], plants:[{x:470,y:155,type:'max',id:'max-room-10'}], vines:[{x:330,y:70,length:170},{x:480,y:72,length:285},{x:635,y:70,length:205}], hazards:[{x:285,y:250,w:390,h:125,type:'spikes'}], enemies:[[165,165,'bow'],[420,185,'heavy'],[565,180,'spear'],[805,170,'bow']] },
      { name: '王の茨庭', obstacles: [{x:180,y:180,w:72,h:125,height:999,type:'pillar'},{x:708,y:180,w:72,h:125,height:999,type:'pillar'},{x:430,y:330,w:100,h:55,height:58,type:'crate'}], pots:[{x:150,y:390,mystic:true},{x:810,y:390}], plants:[{x:480,y:150,type:'heal'}], vines:[{x:285,y:72,length:225},{x:480,y:70,length:155},{x:675,y:72,length:260}], hazards:[{x:300,y:210,w:150,h:105,type:'spikes'},{x:510,y:210,w:150,h:105,type:'spikes'}], enemies:[[150,160,'heavy'],[300,365,'bow'],[480,190,'spear'],[660,365,'bow'],[810,160,'sword']] },
      { name: '静かな蔓廊', obstacles: [{x:210,y:180,w:72,h:125,height:999,type:'pillar'},{x:682,y:270,w:72,h:125,height:999,type:'pillar'}], pots:[{x:155,y:390},{x:805,y:390,mystic:true}], plants:[{x:790,y:145,type:'heal'}], vines:[{x:345,y:72,length:155},{x:505,y:72,length:265},{x:650,y:72,length:195}], hazards:[{x:310,y:285,w:330,h:105,type:'spikes'}], enemies:[[165,165,'bow'],[415,185,'spear'],[600,180,'heavy'],[800,175,'bow']] },
      { name: '盾兵の訓練所', obstacles: [{x:285,y:215,w:78,h:128,height:999,type:'pillar'},{x:595,y:215,w:78,h:128,height:999,type:'pillar'},{x:430,y:355,w:100,h:55,height:58,type:'crate'}], pots:[{x:150,y:390,mystic:true},{x:810,y:390},{x:480,y:165}], plants:[{x:480,y:410,type:'max',id:'max-room-13'}], vines:[{x:480,y:72,length:175}], hazards:[], enemies:[[175,170,'heavy'],[370,175,'sword'],[590,175,'heavy'],[790,170,'spear']] },
      { name: '最後の茨橋', obstacles: [{x:175,y:190,w:70,h:122,height:999,type:'pillar'},{x:715,y:190,w:70,h:122,height:999,type:'pillar'}], pots:[{x:145,y:395},{x:815,y:395,mystic:true}], plants:[{x:480,y:150,type:'heal'}], vines:[{x:300,y:70,length:220},{x:480,y:70,length:290},{x:665,y:70,length:180}], hazards:[{x:250,y:235,w:180,h:155,type:'spikes'},{x:530,y:235,w:180,h:155,type:'spikes'}], enemies:[[155,160,'bow'],[335,180,'heavy'],[480,185,'spear'],[625,180,'heavy'],[805,160,'bow']] },
      { name: '割れ橋の回廊', obstacles: [{x:185,y:180,w:70,h:122,height:999,type:'pillar'},{x:705,y:285,w:70,h:122,height:999,type:'pillar'},{x:430,y:340,w:100,h:54,height:58,type:'crate'}], pots:[{x:150,y:395},{x:810,y:155,mystic:true}], plants:[{x:480,y:145,type:'heal'}], vines:[{x:315,y:70,length:165},{x:535,y:70,length:275},{x:720,y:70,length:185}], hazards:[{x:270,y:245,w:175,h:150,type:'spikes'},{x:515,y:245,w:175,h:150,type:'spikes'}], enemies:[[155,165,'bow'],[360,180,'heavy'],[600,180,'spear'],[805,345,'bow']] },
      { name: '壺兵の関所', obstacles: [{x:250,y:205,w:76,h:126,height:999,type:'pillar'},{x:635,y:205,w:76,h:126,height:999,type:'pillar'},{x:430,y:270,w:100,h:55,height:58,type:'crate'}], pots:[{x:145,y:385},{x:300,y:385},{x:660,y:385},{x:815,y:385,mystic:true}], plants:[{x:480,y:145,type:'max',id:'max-room-17'}], vines:[{x:480,y:72,length:205}], hazards:[], enemies:[[170,170,'spear'],[350,175,'heavy'],[610,175,'spear'],[790,170,'bow']] },
      { name: '最後の蔓庭', obstacles: [{x:205,y:190,w:72,h:125,height:999,type:'pillar'},{x:683,y:190,w:72,h:125,height:999,type:'pillar'}], pots:[{x:145,y:395,mystic:true},{x:815,y:395}], plants:[{x:480,y:155,type:'heal'}], vines:[{x:285,y:70,length:285},{x:480,y:70,length:155},{x:675,y:70,length:245}], hazards:[{x:300,y:220,w:145,h:185,type:'spikes'},{x:515,y:220,w:145,h:185,type:'spikes'}], enemies:[[155,165,'heavy'],[335,175,'bow'],[480,185,'spear'],[625,175,'bow'],[805,165,'heavy']] },
      { name: '風矢の回廊', obstacles: [{x:330,y:185,w:72,h:125,height:999,type:'pillar'},{x:620,y:275,w:72,h:125,height:999,type:'pillar'}], pots:[{x:190,y:390,mystic:true},{x:780,y:390}], plants:[{x:790,y:145,type:'heal'}], vines:[{x:500,y:72,length:245}], hazards:[{x:100,y:82,w:58,h:340,type:'spikes'},{type:'wind',x:155,y:82,w:717,h:340,dirX:-1,dirY:0,interval:5.2,duration:2.0,power:235},{type:'turret',x:850,y:155,dirX:-1,dirY:0,interval:2.25,delay:0.5},{type:'turret',x:850,y:330,dirX:-1,dirY:0,interval:2.8,delay:1.4}], enemies:[[260,170,'bow'],[515,185,'heavy'],[750,250,'spear']] },
      { name: '守護隊長の間', finalBoss:true, bossLives:7, obstacles: [{x:185,y:215,w:75,h:120,height:999,type:'pillar'},{x:700,y:215,w:75,h:120,height:999,type:'pillar'}], pots:[{x:285,y:380,mystic:true},{x:675,y:380}], plants:[{x:480,y:405,type:'heal'}], vines:[{x:480,y:72,length:190}], hazards:[{type:'turret',x:840,y:150,dirX:-1,dirY:0,interval:3.1,delay:0.8},{type:'turret',x:120,y:340,dirX:1,dirY:0,interval:3.6,delay:2.0}], enemies:[[480,205,'boss']] },
    ];
    return rooms[index];
  }

  function loadRoom(index, save = true) {
    currentRoomIndex = clamp(index, 0, TOTAL_ROOMS - 1);
    const data = roomData(currentRoomIndex);
    currentRoomData = data;
    player = makePlayer();
    player.hp = clamp(runStats.hp, 1, runStats.maxHp);
    player.maxHp = runStats.maxHp;
    obstacles = data.obstacles.map(o => ({...o}));
    pots = data.pots.map(o => ({...o, radius:28, broken:false, shake:0, rolling:false, rollSpeed:0, used:false}));
    plants = (data.plants || []).map(o => ({...o, fruitReady:false, fruitX:null, fruitY:null, consumed:o.type === 'max' && runStats.maxFruitTaken.includes(o.id), pulse:Math.random()*6.28}));
    vines = (data.vines || []).map((v, i) => ({...v, id:`vine-${currentRoomIndex}-${i}`, sway:Math.random()*Math.PI*2}));
    hazards = (data.hazards || []).map(h => ({...h, pulse:Math.random()*Math.PI*2, timer:-(h.delay || 0), active:false, activeTimer:0}));
    enemies = data.enemies.map(([x,y,w]) => makeEnemy(x,y,w));
    if (data.bossLives) for (const e of enemies) if (e.isBoss) e.bossLives = data.bossLives;
    particles = []; arrows = []; doorOpen = false; roomCleared = false; shake = 0;
    messageEl.textContent = `第${currentRoomIndex + 1}部屋「${data.name}」— 敵を全員無力化せよ`;
    if (save) saveProgress();
  }

  function saveProgress() {
    runStats.hp = player?.hp ?? runStats.hp;
    runStats.maxHp = player?.maxHp ?? runStats.maxHp;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ room: currentRoomIndex, hp: runStats.hp, maxHp: runStats.maxHp, maxFruitTaken: runStats.maxFruitTaken, updated: Date.now() })); } catch (_) {}
    updateContinueButton();
  }

  function readSaveData() {
    try {
      const raw = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(LEGACY_SAVE_KEY);
      const v = JSON.parse(raw);
      if (!Number.isInteger(v?.room)) return null;
      return { room: clamp(v.room,0,TOTAL_ROOMS-1), hp: clamp(Number(v.hp) || 5, 1, Math.max(5, Number(v.maxHp) || 5)), maxHp: Math.max(5, Number(v.maxHp) || 5), maxFruitTaken: Array.isArray(v.maxFruitTaken) ? v.maxFruitTaken : [] };
    } catch (_) { return null; }
  }

  function readSave() { return readSaveData()?.room ?? null; }

  function updateContinueButton() {
    const room = readSave();
    continueBtn.disabled = room === null;
    saveStatus.textContent = room === null ? 'セーブデータなし' : `第${room + 1}部屋から再開できます`;
  }

  function showTitle() { gameMode = 'title'; titleScreen.classList.remove('hidden'); updateContinueButton(); }
  function startGame(room, saved = null) {
    runStats = saved ? { hp:saved.hp, maxHp:saved.maxHp, maxFruitTaken:[...saved.maxFruitTaken] } : { hp:5, maxHp:5, maxFruitTaken:[] };
    gameMode = 'playing'; titleScreen.classList.add('hidden'); loadRoom(room);
  }
  function resetGame() { if (gameMode === 'playing') loadRoom(currentRoomIndex, false); else showTitle(); }

  function makeEnemy(x, y, weapon = 'sword') {
    const isBoss = weapon === 'boss';
    if (isBoss) weapon = 'sword';
    const isHeavy = weapon === 'heavy';
    const patrolRadius = isBoss ? 90 : (weapon === 'spear' ? 115 : (weapon === 'bow' ? 165 : (isHeavy ? 105 : 145)));
    return {
      x, y,
      radius: isBoss ? 38 : (isHeavy ? 30 : 25),
      hp: isBoss ? 3 : (isHeavy ? 2 : 2),
      isHeavy,
      helmetOn: isHeavy,
      shieldOn: isHeavy,
      isBoss,
      bossLives: isBoss ? 3 : 1,
      state: 'walk', // walk, tripped, stunned（既存戦闘状態）
      stateTimer: 0,
      angle: Math.random() * Math.PI * 2,
      speed: isBoss ? 92 : (weapon === 'bow' ? 72 : (isHeavy ? 46 : 58 + Math.random() * 18)),
      faceCooldown: 0,
      weapon,
      attackState: 'idle', // idle, windup, active, recover
      attackTimer: 0.5 + Math.random(),
      attackAngle: 0,
      attackHit: false,
      strugglePhase: Math.random() * Math.PI * 2,

      // v0.9 敵AI。戦闘状態とは分離し、既存の転倒・気絶処理を維持する。
      aiState: 'patrol', // patrol, chase, search, investigatePot
      visionRange: isBoss ? 380 : (weapon === 'spear' ? 300 : (weapon === 'bow' ? 390 : (isHeavy ? 255 : 270))),
      visionHalfAngle: weapon === 'spear' ? 0.62 : (weapon === 'bow' ? 0.72 : 0.78),
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
  startBtn.addEventListener('click', () => { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(LEGACY_SAVE_KEY); } catch (_) {} startGame(0); });
  continueBtn.addEventListener('click', () => { const saved = readSaveData(); startGame(saved?.room ?? 0, saved); });

  function update(dt) {
    if (gameMode !== 'playing') { clearPressed(); return; }
    const p = player;
    if (p.deathTimer > 0) {
      p.deathTimer -= dt;
      updateParticles(dt);
      if (p.deathTimer <= 0) { runStats.hp = runStats.maxHp; loadRoom(currentRoomIndex, false); messageEl.textContent = '力を取り戻して部屋の入口から再挑戦！'; }
      clearPressed(); return;
    }
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

    if (!p.vineAttached && input.stick && !p.attachedEnemy && p.z < 70) tryGrabVine();
    if (p.vineAttached) {
      if (input.jumpPressed) {
        releaseVine(true);
      } else {
        updateVineSwing(dt, mx, my, m);
        if (input.stick) p.vineGrace = 0.34;
        else p.vineGrace = Math.max(0, p.vineGrace - dt);
        if (p.vineGrace <= 0) releaseVine(false);
      }
      if (p.vineAttached) {
        for (const e of enemies) updateEnemy(e, dt);
        handlePlayerEnemyInteractions();
        updatePlants(dt);
        updateArrows(dt);
        updateParticles(dt);
        checkDoorOpen();
        clearPressed();
        return;
      }
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
      updateArrows(dt);
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
          if (e.isHeavy && e.helmetOn) {
            e.helmetOn = false;
            p.attachedEnemy = null;
            p.z = 18;
            p.vz = 145;
            e.faceCooldown = 0.9;
            e.aiState = 'chase';
            e.alert = 1;
            messageEl.textContent = '重装歩兵の兜を引きはがした！ もう一度頭へくっつける';
            burst(e.x, e.y - 24, 24);
          } else {
            stunEnemy(e);
            p.attachedEnemy = null;
            p.z = 15;
            p.vz = 110;
            burst(e.x, e.y, 16);
          }
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
            if (pot.mystic && !pot.used) {
              pot.used = true;
              healPlayer(2, '神秘の水がスライムへ染み込み、HPが2回復した！');
              burst(pot.x, pot.y, 20);
            } else {
              messageEl.textContent = pot.mystic ? '水を吸収した神秘の壺に隠れた' : '壺の中に隠れた！ 見られていなければ安全です';
              burst(pot.x, pot.y, 8);
            }
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
    if (input.stick && wall && p.z > 3 && !p.attachedEnemy && !p.vineAttached) {
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
    updatePlants(dt);
    updateArrows(dt);
    updateHazards(dt);

    updateParticles(dt);

    checkDoorOpen();
    if (doorOpen && !roomCleared && p.y < ROOM.top + 34 && p.x > DOOR.x && p.x < DOOR.x + DOOR.w) {
      roomCleared = true; burst(p.x, p.y, 28);
      // 最終クリアは部屋番号ではなく、部屋データの finalBoss フラグで判定する。
      // 部屋を追加・並べ替えしても途中終了しない。
      if (!currentRoomData?.finalBoss) {
        const nextRoom = currentRoomIndex + 1;
        if (nextRoom < TOTAL_ROOMS) {
          messageEl.textContent = '次の部屋へ…';
          runStats.hp = p.hp; runStats.maxHp = p.maxHp;
          if (currentRoomData?.checkpointBoss) {
            runStats.hp = runStats.maxHp;
            messageEl.textContent = '守護者を倒した！ セーブポイントでHPが全回復した';
            saveProgress();
          }
          loadRoom(nextRoom);
        } else {
          // データ不整合時も誤ってクリアにせず、進行不能の原因を画面へ示す。
          roomCleared = false;
          messageEl.textContent = '次の部屋データが見つかりません。進行状態を保持しました';
        }
      } else {
        gameMode = 'complete';
        messageEl.textContent = '守護隊長を倒した！ Slime’s Revenge クリア！';
        try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
      }
    }

    clearPressed();
  }

  function vineEnd(vine, angle = 0) {
    return { x: vine.x + Math.sin(angle) * vine.length, y: vine.y + Math.cos(angle) * vine.length };
  }

  function tryGrabVine() {
    let best = null;
    let bestDist = 52;
    for (const vine of vines) {
      const end = vineEnd(vine, 0);
      const dist = Math.hypot(player.x - end.x, player.y - end.y);
      if (dist < bestDist) { best = vine; bestDist = dist; }
    }
    if (!best) return false;
    const dx = player.x - best.x;
    const dy = player.y - best.y;
    player.vineAttached = best;
    player.vineAngle = clamp(Math.atan2(dx, Math.max(12, dy)), -1.05, 1.05);
    player.vineAngularVelocity = 0;
    player.vineGrace = 0.34;
    player.vz = 0;
    player.z = 22;
    player.dashTimer = 0;
    player.slam = false;
    player.dashJump = false;
    burst(player.x, player.y, 8);
    messageEl.textContent = 'ツタを掴んだ！ 方向入力で振り子の勢いをつけよう';
    return true;
  }

  function updateVineSwing(dt, mx, my, magnitude) {
    const p = player;
    const vine = p.vineAttached;
    if (!vine) return;
    // 下向きを安定点にした振り子。入力の接線成分で勢いを足す。
    const tangentX = Math.cos(p.vineAngle);
    const tangentY = -Math.sin(p.vineAngle);
    const inputTorque = magnitude > 0 ? (mx * tangentX + my * tangentY) * 5.8 : 0;
    const gravityTorque = -Math.sin(p.vineAngle) * 4.2;
    p.vineAngularVelocity += (gravityTorque + inputTorque) * dt;
    p.vineAngularVelocity *= Math.pow(0.992, dt * 60);
    p.vineAngularVelocity = clamp(p.vineAngularVelocity, -3.35, 3.35);
    p.vineAngle += p.vineAngularVelocity * dt;
    if (p.vineAngle > 1.22) { p.vineAngle = 1.22; p.vineAngularVelocity *= -0.28; }
    if (p.vineAngle < -1.22) { p.vineAngle = -1.22; p.vineAngularVelocity *= -0.28; }
    const end = vineEnd(vine, p.vineAngle);
    p.x = clamp(end.x, ROOM.left + p.radius, ROOM.right - p.radius);
    p.y = clamp(end.y, ROOM.top + p.radius, ROOM.bottom - p.radius);
    p.z = 22 + Math.abs(Math.sin(p.vineAngle)) * 16;
    p.vz = 0;
    p.facingX = tangentX * Math.sign(p.vineAngularVelocity || 1);
    p.facingY = tangentY * Math.sign(p.vineAngularVelocity || 1);
  }

  function releaseVine(jump) {
    const p = player;
    if (!p.vineAttached) return;
    const tangentX = Math.cos(p.vineAngle);
    const tangentY = -Math.sin(p.vineAngle);
    const direction = Math.sign(p.vineAngularVelocity || 1);
    const speed = Math.abs(p.vineAngularVelocity) * p.vineAttached.length;
    p.vineAttached = null;
    p.vineGrace = 0;
    p.dashJump = true;
    p.dashJumpX = tangentX * direction;
    p.dashJumpY = tangentY * direction;
    p.vz = jump ? 430 : 250;
    p.z = Math.max(18, p.z);
    p.x += p.dashJumpX * clamp(speed * 0.035, 5, 18);
    p.y += p.dashJumpY * clamp(speed * 0.035, 5, 18);
    p.airDashUsed = false;
    burst(p.x, p.y, jump ? 13 : 7);
    messageEl.textContent = jump ? 'ツタから勢いよく飛び出した！' : 'ツタから離れた';
  }

  function stunEnemy(e) {
    if (e.isBoss && e.bossLives > 1) {
      e.bossLives--; e.state = 'tripped'; e.stateTimer = 1.35; e.attackState = 'idle';
      e.speed += 18; e.visionRange += 20; shake = Math.max(shake, 12); burst(e.x,e.y,28);
      messageEl.textContent = `ボスの装甲を破った！ 残り${e.bossLives}段階`;
      return false;
    }
    e.state = 'stunned'; e.stateTimer = 999; burst(e.x,e.y,e.isBoss ? 42 : 16);
    return true;
  }

  function checkDoorOpen() {
    if (!doorOpen && enemies.every((e) => e.state === 'stunned')) {
      doorOpen = true;
      const fruit = plants.some(p => p.fruitReady && !p.consumed);
      messageEl.textContent = fruit ? '敵を全員倒した！ 植物に実がなった。くっつきで吸収できる！' : '扉が開いた！ 上の出口へ！';
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
        stunEnemy(hitEnemy);
        hitEnemy.attackState = 'idle';
        messageEl.textContent = '壺が槍兵を直撃！ 槍兵を気絶させた！';
      } else {
        hitEnemy.attackState = 'recover';
        hitEnemy.attackTimer = 0.35;
        messageEl.textContent = hitEnemy.weapon === 'bow' ? '弓兵の矢で壺が割れた！' : '剣兵に壺を斬り割られた！';
      }
    } else if (cause === 'sword') {
      messageEl.textContent = '剣兵に壺を斬り割られた！';
    }

    exitPot(pot, true, -player.potRollX || 0, -player.potRollY || -1);
    if (hitEnemy?.weapon === 'spear') messageEl.textContent = '壺が槍兵を直撃！ 槍兵を気絶させた！';
    else if (cause === 'arrow' || hitEnemy?.weapon === 'bow') messageEl.textContent = '弓兵の矢で壺が割れ、スライムが飛び出した！';
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
      if (e.weapon === 'bow') {
        const dx = pot.x - e.x, dy = pot.y - e.y;
        const dist = Math.hypot(dx, dy) || 1;
        e.angle = Math.atan2(dy, dx);
        moveEnemyToward(e, e.x - dx, e.y - dy, e.speed * 1.25, dt);
      } else if (e.weapon === 'sword' || e.weapon === 'heavy') {
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

    if (e.weapon === 'bow') {
      updateArcherCombat(e, dt, targetX, targetY, dist);
      return;
    }

    const reach = e.weapon === 'spear' ? 122 : (e.weapon === 'heavy' ? 92 : 82);

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

  function updateArcherCombat(e, dt, targetX, targetY, dist) {
    const dx = targetX - e.x, dy = targetY - e.y;
    e.angle = Math.atan2(dy, dx);

    if (e.attackState !== 'idle') {
      e.attackTimer -= dt;
      if (e.attackState === 'windup') {
        if (!player.hiddenPot) e.attackAngle = Math.atan2(player.y - e.y, player.x - e.x);
        if (e.attackTimer <= 0) {
          fireArrow(e);
          e.attackState = 'recover';
          e.attackTimer = 0.72;
        }
      } else if (e.attackState === 'recover' && e.attackTimer <= 0) {
        e.attackState = 'idle';
        e.attackTimer = 0.45 + Math.random() * 0.35;
      }
      return;
    }

    e.attackTimer -= dt;
    if (dist < 155) {
      moveEnemyAwayFrom(e, targetX, targetY, e.speed * 1.35, dt);
      return;
    }
    if (dist > 330) {
      moveEnemyToward(e, targetX, targetY, e.speed * 0.92, dt);
      return;
    }
    if (!player.hiddenPot && player.z < 50 && e.attackTimer <= 0 && !pillarBlocksSight(e.x, e.y, player.x, player.y)) {
      e.attackState = 'windup';
      e.attackTimer = 0.58;
      e.attackAngle = Math.atan2(player.y - e.y, player.x - e.x);
      return;
    }
    if (dist < 205) moveEnemyAwayFrom(e, targetX, targetY, e.speed * 0.72, dt);
  }

  function moveEnemyAwayFrom(e, tx, ty, speed, dt) {
    const dx = e.x - tx, dy = e.y - ty;
    const dist = Math.hypot(dx, dy) || 1;
    const fleeX = clamp(e.x + dx / dist * 120, ROOM.left + 35, ROOM.right - 35);
    const fleeY = clamp(e.y + dy / dist * 120, ROOM.top + 35, ROOM.bottom - 35);
    moveEnemyToward(e, fleeX, fleeY, speed, dt);
    e.angle = Math.atan2(ty - e.y, tx - e.x);
  }

  function fireArrow(e) {
    const a = e.attackAngle;
    arrows.push({ x:e.x + Math.cos(a)*32, y:e.y + Math.sin(a)*32, vx:Math.cos(a)*430, vy:Math.sin(a)*430, angle:a, radius:7, life:2.2, owner:e });
    burst(e.x + Math.cos(a)*28, e.y + Math.sin(a)*28, 5);
  }

  function updateArrows(dt) {
    for (const arrow of arrows) {
      if (arrow.dead) continue;
      arrow.life -= dt;
      const steps = Math.max(1, Math.ceil(Math.hypot(arrow.vx, arrow.vy) * dt / 12));
      for (let i=0; i<steps && !arrow.dead; i++) {
        arrow.x += arrow.vx * dt / steps;
        arrow.y += arrow.vy * dt / steps;
        if (arrow.x < ROOM.left || arrow.x > ROOM.right || arrow.y < ROOM.top || arrow.y > ROOM.bottom || circleHitsAnyObstacle(arrow.x, arrow.y, arrow.radius, 0)) {
          arrow.dead = true;
          burst(arrow.x, arrow.y, 4);
          break;
        }
        const pot = pots.find(p => !p.broken && Math.hypot(p.x-arrow.x,p.y-arrow.y) < p.radius + arrow.radius);
        if (pot) {
          arrow.dead = true;
          if (player.hiddenPot === pot) breakPot(pot, 'arrow', arrow.owner);
          else burst(arrow.x, arrow.y, 5);
          break;
        }
        if (!player.hiddenPot && player.z < 38 && player.invuln <= 0 && player.hurtTimer <= 0 && Math.hypot(player.x-arrow.x, player.y-arrow.y) < player.radius + arrow.radius) {
          arrow.dead = true;
          damagePlayer(1, '矢に射抜かれた！ HPが1減った');
          player.x += Math.cos(arrow.angle) * 30;
          player.y += Math.sin(arrow.angle) * 30;
          shake = 5; burst(player.x, player.y, 9);
        }
      }
      if (arrow.life <= 0) arrow.dead = true;
    }
    arrows = arrows.filter(a => !a.dead);
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

  function enemyPositionUnsafe(x, y, radius) {
    if (circleHitsAnyObstacle(x, y, radius, 0)) return true;
    return hazards?.some((hazard) => hazard.type === 'spikes' && circleRectHit(x, y, radius + 5, spikeHitbox(hazard, 7)));
  }

  function moveEnemyToward(e, tx, ty, speed, dt) {
    const dx = tx - e.x, dy = ty - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 10) return true;
    e.angle = Math.atan2(dy, dx);
    const oldX = e.x, oldY = e.y;
    const step = speed * dt;
    e.x += dx / dist * step;
    e.y += dy / dist * step;
    if (enemyPositionUnsafe(e.x, e.y, e.radius)) {
      e.x = oldX; e.y = oldY;
      // 障害物とトゲ床の両方を壁として扱い、左右の安全な側へ回り込む。
      const preferredSide = Math.sin(e.x * 0.031 + e.y * 0.017) > 0 ? 1 : -1;
      let moved = false;
      for (const side of [preferredSide, -preferredSide]) {
        const sideAngle = e.angle + side * Math.PI / 2;
        const nx = oldX + Math.cos(sideAngle) * step * 0.82;
        const ny = oldY + Math.sin(sideAngle) * step * 0.82;
        if (!enemyPositionUnsafe(nx, ny, e.radius)) {
          e.x = nx; e.y = ny; moved = true; break;
        }
      }
      if (!moved) {
        // 角へ追い込まれた場合は、危険地帯から離れる方向を小さく探索する。
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4;
          const nx = oldX + Math.cos(a) * step * 0.7;
          const ny = oldY + Math.sin(a) * step * 0.7;
          if (!enemyPositionUnsafe(nx, ny, e.radius)) { e.x = nx; e.y = ny; moved = true; break; }
        }
      }
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
      const damage = e.isBoss ? 2 : 1;
      damagePlayer(damage, e.weapon === 'spear' ? '槍攻撃！ HPが1減った' : (e.isBoss ? '守護隊長の剣撃！ HPが2減った' : '剣攻撃！ HPが1減った'));
      const nx = dist ? dx / dist : 1;
      const ny = dist ? dy / dist : 0;
      player.x += nx * 38;
      player.y += ny * 38;
      player.dashTimer = 0;
      shake = 6;
      burst(player.x, player.y, 10);
    }
  }


  function damagePlayer(amount, message) {
    if (player.invuln > 0 || player.hurtTimer > 0 || player.deathTimer > 0) return false;
    player.hp = Math.max(0, player.hp - amount);
    runStats.hp = player.hp;
    player.hurtTimer = 0.8;
    player.invuln = Math.max(player.invuln, 0.65);
    messageEl.textContent = message;
    if (player.hp <= 0) {
      player.deathTimer = 1.15;
      player.dashTimer = 0;
      player.attachedEnemy = null;
      if (player.hiddenPot) exitPot(player.hiddenPot, false);
      messageEl.textContent = 'HPがなくなった… 部屋の入口から再挑戦';
      shake = 11;
      burst(player.x, player.y, 30);
    }
    return true;
  }

  function healPlayer(amount, message) {
    const before = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + amount);
    runStats.hp = player.hp;
    messageEl.textContent = player.hp > before ? message : 'HPは満タンです';
    saveProgress();
  }

  function fruitPositionIsSafe(x, y) {
    const radius = 18;
    if (x < 125 || x > 835 || y < 115 || y > 420) return false;
    if (obstacles.some(o => circleRectHit(x, y, radius, o))) return false;
    if (hazards.some(h => h.type === 'spikes' && circleRectHit(x, y, radius, spikeHitbox(h, 8)))) return false;
    if (pots.some(p => !p.broken && Math.hypot(x - p.x, y - p.y) < radius + p.radius + 8)) return false;
    return true;
  }

  function placePlantFruit(plant) {
    // 実は茎の先に見える距離を最優先。障害物がある時は植物ごと近くへ移す。
    const closeFruitOffsets = [[0,-31],[-18,-29],[18,-29],[-24,-22],[24,-22]];
    for (const [ox, oy] of closeFruitOffsets) {
      const x = plant.x + ox, y = plant.y + oy;
      if (fruitPositionIsSafe(x, y)) {
        plant.fruitX = x;
        plant.fruitY = y;
        return;
      }
    }
    const plantMoves = [[-36,0],[36,0],[0,36],[-36,30],[36,30],[-60,0],[60,0]];
    for (const [mx,my] of plantMoves) {
      const nx=plant.x+mx, ny=plant.y+my;
      if (!fruitPositionIsSafe(nx, ny)) continue;
      const fx=nx, fy=ny-31;
      if (!fruitPositionIsSafe(fx, fy)) continue;
      plant.x=nx; plant.y=ny; plant.fruitX=fx; plant.fruitY=fy;
      return;
    }
    plant.fruitX = plant.x;
    plant.fruitY = plant.y - 31;
  }

  function updatePlants(dt) {
    const allDefeated = enemies.every(e => e.state === 'stunned');
    for (const plant of plants) {
      plant.pulse += dt * 3;
      if (allDefeated && !plant.consumed && !plant.fruitReady) {
        plant.fruitReady = true;
        placePlantFruit(plant);
      }
      if (!plant.fruitReady || plant.consumed) continue;
      const fruitX = plant.fruitX ?? plant.x;
      const fruitY = plant.fruitY ?? (plant.y - 36);
      const dist = Math.hypot(player.x - fruitX, player.y - fruitY);
      if (input.stickPressed && player.z < 28 && dist < 58) {
        plant.consumed = true;
        plant.fruitReady = false;
        if (plant.type === 'max') {
          player.maxHp += 1;
          player.hp = Math.min(player.maxHp, player.hp + 1);
          runStats.maxHp = player.maxHp;
          runStats.hp = player.hp;
          if (plant.id && !runStats.maxFruitTaken.includes(plant.id)) runStats.maxFruitTaken.push(plant.id);
          messageEl.textContent = '色違いのゼリーの実を吸収！ 最大HPが1増えた！';
          burst(fruitX, fruitY, 28);
          saveProgress();
        } else {
          healPlayer(1, 'ゼリーの実を吸収してHPが1回復した！');
          burst(fruitX, fruitY, 18);
        }
      }
    }
  }


  function spikeHitbox(hazard, inset = 12) {
    return { x: hazard.x + inset, y: hazard.y + inset, w: Math.max(0, hazard.w - inset * 2), h: Math.max(0, hazard.h - inset * 2) };
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
    let collided = false;

    // 柱の角や根元へ斜めに入っても、最短方向へ押し出して接線方向の移動を残す。
    for (let pass = 0; pass < 4; pass++) {
      let pushed = false;
      for (const o of obstacles) {
        if (p.z >= o.height || !circleRectHit(p.x, p.y, p.radius, o)) continue;
        collided = pushed = true;
        const qx = clamp(p.x, o.x, o.x + o.w);
        const qy = clamp(p.y, o.y, o.y + o.h);
        let dx = p.x - qx, dy = p.y - qy;
        let dist = Math.hypot(dx, dy);
        if (dist > 0.0001) {
          const push = p.radius - dist + 0.6;
          p.x += dx / dist * push;
          p.y += dy / dist * push;
        } else {
          const left = Math.abs(p.x - o.x), right = Math.abs(o.x + o.w - p.x);
          const top = Math.abs(p.y - o.y), bottom = Math.abs(o.y + o.h - p.y);
          const m = Math.min(left,right,top,bottom);
          if (m === left) p.x = o.x - p.radius - 0.6;
          else if (m === right) p.x = o.x + o.w + p.radius + 0.6;
          else if (m === top) p.y = o.y - p.radius - 0.6;
          else p.y = o.y + o.h + p.radius + 0.6;
        }
      }
      if (!pushed) break;
    }

    p.x = clamp(p.x, ROOM.left + p.radius, ROOM.right - p.radius);
    p.y = clamp(p.y, ROOM.top + p.radius, ROOM.bottom - p.radius);
    if (collided && p.dashTimer > 0) p.dashTimer = Math.min(p.dashTimer, 0.08);
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

      if (input.stickPressed && p.dashTimer > 0 && p.z < 12 && dist < (e.isHeavy ? 64 : 56) && e.state === 'walk') {
        e.state = 'tripped';
        e.stateTimer = e.isHeavy ? 2.55 : 2.2;
        p.dashTimer = 0;
        if (e.isHeavy && e.shieldOn) {
          e.shieldOn = false;
          messageEl.textContent = '重装歩兵を転ばせて盾を手放させた！';
          burst(e.x + Math.cos(e.angle) * 28, e.y + Math.sin(e.angle) * 28, 20);
        }
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

      if (dist < p.radius + e.radius - 4 && p.z < 16 && e.state === 'walk') {
        // 敵本体との接触ではダメージを受けない。互いの中心が重ならないよう押し戻すだけ。
        const len = dist || 1;
        const overlap = p.radius + e.radius - dist;
        p.x += (dx / len) * Math.max(2, overlap * 0.55);
        p.y += (dy / len) * Math.max(2, overlap * 0.55);
      }
    }
  }

  function slamImpact() {
    shake = 8;
    burst(player.x, player.y, 22);
    for (const e of enemies) {
      if (e.state === 'stunned') continue;
      const dist = Math.hypot(player.x - e.x, player.y - e.y);
      if (dist < (e.isHeavy ? 86 : 76)) {
        if (e.isHeavy && e.shieldOn) {
          e.shieldOn = false;
          e.state = 'tripped';
          e.stateTimer = 2.5;
          messageEl.textContent = '急降下の衝撃で重装歩兵が盾を落とした！';
          burst(e.x + Math.cos(e.angle) * 30, e.y + Math.sin(e.angle) * 30, 22);
          continue;
        }
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

  function updateHazards(dt) {
    if (!hazards?.length || player.deathTimer > 0) return;
    for (const hazard of hazards) {
      hazard.pulse += dt * 2.4;
      if (hazard.type === 'spikes') {
        if (player.hiddenPot || player.vineAttached || player.z >= 22 || player.invuln > 0) continue;
        const hitbox = spikeHitbox(hazard, 13);
        if (hitbox.w > 0 && hitbox.h > 0 && circleRectHit(player.x, player.y, player.radius * 0.48, hitbox)) {
          damagePlayer(1, 'トゲ床！ HPが1減った');
          const cx = hazard.x + hazard.w / 2, cy = hazard.y + hazard.h / 2;
          let dx = player.x - cx, dy = player.y - cy;
          const len = Math.hypot(dx, dy) || 1;
          player.x += dx / len * 24; player.y += dy / len * 24; player.vz = Math.max(player.vz, 250);
        }
      } else if (hazard.type === 'wind') {
        hazard.timer += dt;
        if (!hazard.active && hazard.timer >= (hazard.interval || 5)) { hazard.active=true; hazard.activeTimer=hazard.duration || 2; hazard.timer=0; messageEl.textContent='右から強風が吹いてきた！'; }
        if (hazard.active) {
          hazard.activeTimer -= dt;
          if (hazard.activeTimer <= 0) hazard.active=false;
          if (!player.hiddenPot && !player.vineAttached && player.x>hazard.x && player.x<hazard.x+hazard.w && player.y>hazard.y && player.y<hazard.y+hazard.h) {
            const scale = player.z > 18 ? 1.2 : 1;
            player.x += (hazard.dirX || -1) * (hazard.power || 220) * dt * scale;
            player.y += (hazard.dirY || 0) * (hazard.power || 220) * dt * scale;
          }
        }
      } else if (hazard.type === 'turret') {
        hazard.timer += dt;
        if (hazard.timer >= (hazard.interval || 2.5)) {
          hazard.timer = 0;
          const a=Math.atan2(hazard.dirY || 0, hazard.dirX || -1);
          arrows.push({x:hazard.x,y:hazard.y,vx:Math.cos(a)*470,vy:Math.sin(a)*470,angle:a,radius:7,life:2.4,owner:null,trap:true});
          burst(hazard.x,hazard.y,6);
        }
      }
    }
    player.x = clamp(player.x, ROOM.left + player.radius, ROOM.right - player.radius);
    player.y = clamp(player.y, ROOM.top + player.radius, ROOM.bottom - player.radius);
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
    for (const hazard of hazards) drawHazard(hazard);
    for (const vine of vines) drawVine(vine);
    drawEnemySenses();

    for (const plant of plants) drawPlant(plant);

    const drawableObstacles = obstacles.map((o) => ({ ...o, isObstacle: true, sortY: o.y + o.h }));
    const drawablePots = pots.filter((pot) => !pot.broken).map((pot) => ({ ...pot, isPot: true, sortY: pot.y + pot.radius }));
    const sorted = [...enemies, player, ...drawableObstacles, ...drawablePots].sort((a, b) => (a.sortY ?? a.y) - (b.sortY ?? b.y));
    for (const obj of sorted) {
      if (obj === player) { if (!player.attachedEnemy && !player.hiddenPot) drawPlayer(); }
      else if (obj.isObstacle) drawObstacle(obj);
      else if (obj.isPot) drawPot(obj);
      else drawEnemy(obj);
    }

    for (const arrow of arrows) drawArrow(arrow);

    for (const pt of particles) {
      ctx.globalAlpha = Math.max(0, pt.life * 2);
      ctx.fillStyle = '#9cf3ff';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.textAlign = 'left'; ctx.font = '800 18px system-ui'; ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#11151d'; ctx.lineWidth = 5;
    const roomLabel = `ROOM ${currentRoomIndex + 1} / ${TOTAL_ROOMS}`;
    ctx.strokeText(roomLabel, 82, 91); ctx.fillText(roomLabel, 82, 91);
    drawHealthHud();
    const boss = enemies.find(e => e.isBoss && e.state !== 'stunned');
    if (boss) {
      ctx.fillStyle = '#171b22'; ctx.fillRect(W/2-180, 76, 360, 20);
      ctx.fillStyle = '#ff6d62'; ctx.fillRect(W/2-175, 81, 350 * (boss.bossLives/(currentRoomData?.bossLives || 3)), 10);
      ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.font='900 15px system-ui'; ctx.fillText('守護隊長', W/2, 72);
    }
    ctx.restore();

    if (gameMode === 'complete') {
      ctx.fillStyle = 'rgba(7,10,15,.68)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#080a0e';
      ctx.lineWidth = 9;
      ctx.font = '900 52px system-ui';
      ctx.strokeText('Slime’s Revenge クリア！', W / 2, H / 2 - 6);
      ctx.fillText('Slime’s Revenge クリア！', W / 2, H / 2 - 6);
      ctx.font = '800 22px system-ui';
      ctx.fillText('やり直しで最終部屋を再戦できます', W / 2, H / 2 + 38);
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

  function drawHazard(hazard) {
    if (hazard.type === 'wind') {
      if (!hazard.active) return;
      ctx.save(); ctx.globalAlpha=.34; ctx.strokeStyle='#d9f3ff'; ctx.lineWidth=4;
      for (let y=hazard.y+30;y<hazard.y+hazard.h;y+=48) { ctx.beginPath(); ctx.moveTo(hazard.x+hazard.w-10,y); ctx.lineTo(hazard.x+20,y+12); ctx.stroke(); }
      ctx.restore(); return;
    }
    if (hazard.type === 'turret') {
      ctx.save(); ctx.translate(hazard.x,hazard.y); ctx.fillStyle='#554b42'; ctx.strokeStyle='#11151d'; ctx.lineWidth=5;
      ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.rotate(Math.atan2(hazard.dirY||0,hazard.dirX||-1)); ctx.fillStyle='#252a30'; ctx.fillRect(0,-7,28,14); ctx.strokeRect(0,-7,28,14); ctx.restore(); return;
    }
    if (hazard.type !== 'spikes') return;
    ctx.save();
    // 床面より一段低い棘穴として描画。縁に少し触れただけではダメージにならない。
    ctx.fillStyle = '#8f8468';
    ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h);
    ctx.fillStyle = '#48443b';
    ctx.fillRect(hazard.x + 8, hazard.y + 8, Math.max(0, hazard.w - 16), Math.max(0, hazard.h - 16));
    ctx.strokeStyle = '#302d28';
    ctx.lineWidth = 3;
    ctx.strokeRect(hazard.x + 7, hazard.y + 7, Math.max(0, hazard.w - 14), Math.max(0, hazard.h - 14));
    ctx.lineWidth = 2;
    const step = 25;
    for (let y = hazard.y + 14; y < hazard.y + hazard.h - 10; y += step) {
      for (let x = hazard.x + 14; x < hazard.x + hazard.w - 10; x += step) {
        const offset = ((Math.floor((y-hazard.y)/step) & 1) ? step * 0.5 : 0);
        const sx = x + offset;
        if (sx > hazard.x + hazard.w - 6) continue;
        const pulse = 1 + Math.sin(hazard.pulse + x * 0.03 + y * 0.02) * 0.06;
        ctx.beginPath();
        ctx.moveTo(sx - 8, y + 13);
        ctx.lineTo(sx, y + 13 - 18 * pulse);
        ctx.lineTo(sx + 8, y + 13);
        ctx.closePath();
        ctx.fillStyle = '#c4b999';
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawVine(vine) {
    const active = player.vineAttached === vine;
    const angle = active ? player.vineAngle : 0; // 風や入力がないツタは静止
    const end = vineEnd(vine, angle);
    ctx.save();
    ctx.strokeStyle = '#23331f';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(vine.x, ROOM.top - 12); ctx.lineTo(vine.x, vine.y); ctx.stroke();
    ctx.strokeStyle = active ? '#8fe36f' : '#527c3f';
    ctx.lineWidth = active ? 8 : 7;
    ctx.beginPath();
    ctx.moveTo(vine.x, vine.y);
    const segments = 12;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const bx = vine.x + (end.x - vine.x) * t + Math.sin(t * Math.PI * 3 + vine.sway) * 3 * (1-t);
      const by = vine.y + (end.y - vine.y) * t;
      ctx.lineTo(bx, by);
    }
    ctx.stroke();
    for (let i = 2; i < segments; i += 3) {
      const t = i / segments;
      const lx = vine.x + (end.x - vine.x) * t;
      const ly = vine.y + (end.y - vine.y) * t;
      ctx.fillStyle = i % 2 ? '#6fae50' : '#83c85d';
      ctx.beginPath(); ctx.ellipse(lx + (i%2?8:-8), ly, 10, 5, i%2?.6:-.6, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = active ? '#b9ff8e' : '#75b957';
    ctx.strokeStyle = '#172115'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(end.x, end.y, 13, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.restore();
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


  function drawHealthHud() {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = '900 16px system-ui';
    ctx.strokeStyle = '#11151d'; ctx.lineWidth = 5; ctx.fillStyle = '#fff';
    ctx.strokeText(`HP ${player.hp} / ${player.maxHp}`, 82, 118);
    ctx.fillText(`HP ${player.hp} / ${player.maxHp}`, 82, 118);
    for (let i = 0; i < player.maxHp; i++) {
      const x = 84 + i * 24, y = 132;
      ctx.fillStyle = i < player.hp ? '#64f0bf' : '#303944';
      ctx.strokeStyle = '#10161d'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      if (i < player.hp) { ctx.fillStyle='rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(x-2,y-3,2.5,0,Math.PI*2); ctx.fill(); }
    }
    ctx.restore();
  }

  function drawPlant(plant) {
    ctx.save();
    ctx.translate(plant.x, plant.y);
    ctx.strokeStyle = '#183f2c'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0,14); ctx.quadraticCurveTo(-4,-8,0,-28); ctx.stroke();
    ctx.fillStyle = '#3fa968';
    ctx.beginPath(); ctx.ellipse(-12,-5,14,7,-0.45,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(12,-14,14,7,0.45,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#234d35'; ctx.beginPath(); ctx.ellipse(0,15,20,8,0,0,Math.PI*2); ctx.fill();
    if (plant.fruitReady && !plant.consumed) {
      const bob = Math.sin(plant.pulse) * 3;
      const fx = (plant.fruitX ?? plant.x) - plant.x;
      const fy = (plant.fruitY ?? (plant.y - 36)) - plant.y;
      ctx.shadowBlur = 16;
      ctx.shadowColor = plant.type === 'max' ? '#ff8df5' : '#8fffc8';
      ctx.fillStyle = plant.type === 'max' ? '#dd72ff' : '#74edaa';
      ctx.beginPath(); ctx.arc(fx,fy+bob,12,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(fx-4,fy-4+bob,3,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.textAlign='center'; ctx.font='800 13px system-ui'; ctx.fillStyle='#fff'; ctx.strokeStyle='#111'; ctx.lineWidth=4;
      ctx.strokeText('くっつき',fx,fy-21+bob); ctx.fillText('くっつき',fx,fy-21+bob);
    }
    ctx.restore();
  }

  function drawPot(pot) {
    ctx.save();
    const potWobble = pot.shake > 0 ? Math.sin(performance.now() * 0.055) * pot.shake * 5 : 0;
    ctx.translate(pot.x + potWobble, pot.y);
    if (pot.mystic && !pot.used) { ctx.shadowBlur = 22; ctx.shadowColor = '#8cecff'; }
    if (pot.rolling) ctx.rotate(performance.now() * 0.018 * (player.potRollX >= 0 ? 1 : -1));
    ctx.fillStyle = 'rgba(16,20,25,.25)';
    ctx.beginPath(); ctx.ellipse(7, 17, 31, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0a0d12'; ctx.lineWidth = 7;
    ctx.fillStyle = pot.mystic ? (pot.used ? '#557b86' : '#55b9d1') : '#b8643f';
    ctx.beginPath();
    ctx.moveTo(-18, -12);
    ctx.quadraticCurveTo(-25, 4, -18, 22);
    ctx.quadraticCurveTo(0, 34, 18, 22);
    ctx.quadraticCurveTo(25, 4, 18, -12);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = pot.mystic ? (pot.used ? '#7597a0' : '#8eeaff') : '#d98a58';
    ctx.beginPath(); ctx.ellipse(0, -13, 23, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = pot.mystic && !pot.used ? '#d7fbff' : '#402b23';
    ctx.beginPath(); ctx.ellipse(0, -13, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = pot.mystic ? '#36788a' : '#7d3f2c'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-18, 8); ctx.quadraticCurveTo(0, 16, 18, 8); ctx.stroke();
    if (player.hiddenPot && Math.hypot(player.hiddenPot.x - pot.x, player.hiddenPot.y - pot.y) < 2) {
      ctx.fillStyle = '#5ee4cf'; ctx.strokeStyle = '#0a0d12'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, -14, 10, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#10141b'; ctx.beginPath(); ctx.arc(-4, -17, 1.8, 0, Math.PI * 2); ctx.arc(4, -17, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawArrow(arrow) {
    ctx.save();
    ctx.translate(arrow.x, arrow.y);
    ctx.rotate(arrow.angle);
    ctx.strokeStyle='#0a0d12'; ctx.lineWidth=6; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-18,0); ctx.lineTo(17,0); ctx.stroke();
    ctx.strokeStyle='#b57a42'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(-18,0); ctx.lineTo(13,0); ctx.stroke();
    ctx.fillStyle='#dbe6e9'; ctx.strokeStyle='#0a0d12'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(22,0); ctx.lineTo(10,-7); ctx.lineTo(10,7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#e8d6b7'; ctx.beginPath(); ctx.moveTo(-18,0); ctx.lineTo(-27,-6); ctx.lineTo(-24,0); ctx.lineTo(-27,6); ctx.closePath(); ctx.fill();
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
    if (e.isBoss) { ctx.scale(1.32, 1.32); ctx.fillStyle='#f4cf55'; ctx.strokeStyle='#0a0d12'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(-18,-40); ctx.lineTo(-11,-57); ctx.lineTo(0,-43); ctx.lineTo(11,-57); ctx.lineTo(18,-40); ctx.closePath(); ctx.fill(); ctx.stroke(); }
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
      if (e.isHeavy) {
        if (e.helmetOn) {
          ctx.fillStyle = '#75808a'; ctx.strokeStyle = '#0a0d12'; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(0, -22, 23, Math.PI, Math.PI * 2); ctx.lineTo(22, -13); ctx.lineTo(-22, -13); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#303943'; ctx.fillRect(-20, -18, 40, 7);
        }
        if (e.shieldOn) {
          ctx.save(); ctx.rotate(e.angle || 0); ctx.translate(31, 5);
          ctx.fillStyle = '#697984'; ctx.strokeStyle = '#0a0d12'; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.roundRect(-7, -25, 26, 52, 8); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#9ba9af'; ctx.beginPath(); ctx.arc(6, 1, 5, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
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
      ctx.lineWidth = e.weapon === 'spear' ? 12 : (e.weapon === 'bow' ? 7 : 18);
      ctx.beginPath();
      if (e.weapon === 'spear') { ctx.moveTo(25, 0); ctx.lineTo(126, 0); }
      else if (e.weapon === 'bow') { ctx.moveTo(22, 0); ctx.lineTo(390, 0); }
      else { ctx.arc(0, 0, 82, -0.72, 0.72); }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = '#0a0d12'; ctx.fillStyle = '#d7e2e7'; ctx.lineWidth = 6;
    if (e.weapon === 'bow') {
      ctx.strokeStyle = '#704522'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(35, 5, 25, -1.15, 1.15); ctx.stroke();
      ctx.strokeStyle = '#e5d7ba'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(45,-18); ctx.lineTo(25,5); ctx.lineTo(45,28); ctx.stroke();
      if (e.attackState === 'windup') { ctx.strokeStyle='#b57a42'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(18,5); ctx.lineTo(62,5); ctx.stroke(); }
    } else if (e.weapon === 'spear') {
      ctx.strokeStyle = '#69452d'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(12, 8); ctx.lineTo(86, 8); ctx.stroke();
      ctx.fillStyle = '#d7e2e7'; ctx.strokeStyle = '#0a0d12'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(102, 8); ctx.lineTo(82, -2); ctx.lineTo(82, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      ctx.strokeStyle = '#69452d'; ctx.lineWidth = e.weapon === 'heavy' ? 10 : 8;
      ctx.beginPath(); ctx.moveTo(13, 8); ctx.lineTo(31, 8); ctx.stroke();
      ctx.fillStyle = '#d7e2e7'; ctx.strokeStyle = '#0a0d12'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(27, e.weapon === 'heavy' ? -2 : 2); ctx.lineTo(e.weapon === 'heavy' ? 82 : 74, 8); ctx.lineTo(27, e.weapon === 'heavy' ? 18 : 14); ctx.closePath(); ctx.fill(); ctx.stroke();
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

  player = makePlayer(); enemies = []; obstacles = []; pots = []; plants = []; vines = []; hazards = []; particles = []; arrows = []; doorOpen = false; roomCleared = false; currentRoomData = null;
  showTitle();
  requestAnimationFrame(frame);
})();
