import * as T from './three.module.js';
import { RunnerGame, ABILITIES } from './runner.js?v=chaos-2';
import { createKarina } from './character.js?v=flight-4';
import { SKINS, findSkin } from './skins.js?v=flight-4';
import { VoiceBank } from './voice-bank.js?v=chaos-1';
import { makeJetpack, OrbitMeme } from './flight.js?v=flight-4';
import { OmskWorld } from './omsk-world.js?v=omsk-2';
import { interactiveItem, GameplayEffects } from './interaction-visuals.js?v=chaos-1';

const $ = id => document.getElementById(id);
const root = $('game');
const canvas = $('c');
const sim = new RunnerGame();
const orbit = new OrbitMeme(root, $('orbit-overlay'));
let renderer;
try {
  renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (error) {
  $('load-error').hidden = false;
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
const scene = new T.Scene();
scene.background = new T.Color('#9ab3c3');
scene.fog = new T.Fog('#9ab3c3', 65, 210);
const camera = new T.PerspectiveCamera(56, 1, .1, 245);
scene.add(new T.HemisphereLight('#cbf4ef', '#776074', 2.6));
const sunlight = new T.DirectionalLight('#ffdfb4', 3.4);
sunlight.position.set(-12, 22, 8);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
Object.assign(sunlight.shadow.camera, { left: -15, right: 15, top: 16, bottom: -18, far: 70 });
sunlight.shadow.bias = -.001;
scene.add(sunlight);
const rim = new T.DirectionalLight('#99ddd6', 1.5);
rim.position.set(8, 6, -12);
scene.add(rim);

const matCache = new Map();
const boxGeo = new T.BoxGeometry(1, 1, 1);
const sphereGeo = new T.SphereGeometry(1, 20, 16);
function mat(color, glow = 0) {
  const key = `${color}:${glow}`;
  if (!matCache.has(key)) matCache.set(key, new T.MeshStandardMaterial({ color, roughness: .8, emissive: color, emissiveIntensity: glow }));
  return matCache.get(key);
}
function plaidMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = '#a59b8e'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 4) {
    g.fillStyle = i % 8 ? '#847f7333' : '#d1c5b544';
    g.fillRect(i, 0, 1, 256); g.fillRect(0, i, 256, 1);
  }
  for (let i = 0; i < 256; i += 64) {
    g.fillStyle = '#514b4399';
    g.fillRect(i, 0, 3, 256); g.fillRect(i + 7, 0, 1, 256);
    g.fillRect(0, i, 256, 3); g.fillRect(0, i + 7, 256, 1);
    g.fillStyle = '#aa655970';
    g.fillRect(i + 31, 0, 2, 256); g.fillRect(0, i + 31, 256, 2);
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(2, 2);
  return new T.MeshStandardMaterial({ map: texture, roughness: 1 });
}
function box(w, h, d, color, x = 0, y = 0, z = 0, parent = scene, glow = 0) {
  const object = new T.Mesh(boxGeo, mat(color, glow));
  object.scale.set(w, h, d);
  object.position.set(x, y, z);
  object.castShadow = object.receiveShadow = true;
  parent.add(object);
  return object;
}
function ball(r, color, x, y, z, parent = scene, scale = [1, 1, 1], glow = 0) {
  const object = new T.Mesh(sphereGeo, mat(color, glow));
  object.scale.set(r * scale[0], r * scale[1], r * scale[2]);
  object.position.set(x, y, z);
  object.castShadow = true;
  parent.add(object);
  return object;
}
const labelCache = new Map();
function labelMaterial(text, background = '#d95743', foreground = '#fff1d0') {
  const key = [text, background, foreground].join('|');
  if (labelCache.has(key)) return labelCache.get(key);
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = background; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = '#ffffff30'; g.lineWidth = 8; g.strokeRect(12, 12, 488, 232);
  g.fillStyle = foreground; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 ${text.length > 10 ? 42 : text.length > 7 ? 51 : 70}px sans-serif`;
  g.fillText(text, 256, 132, 475);
  const texture = new T.CanvasTexture(c); texture.colorSpace = T.SRGBColorSpace;
  const material = new T.MeshBasicMaterial({ map: texture });
  labelCache.set(key, material);
  return material;
}
const plane = new T.PlaneGeometry(1, 1);
function sign(text, w, h, x, y, z, parent = scene, bg, fg) {
  const object = new T.Mesh(plane, labelMaterial(text, bg, fg));
  object.scale.set(w, h, 1); object.position.set(x, y, z); parent.add(object);
  return object;
}

box(12, .25, 220, '#3d6269', 0, -.18, -80);
box(2.4, .40, 220, '#c4baaa', -6.5, -.1, -80);
box(2.4, .40, 220, '#c4baaa', 6.5, -.1, -80);
for (let lane = -1; lane <= 1; lane++) {
  box(2.35, .015, 220, '#35515a', lane * 3, -.043, -80);
  for (const side of [-1, 1]) box(.075, .045, 220, '#b7c9c5', lane * 3 + side * .85, .012, -80);
}
const sleeperCount = 150;
const sleepers = new T.InstancedMesh(boxGeo, mat('#223d48'), sleeperCount);
scene.add(sleepers);
const matrix = new T.Matrix4();
const dummy = new T.Object3D();
let trackPhase = 0;
function updateSleepers() {
  for (let i = 0; i < sleeperCount; i++) {
    dummy.position.set((i % 3 - 1) * 3, -.014, 16 - Math.floor(i / 3) * 2.6 + trackPhase);
    dummy.scale.set(2.05, .05, .18); dummy.updateMatrix();
    sleepers.setMatrixAt(i, dummy.matrix);
  }
  sleepers.instanceMatrix.needsUpdate = true;
}
updateSleepers();

const city = new OmskWorld(scene, () => syncSkinReadiness());
const gameplayEffects = new GameplayEffects(scene);
ball(7, '#ffe2b0', -45, 52, -190, scene, [1, 1, 1], .7);

// Each skin owns a texture and a rig; switching never changes the current run.
const rigs = new Map();
const skinLoadState = new Map();
let selectedSkin = SKINS[0];
try { selectedSkin = findSkin(localStorage.getItem('karina-skin')); } catch {}
let karina;
const textureLoader = new T.TextureLoader();
for (const skin of SKINS) {
  const state = { ready: false, error: false };
  skinLoadState.set(skin.id, state);
  const texture = textureLoader.load(skin.texture, () => {
    state.ready = true;
    syncSkinReadiness();
  }, undefined, () => {
    state.error = true;
    syncSkinReadiness();
  });
  texture.colorSpace = T.SRGBColorSpace;
  const materials = Object.fromEntries(Object.entries(skin.colors).map(([key, color]) => [key, mat(color)]));
  if (skin.outfit === 'blazer') materials.jacket = plaidMaterial();
  const rig = createKarina(texture, materials, skin);
  rig.group.visible = skin.id === selectedSkin.id;
  scene.add(rig.group);
  rigs.set(skin.id, rig);
}
karina = rigs.get(selectedSkin.id);

function syncSkinReadiness() {
  const state = skinLoadState.get(selectedSkin.id);
  const ready = !!state?.ready && !city.loading;
  $('start').disabled = !ready;
  $('preview-flight').disabled = !ready;
  for (const [id, rig] of rigs) rig.group.visible = id === selectedSkin.id && !!state?.ready;
  $('start-label').textContent = ready
    ? sim.mode === 'paused' ? 'ПРОДОЛЖИТЬ' : sim.mode === 'over' ? 'ЕЩЁ ПО ЗАКУСОЧКЕ' : 'ПОГНАЛИ'
    : state?.error ? 'СКИН НЕДОСТУПЕН' : city.loading ? 'ГОТОВЛЮ ОМСК…' : 'ЗАГРУЖАЮ СКИН…';
  $('skin-status').hidden = ready && !city.errors.length;
  $('skin-status').textContent = state?.error
    ? 'Персонаж не загрузился. Выбери другого или обнови страницу.'
    : city.loading ? `Город собирается: ${city.loaded} из ${city.total}.`
      : city.errors.length ? 'Часть города не загрузилась. Обнови страницу, чтобы увидеть всё.'
        : 'Секунду, персонаж переодевается…';
  document.querySelectorAll('button[data-skin]').forEach(button => {
    button.setAttribute('aria-busy', String(!skinLoadState.get(button.dataset.skin)?.ready));
  });
}
function selectSkin(id, persist = true) {
  if (sim.mode !== 'ready' && sim.mode !== 'over') return;
  const previous = karina;
  selectedSkin = findSkin(id);
  karina = rigs.get(selectedSkin.id);
  if (previous !== karina) {
    resetEffects();
    karina.group.position.copy(previous.group.position);
    karina.group.rotation.copy(previous.group.rotation);
  }
  for (const [rigId, rig] of rigs) rig.group.visible = rigId === selectedSkin.id;
  root.dataset.skin = selectedSkin.id;
  document.querySelectorAll('button[data-skin]').forEach(button => {
    const selected = button.dataset.skin === selectedSkin.id;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  $('reaction').querySelector('.speaker').textContent = selectedSkin.speaker;
  $('mog').hidden = selectedSkin.special !== '67';
  const ability = ABILITIES[selectedSkin.id];
  $('ability-intro').textContent = `Q · ${ability.name.toLowerCase()} — ${ability.description.toLowerCase()}`;
  if (sim.mode === 'ready') {
    const headline = selectedSkin.headline || ['ДЕДЛАЙН', 'ПОДОЖДЁТ.'];
    $('title').innerHTML = `${selectedSkin.name.toUpperCase()}<span>${headline.join('<br>')}</span>`;
    $('eyebrow').textContent = selectedSkin.eyebrow || (selectedSkin.id === 'karina-2' ? 'ВТОРАЯ КАРИНА. ТОТ ЖЕ ДЕДЛАЙН.' : 'ЛАТЯО ЕСТЬ. ПЛАНА НЕТ.');
    $('description').textContent = selectedSkin.description;
  }
  if (persist) {
    try { localStorage.setItem('karina-skin', selectedSkin.id); } catch {}
  }
  syncSkinReadiness();
}

// Deadline is a literal angry alarm clock, complete with flailing paper arms.
const deadline = new T.Group(); scene.add(deadline);
ball(.65, '#d75c50', 0, 1.3, 0, deadline, [1, 1.05, .37]);
const clockFace = new T.Mesh(new T.CircleGeometry(.55, 40), new T.MeshBasicMaterial({ color: '#fff0d1' }));
clockFace.position.set(0, 1.3, .26); deadline.add(clockFace);
const clockHand = box(.035, .38, .035, '#45343b', 0, 1.48, .29, deadline);
box(.31, .035, .035, '#45343b', .13, 1.3, .30, deadline);
sign('23:59', .6, .22, 0, 1.05, .30, deadline, '#fff0d1', '#bd453e');
for (const side of [-1, 1]) {
  const bell = ball(.25, '#eebd66', side * .49, 1.91, 0, deadline, [1.3, .7, 1]);
  bell.rotation.z = side * -.45;
  box(.10, .6, .10, '#624e50', side * .38, .48, 0, deadline);
  box(.28, .10, .4, '#442f3e', side * .38, .16, .06, deadline);
  const arm = box(.12, .60, .12, '#e5b47e', side * .76, 1.22, 0, deadline);
  arm.rotation.z = side * -.8;
  box(.18, .04, .025, '#3e3337', side * .18, 1.55, .31, deadline).rotation.z = side * .35;
}

const itemMeshes = new Map();
function createItem(item) {
  const interactive = interactiveItem(item, { box, ball, sign, mat });
  const g = interactive || new T.Group();
  if (interactive) {
    // New interactive props share the same movement and lifetime as simulation items.
  } else if (item.type === 'jetpack') {
    const pack = makeJetpack(); pack.group.position.y = 1.4; pack.update(0, false); g.add(pack.group);
    const glow = new T.Mesh(new T.TorusGeometry(.64, .045, 8, 32), new T.MeshBasicMaterial({ color: '#dcff65' }));
    glow.position.y = 1.4; g.add(glow);
  } else if (item.type === 'coin') {
    box(.43, .72, .14, '#f7543d', 0, 1.23, 0, g);
    sign('辣条', .40, .45, 0, 1.24, .076, g, '#ed4937');
    box(.44, .055, .16, '#ffd67c', 0, 1.60, 0, g);
    box(.44, .04, .16, '#ffd67c', 0, .86, 0, g);
  } else if (item.type === 'box') {
    box(1.75, 1.28, 1.25, '#c8905e', 0, .64, 0, g);
    box(.16, 1.3, 1.27, '#f4d392', 0, .65, 0, g);
    sign(item.id % 2 ? 'СОЗВОН' : 'ДЕЛА', 1.5, .6, 0, .7, .634, g, '#ba8050');
  } else if (item.type === 'train') {
    box(2.26, 3.45, 8.2, '#327f88', 0, 1.85, 0, g);
    box(2.35, .27, 8.3, '#d4c6b0', 0, 3.59, 0, g);
    box(1.87, 1.13, .06, '#233c4d', 0, 2.7, 4.14, g);
    box(.05, 1.13, .08, '#8caeb2', 0, 2.7, 4.17, g);
    sign('ПРАВКИ', 1.7, .42, 0, 1.76, 4.15, g, '#e2c995', '#314c58');
    box(2.3, .16, 8.28, '#e8b178', 0, 1.23, 0, g);
    for (const side of [-1, 1]) {
      ball(.13, '#ffedbb', side * .76, .75, 4.18, g, [1, 1, .4], .7);
      for (let j = 0; j < 4; j++) box(.025, 1, 1.1, '#accbc5', side * 1.14, 2.65, -2.8 + j * 1.65, g);
    }
    box(1.55, .27, .3, '#273c48', 0, .38, 4.19, g);
  } else {
    for (const side of [-1, 1]) {
      box(.14, 3, .19, '#bbcfcc', side * 1.15, 1.5, 0, g);
      box(.37, .12, .5, '#284651', side * 1.15, .06, 0, g);
    }
    box(2.45, .86, .35, '#d85d4d', 0, 2.47, 0, g);
    sign(item.id % 2 ? 'НА 5 МИНУТ' : 'СРОЧНО', 2.3, .7, 0, 2.47, .18, g, '#c95246');
  }
  scene.add(g); itemMeshes.set(item.id, g);
  return g;
}
function syncItems(time) {
  const alive = new Set();
  for (const item of sim.items) {
    alive.add(item.id);
    const mesh = itemMeshes.get(item.id) || createItem(item);
    mesh.position.set(item.x ?? (item.lane - 1) * 3, item.type === 'coin' ? (item.altitude || 0) + Math.sin(time * 3 + item.id) * .12 : item.type === 'jetpack' || mesh.userData.float ? Math.sin(time * 3) * .2 : 0, item.z);
    if (item.type === 'jetpack') mesh.rotation.y = Math.sin(time * 2) * .4;
    if (item.type === 'coin') { mesh.rotation.y = Math.sin(time * 2 + item.id) * .4; mesh.rotation.z = Math.sin(time * 4 + item.id) * .10; }
  }
  for (const [id, mesh] of itemMeshes) {
    if (!alive.has(id)) { scene.remove(mesh); itemMeshes.delete(id); }
  }
}

// Tiny reusable 3D paper scraps; capped so long runs do not accumulate objects.
const particles = [];
function burst(x, y, z, color, count = 12, force = 1) {
  for (let i = 0; i < count; i++) {
    if (particles.length >= 110) { const old = particles.shift(); scene.remove(old.mesh); }
    const m = new T.Mesh(boxGeo, mat(color, .08));
    const size = .045 + Math.random() * .09;
    m.scale.set(size, size * 1.6, size * .55); m.position.set(x, y, z); scene.add(m);
    particles.push({ mesh: m, life: .6 + Math.random() * .5, max: 1, v: new T.Vector3((Math.random() - .5) * 5 * force, (2 + Math.random() * 4) * force, (Math.random() - .5) * 4 * force) });
  }
}
function animateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.life -= dt;
    p.v.y -= dt * 9;
    p.mesh.position.addScaledVector(p.v, dt);
    p.mesh.rotation.x += dt * 6; p.mesh.rotation.z += dt * 5;
    p.mesh.scale.multiplyScalar(1 - dt * .8);
    if (p.life <= 0 || p.mesh.position.y < -.2) { scene.remove(p.mesh); particles.splice(i, 1); }
  }
}

let best = 0, bestScore = 0, soundOn = true;
try { best = +localStorage.getItem('karina-best') || 0; bestScore = +localStorage.getItem('karina-best-score') || 0; soundOn = localStorage.getItem('karina-sound') !== 'off'; } catch {}
$('best').textContent = best;
let audio;
const voices = new VoiceBank(() => audio, () => soundOn);
function initAudio() {
  if (!soundOn) return;
  try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); voices.warm(selectedSkin.id); } catch {}
}
function tone(frequency, duration = .09, type = 'sine', volume = .04, at = 0, end = frequency) {
  if (!soundOn || !audio || audio.state !== 'running') return;
  const osc = audio.createOscillator(), gain = audio.createGain();
  const when = audio.currentTime + at;
  osc.type = type; osc.frequency.setValueAtTime(frequency, when); osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), when + duration);
  gain.gain.setValueAtTime(volume, when); gain.gain.exponentialRampToValueAtTime(.001, when + duration);
  osc.connect(gain); gain.connect(audio.destination); osc.start(when); osc.stop(when + duration);
}
function sound(name) {
  if (name === 'coin') { tone(740, .07, 'triangle', .045); tone(990, .11, 'sine', .025, .045); }
  if (name === 'jump') tone(180, .15, 'sine', .06, 0, 520);
  if (name === 'slide') tone(260, .15, 'triangle', .035, 0, 80);
  if (name === 'hit') { tone(110, .3, 'sawtooth', .045, 0, 35); tone(80, .2, 'sine', .09); }
  if (name === 'power') [260, 330, 390, 520, 780].forEach((f, i) => tone(f, .15, 'triangle', .05, i * .065));
  if (name === 'dodge') { tone(180, .08, 'sine', .04, 0, 420); tone(620, .12, 'triangle', .025, .08); }
  if (name === 'talk') for (let i = 0; i < 5; i++) tone(180 + i % 2 * 75, .045, 'triangle', .015, i * .09, 140);
}
function updateSoundButton() { $('sound').classList.toggle('muted', !soundOn); $('sound').setAttribute('aria-label', soundOn ? 'Выключить звук' : 'Включить звук'); }
function toggleSound() { soundOn = !soundOn; if (!soundOn) stopVoice(); try { localStorage.setItem('karina-sound', soundOn ? 'on' : 'off'); } catch {} initAudio(); updateSoundButton(); }
updateSoundButton();

function pick(key) { return voices.pick(selectedSkin.id, key); }
let mood = 'smug', moodUntil = 0, speakingUntil = 0, bubbleUntil = 0, reactionUntil = 0, reactionPriority = 0;
let clock = 0, slowUntil = 0, shakeUntil = 0, lastCoinLine = -10, lastActionLine = -10, playedSeconds = 0;
let currentComicTimer = 0, milestoneTimer = 0, flameTimer = 0;
let gestureUntil = 0, mogCooldownUntil = 0;
let routeUntil = 0, buffKey = '', missionFocus = 0;
function react(line, emotion, duration = 2.3, priority = 1) {
  if (clock < bubbleUntil && priority < reactionPriority) return;
  const clip = voices.clip(selectedSkin.id, line);
  duration = Math.max(duration, Math.min(4.5, (clip?.duration || 0) + .3));
  reactionPriority = priority;
  mood = emotion; moodUntil = clock + duration;
  speakingUntil = clock + (clip?.duration || Math.min(1.5, duration * .65));
  reactionUntil = clock + duration;
  bubbleUntil = clock + duration;
  $('reaction-text').textContent = line;
  $('reaction').hidden = false;
  $('reaction').style.animation = 'none';
  void $('reaction').offsetWidth;
  $('reaction').style.animation = '';
  if (clip) voices.speak(selectedSkin.id, line); else sound('talk');
}
function comic(text, color = '#dcff65') {
  $('comic').textContent = text; $('comic').style.color = color;
  $('comic').classList.remove('show'); void $('comic').offsetWidth; $('comic').classList.add('show');
  currentComicTimer = clock + 1;
}
function milestone(small, big) {
  $('milestone-small').textContent = small; $('milestone-big').textContent = big;
  $('milestone').classList.remove('show'); void $('milestone').offsetWidth; $('milestone').classList.add('show');
  milestoneTimer = clock + 2.6;
}
function flash(name) { $('impact').className = `impact ${name}`; void $('impact').offsetWidth; }
function stopVoice() { voices.stop(); }
function mariaShout({ force = false, checkpoint = 0 } = {}) {
  if (selectedSkin.special !== '67' || sim.mode === 'paused') return;
  if (!force && clock < mogCooldownUntil) return;
  gestureUntil = clock + 2.3;
  mogCooldownUntil = clock + 6.7;
  react(checkpoint ? 'СИКС! СЕВЕН!' : 'Я ТЕБЯ МОГНУ!', checkpoint ? 'happy' : 'angry', 2.5, 5);
  comic(checkpoint ? '6 7' : 'МОГНУЛА.', '#ffd798');
  if (checkpoint) milestone(`${checkpoint} МЕТРОВ · МАРИЯ ОДОБРЯЕТ`, '6… 7!');
  burst(karina.group.position.x, 3.5 + karina.group.position.y, .5, '#ffd798', 18, 1.2);
}
function resetEffects() {
  orbit.finish();
  stopVoice();
  gestureUntil = mogCooldownUntil = 0;
  $('reaction').hidden = true; $('comic').classList.remove('show'); $('milestone').classList.remove('show');
  $('impact').className = 'impact';
  bubbleUntil = speakingUntil = reactionUntil = moodUntil = slowUntil = shakeUntil = 0;
  lastCoinLine = lastActionLine = clock - 10;
  routeUntil = 0; missionFocus = 0; $('route-callout').hidden = true;
  for (const p of particles) scene.remove(p.mesh);
  particles.length = 0;
}
function start() {
  if (city.loading || !skinLoadState.get(selectedSkin.id)?.ready) return;
  initAudio(); resetEffects(); sim.start(selectedSkin.id);
  playedSeconds = 0;
  root.dataset.mode = 'play'; $('menu').hidden = true;
  updateUI();
  $('pause').setAttribute('aria-label', 'Пауза');
  $('controls-hint').style.opacity = '1';
  canvas.focus({ preventScroll: true });
}
function showMenu(mode, defeatLine = null) {
  const paused = mode === 'paused';
  root.dataset.mode = mode;
  const menu = $('menu'); menu.className = `menu ${paused ? 'paused' : 'over'}`; menu.hidden = false;
  $('eyebrow').textContent = paused ? 'ДЕДЛАЙН ТОЖЕ НА ПАУЗЕ' : 'ЭТО БЫЛА РАЗМИНКА';
  $('title').innerHTML = paused ? 'ПЕРЕКУР.<span>В СМЫСЛЕ,<br>ПЕРЕКУС.</span>' : 'НУ ВСЁ.<span>ПОРА ДЕЛАТЬ<br>ВИД, ЧТО РАБОТАЕШЬ.</span>';
  $('description').textContent = paused ? 'Можно выдохнуть. И ещё раз хрумкнуть.' : defeatLine || pick('hit');
  $('start-label').textContent = paused ? 'ПРОДОЛЖИТЬ' : 'ЕЩЁ ПО ЗАКУСОЧКЕ';
  $('results').hidden = paused;
  $('result-distance').textContent = Math.floor(sim.distance);
  $('result-coins').textContent = sim.coins;
  $('result-score').textContent = sim.score;
  $('result-missions').textContent = `ЗАДАНИЯ ${sim.missionsDone}/3 · ЛУЧШИЕ ОЧКИ ${Math.max(bestScore, sim.score)}`;
  $('menu-hint').hidden = !paused;
  if (!paused) {
    best = Math.max(best, Math.floor(sim.distance));
    bestScore = Math.max(bestScore, sim.score);
    $('best').textContent = best;
    try { localStorage.setItem('karina-best', best); localStorage.setItem('karina-best-score', bestScore); } catch {}
  }
}
function pause() {
  if (sim.mode === 'play') { stopVoice(); sim.pause(); showMenu('paused'); $('reaction').hidden = true; }
  else if (sim.mode === 'paused') {
    initAudio(); sim.resume(); root.dataset.mode = 'play'; $('menu').hidden = true; canvas.focus({ preventScroll: true });
  }
}
function handleEvents(events) {
  for (const event of events) {
    switch (event.type) {
      case 'start':
        react(pick('start'), 'smug', 2.1, 2); break;
      case 'jetpack':
        sound('power');
        beginOrbit();
        break;
      case 'jetpack-end':
        react(pick('land'), 'panic', 2.5, 3);
        burst(sim.x, .2, 0, '#d5c9b3', 15, .8);
        break;
      case 'coin':
        sound('coin');
        burst(sim.x, 1.6 + sim.y, .1, event.magnet ? '#d8a4ff' : '#edff7a', 6, .5);
        $('snacks').classList.remove('pop'); void $('snacks').offsetWidth; $('snacks').classList.add('pop');
        if (event.combo % 5 === 0) {
          comic(`ХРУМ ×${event.combo}`);
          react(pick('combo'), 'happy', 1.9, 2);
        } else if (clock - lastCoinLine > 5) {
          lastCoinLine = clock; react(pick('coin'), 'happy', 1.7, 1);
        }
        break;
      case 'jump':
        sound('jump'); burst(sim.x, .2, .3, '#d5c9b3', 7, .4);
        if (clock - lastActionLine > 4) { lastActionLine = clock; react(pick('jump'), 'panic', 1.5, 1); }
        break;
      case 'slide':
        sound('slide');
        if (clock - lastActionLine > 4) { lastActionLine = clock; react(pick('slide'), 'smug', 1.7, 1); }
        break;
      case 'dodge':
        sound('dodge');
        if (event.kind === 'near') { slowUntil = clock + .25; comic(`ПРОНЕСЛО! +${event.points}`); react(pick('dodge'), 'panic', 1.8, 2); }
        else { comic(`${event.kind === 'jump' ? 'ПЕРЕПРЫГНУЛА' : 'УСКОЛЬЗНУЛА'} ×${event.multiplier}`); react(pick(event.kind), 'smug', 1.8, 2); }
        break;
      case 'ability':
        sound('power'); flash('collect');
        gameplayEffects.wave(sim.x, event.character === 'maria' ? '#ffe2a0' : event.character === 'karina-2' ? '#c1b8ff' : '#ff976d');
        if (event.character === 'maria') gestureUntil = clock + 2.3;
        comic(ABILITIES[event.character].name, event.character === 'karina-2' ? '#c7baff' : '#ffd785');
        react(pick('ability'), event.character === 'karina-2' ? 'smug' : 'angry', 2.5, 6);
        break;
      case 'boost':
        sound('dodge'); flash('collect');
        comic(event.kind === 'magnet' ? 'ЛАТЯО, КО МНЕ!' : event.kind === 'shield' ? '+1 ОТМАЗКА' : 'МИР, ПОМЕДЛЕННЕЕ', '#b5dfff');
        react(pick(event.kind), 'happy', 2, 3);
        break;
      case 'shield-break':
        sound('hit'); shakeUntil = clock + .18;
        gameplayEffects.wave(sim.x, '#9cecf4'); burst(sim.x, 1.5, 0, '#a3e8ef', 30, 1.4);
        comic('ЩИТ СПАС!'); react(pick('dodge'), 'panic', 2, 4);
        break;
      case 'spring':
        sound('jump'); tone(280, .3, 'triangle', .05, 0, 1100);
        comic('ПРОБЛЕМЫ ВНИЗУ!'); react(pick('spring'), 'happy', 2.3, 4);
        burst(sim.x, .3, 0, '#dfff81', 25, 1.3);
        break;
      case 'slip':
        sound('slide'); shakeUntil = clock + .25;
        burst(sim.x, .15, 0, '#9dd9ed', 25, 1.2);
        comic('ОЙ. СКОЛЬЗКО.', '#b5e4f1'); react(pick('slip'), 'panic', 2, 4);
        break;
      case 'choice':
        sound('power');
        comic(event.reward === 'shield' ? 'ВЫБРАЛА ОТМАЗКУ' : 'ВЫБРАЛА ХАОС ×2', event.reward === 'shield' ? '#b5e4f1' : '#ffbb7b');
        react(pick('choice'), 'smug', 2.5, 3);
        break;
      case 'route':
        $('route-callout').textContent = event.text;
        $('route-callout').hidden = false; routeUntil = clock + 3.4;
        break;
      case 'mission':
        sound('power'); milestone(`ЗАДАНИЕ ${event.completed}/3 · +${event.reward} ОЧКОВ`, event.title.toUpperCase());
        react(pick('mission'), 'happy', 2.3, 4);
        burst(sim.x, 3 + sim.y, 0, '#dfff85', 28, 1.3);
        break;
      case 'all-missions':
        milestone('ТРИ ЗАДАНИЯ · +750 ОЧКОВ И ЩИТ', 'ОФИЦИАЛЬНО БЕЗДЕЛЬНИЦА');
        break;
      case 'power':
        sound('power'); flash('collect');
        milestone('10 ЛАТЯО. НОЛЬ СТРАХА.', 'РЕЖИМ «ПОФИГ»');
        react(pick('power'), 'spicy', 3, 4);
        if (selectedSkin.special === '67') mariaShout({ force: true });
        burst(sim.x, 1.4, 0, '#ff8b4d', 30, 1.6);
        break;
      case 'power-end':
        react(pick('powerEnd'), 'panic', 2.4, 3); break;
      case 'smash':
        sound('hit'); shakeUntil = clock + .18;
        burst(event.item.x ?? (event.item.lane - 1) * 3, 1.5, Math.max(-20, event.item.z), '#ffc76e', 25, 1.6);
        if (!event.wave) { comic('БА-БАХ! +40', '#ffad68'); react(pick('smash'), 'angry', 1.8, 3); }
        break;
      case 'milestone':
        milestone(`${event.distance} МЕТРОВ БЕЗ ЕДИНОЙ ЗАДАЧИ`, 'ДЕДЛАЙН ПЕРЕНЕСЁН');
        react(pick('milestone'), 'happy', 2.4, 2);
        burst(sim.x, 3.8, -2, '#dcff65', 30, 1.6); break;
      case 'hit':
        sound('hit'); flash('hit'); shakeUntil = clock + .5;
        burst(sim.x, 2.8, .2, '#fff0ca', 18, 1.3);
        const defeatLine = pick('hit'); voices.speak(selectedSkin.id, defeatLine);
        mood = 'dead'; moodUntil = clock + 100;
        bubbleUntil = clock; $('reaction').hidden = true;
        comic('ОЙ.', '#ff8b70');
        showMenu('over', defeatLine); break;
    }
  }
}

function beginOrbit() {
  initAudio();
  orbit.begin(karina.group, selectedSkin.name);
  react(pick('orbit'), 'panic', 4.2, 8);
}
function activateAbility() {
  if (orbit.active || sim.mode !== 'play') return;
  initAudio(); sim.action('ability'); canvas.focus({ preventScroll: true });
}
function updateUI() {
  const maria = selectedSkin.special === '67';
  $('mog').hidden = !maria;
  $('mog').disabled = sim.mode === 'paused' || clock < mogCooldownUntil;
  $('mog').textContent = clock < mogCooldownUntil ? String(Math.ceil(mogCooldownUntil - clock)) : '67';
  $('flight-hud').hidden = sim.jetpack <= 0;
  $('flight-fill').style.width = `${sim.jetpack * 10}%`;
  $('flight-seconds').textContent = Math.ceil(sim.jetpack);
  $('distance').textContent = Math.floor(sim.distance);
  $('coins').textContent = sim.coins;
  $('score').textContent = sim.score;
  $('style-badge').hidden = sim.style <= 0;
  $('style-badge').textContent = `СЕРИЯ ×${sim.multiplier}`;
  $('style-badge').style.opacity = String(.45 + Math.min(1, sim.styleTimer / 2) * .55);
  const ability = ABILITIES[selectedSkin.id];
  $('ability').disabled = sim.mode !== 'play' || sim.abilityCooldown > 0;
  $('ability').style.setProperty('--charge', `${(1 - sim.abilityCooldown / ability.cooldown) * 100}%`);
  $('ability-icon').textContent = sim.abilityCooldown > 0 ? Math.ceil(sim.abilityCooldown) : ability.icon;
  $('ability-name').textContent = ability.name;
  $('ability').setAttribute('aria-label', `${ability.name} — Q${sim.abilityCooldown > 0 ? `, готово через ${Math.ceil(sim.abilityCooldown)} с` : ', готово'}`);
  const remainingMissions = sim.missions.filter(m => !m.done);
  missionFocus = Math.min(missionFocus, Math.max(0, remainingMissions.length - 1));
  const mission = remainingMissions[missionFocus];
  $('mission-count').textContent = `${sim.missionsDone}/3`;
  $('mission-title').textContent = mission ? mission.title : 'Все задания закрыты!';
  $('mission-progress').textContent = mission ? `${Math.floor(mission.progress)}/${mission.target}` : '+750 И ЩИТ';
  $('mission-fill').style.width = `${mission ? mission.progress / mission.target * 100 : 100}%`;
  $('mission-hud').classList.toggle('done', !mission && sim.missions.length > 0);
  const buffs = [sim.shield && '◇ Щит', sim.magnet > 0 && `🧲 ${Math.ceil(sim.magnet)} с`, sim.slow > 0 && `◷ ${Math.ceil(sim.slow)} с`, sim.spicy > 0 && `🌶 ×2 · ${Math.ceil(sim.spicy)} с`, sim.dash > 0 && `⚡ ${Math.ceil(sim.dash)} с`].filter(Boolean).join(' · ');
  if (buffKey !== buffs) { buffKey = buffs; $('buff-hud').textContent = buffs; }
  $('buff-hud').hidden = !buffs;
  root.classList.toggle('slow-motion', sim.slow > 0 && sim.mode === 'play');
  $('heat').classList.toggle('hot', sim.power > 0);
  $('heat-fill').style.width = `${sim.power > 0 ? sim.power / 8 * 100 : sim.heat * 10}%`;
  $('heat-label').textContent = sim.power > 0 ? `РЕЖИМ «ПОФИГ» · ${Math.ceil(sim.power)} СЕК` : `ЕЩЁ ${10 - sim.heat} ЛАТЯО ДО РЕЖИМА «ПОФИГ»`;
  $('speed-lines').classList.toggle('on', (sim.invincible || sim.spicy > 0) && sim.mode === 'play');
  if (clock >= bubbleUntil) $('reaction').hidden = true;
  if (clock > currentComicTimer) $('comic').classList.remove('show');
  if (clock > milestoneTimer) $('milestone').classList.remove('show');
  if (clock > routeUntil) $('route-callout').hidden = true;
  $('controls-hint').style.opacity = playedSeconds > 9 ? '0' : '1';
}

document.querySelectorAll('button[data-skin]').forEach(button => {
  button.onclick = () => { selectSkin(button.dataset.skin); initAudio(); tone(480, .07, 'triangle', .025, 0, 680); };
});
selectSkin(selectedSkin.id, false);
$('start').onclick = () => sim.mode === 'paused' ? pause() : start();
$('pause').onclick = pause;
$('sound').onclick = toggleSound;
$('ability').onclick = activateAbility;
$('mission-hud').onclick = () => {
  const remaining = sim.missions.filter(m => !m.done).length;
  if (remaining > 1) missionFocus = (missionFocus + 1) % remaining;
  canvas.focus({ preventScroll: true });
};
$('mog').onclick = () => { initAudio(); mariaShout(); };
$('preview-flight').onclick = beginOrbit;
$('orbit-close').onclick = () => orbit.finish();
const keys = { ArrowLeft: 'left', a: 'left', A: 'left', 'ф': 'left', ArrowRight: 'right', d: 'right', D: 'right', 'в': 'right', ArrowUp: 'jump', ' ': 'jump', w: 'jump', W: 'jump', 'ц': 'jump', ArrowDown: 'slide', s: 'slide', S: 'slide', 'ы': 'slide' };
addEventListener('keydown', e => {
  if (e.target instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter')) return;
  if (orbit.active) {
    if (e.key === 'Escape') orbit.finish();
    return;
  }
  if (keys[e.key]) { e.preventDefault(); if (!e.repeat || ['left', 'right'].includes(keys[e.key])) sim.action(keys[e.key]); }
  if (['p', 'P', 'з', 'Escape'].includes(e.key) && !e.repeat) pause();
  if (['m', 'M', 'ь'].includes(e.key) && !e.repeat) toggleSound();
  if (['e', 'E', 'у'].includes(e.key) && !e.repeat) { initAudio(); mariaShout(); }
  if (['q', 'Q', 'й', 'Й'].includes(e.key) && !e.repeat) activateAbility();
  if (e.key === 'Enter' && (sim.mode === 'ready' || sim.mode === 'over')) start();
});
document.querySelectorAll('[data-action]').forEach(button => {
  button.addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); sim.action(button.dataset.action); });
});
let pointerStart;
canvas.addEventListener('pointerdown', e => { pointerStart = { x: e.clientX, y: e.clientY, id: e.pointerId }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointerup', e => {
  if (!pointerStart || pointerStart.id !== e.pointerId) return;
  const dx = e.clientX - pointerStart.x, dy = e.clientY - pointerStart.y;
  pointerStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 23) sim.action(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'slide' : 'jump');
});
canvas.addEventListener('pointercancel', () => pointerStart = null);
document.addEventListener('visibilitychange', () => { if (document.hidden && sim.mode === 'play') pause(); });

let W = 0, H = 0;
function resize() {
  const rect = root.getBoundingClientRect();
  W = rect.width; H = rect.height;
  camera.aspect = W / Math.max(1, H); camera.updateProjectionMatrix();
  renderer.setSize(W, H, false);
}
addEventListener('resize', resize); resize();
const cameraTarget = new T.Vector3(), lookTarget = new T.Vector3(), worldHead = new T.Vector3(), projected = new T.Vector3();
let last = 0, time = 0, frameId = 0;
function animate(now) {
  const dt = Math.min((now - last) / 1000 || 0, .04); last = now;
  const paused = sim.mode === 'paused';
  if (!paused) { time += dt; clock += dt; }
  const wasPlaying = sim.mode === 'play';
  if (wasPlaying && !orbit.active) {
    playedSeconds += dt;
    const delta = dt * (clock < slowUntil ? .38 : 1);
    const previousDistance = sim.distance;
    handleEvents(sim.step(delta));
    if (sim.mode === 'play' && selectedSkin.special === '67' && Math.floor(sim.distance / 67) > Math.floor(previousDistance / 67)) {
      mariaShout({ force: true, checkpoint: Math.floor(sim.distance / 67) * 67 });
    }
    const movement = sim.distance - previousDistance;
    trackPhase = (trackPhase + movement) % 2.6;
    updateSleepers();
    flameTimer -= dt;
    if (sim.invincible && flameTimer <= 0) {
      flameTimer = .07;
      burst(sim.x + (Math.random() - .5) * .6, .4 + Math.random() * .7, .6, Math.random() < .5 ? '#ff8951' : '#f5e56b', 3, .45);
    }
  }
  const menu = sim.mode === 'ready' || sim.mode === 'over';
  if (menu) {
    karina.group.position.x += (1.4 - karina.group.position.x) * Math.min(1, dt * 5);
    karina.group.position.y = Math.sin(Math.floor(time * 9) / 9 * 2) * .02;
  } else {
    karina.group.position.x = sim.x;
    karina.group.position.y += (sim.y - karina.group.position.y) * Math.min(1, dt * 10);
  }
  const reaction = clock < reactionUntil;
  let expression = clock < moodUntil ? mood : sim.power > 0 ? 'spicy' : 'neutral';
  if (sim.mode === 'ready' && clock >= moodUntil) expression = Math.floor(time / 4) % 2 ? 'smug' : 'happy';
  karina.update(time, paused ? 0 : dt, {
    playing: wasPlaying && !paused && !orbit.active, mood: expression, speaking: clock < speakingUntil,
    reaction, flying: sim.jetpack > 0 || orbit.active, orbit: orbit.active, meme: selectedSkin.special === '67' && clock < gestureUntil, jump: sim.jump || sim.bounce, slide: sim.slide > 0 && !menu, power: sim.invincible && !menu, lean: menu ? 0 : sim.lean, menu: menu || orbit.active
  });
  deadline.visible = sim.mode !== 'ready';
  deadline.position.set(sim.x * .7 + Math.sin(time * 3) * .15, Math.abs(Math.sin(time * 7)) * .12, menu ? 2.6 : 5.2);
  deadline.rotation.z = Math.sin(Math.floor(time * 9) / 9 * 8) * .08;
  clockHand.rotation.z = -time * 2;
  if (menu) {
    if (W < 650) { cameraTarget.set(3.0, 3.2, 8.2); lookTarget.set(.7, .5, 0); }
    else { cameraTarget.set(3.7, 3.25, 7.1); lookTarget.set(-.9, 1.9, 0); }
  } else {
    const narrow = W / H < .85;
    cameraTarget.set(sim.x * (narrow ? .82 : .30), (sim.jetpack > 0 ? 8.5 : (narrow ? 5.1 : 4.8) + sim.y * .4) + (sim.invincible ? .2 : 0), narrow ? 10.6 : 9.2);
    lookTarget.set(sim.x * (narrow ? .65 : .15), sim.jetpack > 0 ? 4.5 : 1.25 + sim.y * .25, -11);
  }
  camera.position.lerp(cameraTarget, Math.min(1, dt * (!menu && W / H < .85 ? 8 : 4)));
  if (clock < shakeUntil) { camera.position.x += (Math.random() - .5) * .18; camera.position.y += (Math.random() - .5) * .12; }
  const narrowView = W / H < .85 && !menu;
  const targetFov = (sim.invincible || sim.spicy > 0) && !menu ? narrowView ? 68 : 65 : sim.slow > 0 && !menu ? narrowView ? 57 : 51 : narrowView ? 61 : 56;
  camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 4);
  camera.updateProjectionMatrix(); camera.lookAt(lookTarget);
  syncItems(time);
  city.update(sim.distance, time, paused || orbit.active ? 0 : dt);
  gameplayEffects.update(sim, time, paused || orbit.active ? 0 : dt, orbit.active);
  if (!paused) animateParticles(dt);
  updateUI();
  scene.updateMatrixWorld();
  if (!$('reaction').hidden) {
    karina.head.getWorldPosition(worldHead); worldHead.y += .85;
    projected.copy(worldHead).project(camera);
    const x = (projected.x * .5 + .5) * W;
    const y = (-projected.y * .5 + .5) * H;
    $('reaction').style.left = `${Math.min(W - (W < 650 ? 120 : 155), Math.max(W < 650 ? 120 : 155, x + (W < 650 ? 0 : 80)))}px`;
    $('reaction').style.top = `${Math.min(H - 120, Math.max(195, y))}px`;
  }
  if (orbit.active) orbit.render(renderer, time, paused ? 0 : dt, W, H);
  else renderer.render(scene, camera);
  frameId = requestAnimationFrame(animate);
}
camera.position.set(W < 650 ? 3 : 3.7, 3.25, W < 650 ? 8.2 : 7.1);
karina.group.position.x = 1.4;
requestAnimationFrame(animate);
// Preserve a frozen view if WebGL is interrupted instead of continuing invisibly.
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); cancelAnimationFrame(frameId); if (sim.mode === 'play') sim.pause(); $('load-error').hidden = false; });
