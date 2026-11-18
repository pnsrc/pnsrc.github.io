// Pure simulation: rendering, audio, and wall-clock time never change the rules.
export const ABILITIES = {
  karina: { name: 'ОСТРЫЙ РЫВОК', icon: '🌶', description: '3 секунды скорости и защиты', cooldown: 18 },
  'karina-2': { name: 'ИНКОГНИТО', icon: '◷', description: 'Замедляет трассу на 6 секунд', cooldown: 20 },
  maria: { name: 'Я ТЕБЯ МОГНУ', icon: '67', description: 'Убирает препятствия вокруг', cooldown: 16 },
};
export const OBSTACLES = new Set(['box', 'bar', 'train', 'cart', 'puddle']);
const MISSIONS = [
  { key: 'coins', title: 'Собери 15 латяо', target: 15 },
  { key: 'dodge', title: 'Обойди 3 препятствия', target: 3 },
  { key: 'ability', title: 'Используй суперсилу', target: 1 },
  { key: 'distance', title: 'Пробеги 400 метров', target: 400 },
  { key: 'boost', title: 'Подбери 2 бонуса', target: 2 },
  { key: 'jump', title: 'Перепрыгни 2 препятствия', target: 2 },
  { key: 'choice', title: 'Выбери награду в воротах', target: 1 },
];

export class RunnerGame {
  constructor(random = Math.random) {
    this.random = random;
    this.mode = 'ready';
    this.serial = 0;
    this.character = 'karina';
    this.reset();
  }
  reset() {
    this.distance = this.coins = this.heat = this.power = this.jetpack = this.landing = 0;
    this.x = this.y = this.lean = this.jump = this.slide = this.bounce = 0;
    this.magnet = this.slow = this.spicy = this.dash = this.slip = this.shield = this.abilityCooldown = 0;
    this.style = this.styleTimer = this.bonusScore = this.missionsDone = 0;
    this.lane = 1;
    this.items = []; this.queue = []; this.missions = []; this.stats = {};
    this.safeLanes = [0, 1, 2];
    this.routeCooldown = 0;
  }
  get score() { return Math.floor(this.distance + this.coins * 10 + this.bonusScore); }
  get multiplier() { return Math.max(1, this.style); }
  get invincible() { return this.power > 0 || this.dash > 0; }
  emit(type, details = {}) { this.queue.push({ type, ...details }); }
  start(character = this.character) {
    this.character = ABILITIES[character] ? character : 'karina';
    this.reset(); this.mode = 'play';
    const goals = MISSIONS.map(goal => ({ ...goal, progress: 0, done: false }));
    for (let i = goals.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1)); [goals[i], goals[j]] = [goals[j], goals[i]];
    }
    this.missions = goals.slice(0, 3);
    this.spawnTimer = 1.5;
    this.nextJetpackDistance = 350; this.nextBoostDistance = 90;
    this.nextChoiceDistance = 150; this.nextSpringDistance = 220;
    this.dodgeCooldown = this.milestone = this.combo = 0; this.comboTimer = 0;
    for (let i = 0; i < 5; i++) this.add(1, -12 - i * 2.7, 'coin');
    this.add(1, -31, 'jetpack'); this.add(0, -31, 'magnet'); this.add(2, -31, 'shield');
    this.add(1, -50, 'box');
    for (let i = 0; i < 5; i++) this.add(0, -48 - i * 2.7, 'coin');
    this.emit('start');
  }
  add(lane, z, type, details = {}) {
    const item = { id: ++this.serial, lane, z, type, taken: false, passed: false, age: 0, ...details };
    this.items.push(item); return item;
  }
  snacks(lane, z = -76, count = 5, details = {}) {
    for (let i = 0; i < count; i++) this.add(lane, z - i * 2.6, 'coin', details);
  }
  row() {
    if (this.jetpack > 0) { this.snacks(Math.floor(this.random() * 3), -65, 8, { altitude: 3.8 }); return; }
    if (this.distance >= this.nextChoiceDistance) {
      const choice = ++this.serial;
      this.add(0, -76, 'gate', { choice, reward: 'shield', warning: 'ВЫБИРАЙ: ЩИТ ← ИЛИ ОСТРО ×2 →' });
      this.add(2, -76, 'gate', { choice, reward: 'spicy' });
      this.snacks(0, -82, 3); this.snacks(2, -82, 3);
      this.safeLanes = [0, 1, 2]; this.nextChoiceDistance = this.distance + 240; return;
    }
    if (this.distance >= this.nextSpringDistance) {
      const lane = Math.floor(this.random() * 3);
      this.add(lane, -76, 'spring', { warning: 'БАТУТ! ЗАЛЕТАЙ ЗА ЛАТЯО ↑' });
      this.add(lane, -90, 'train');
      this.snacks(lane, -88, 5, { altitude: 3.8 });
      this.safeLanes = [0, 1, 2].filter(l => l !== lane);
      this.nextSpringDistance = this.distance + 280; return;
    }
    const lane = Math.floor(this.random() * 3);
    let safe = (lane + 1 + Math.floor(this.random() * 2)) % 3;
    const pattern = Math.floor(this.random() * (this.distance > 100 ? 6 : 3));
    if (pattern === 0) this.add(lane, -76, 'train');
    else if (pattern === 1) {
      this.add(lane, -76, 'box');
      this.add((lane + 1) % 3, -91, 'box');
      safe = (lane + 2) % 3;
    } else if (pattern === 2) {
      this.add(lane, -76, 'box'); this.add(lane, -102, 'bar');
    } else if (pattern === 3) {
      const from = this.random() < .5 ? 0 : 1;
      this.add(from, -76, 'cart', { sweep: [from, from + 1], phase: this.random() * Math.PI, warning: 'ТЕЛЕЖКА НА ТРАССЕ! СЛЕДИ ЗА КОЛЁСАМИ' });
      safe = from === 0 ? 2 : 0;
    } else if (pattern === 4) {
      this.add(lane, -76, 'puddle', { warning: 'ЛУЖИ! ПЕРЕПРЫГНИ ИЛИ ОБОЙДИ' });
      this.add(lane, -104, 'bar');
    } else {
      this.add(lane, -76, 'bar');
      this.snacks(lane, -76, 7); // Riskier ducking route, alongside the safe trail.
    }
    this.safeLanes = [safe]; this.snacks(safe);
    if (this.distance >= this.nextBoostDistance) {
      const types = ['magnet', 'shield', 'slow'];
      this.add(safe, -69, types[Math.floor(this.random() * types.length)]);
      this.nextBoostDistance = this.distance + 120;
    }
    if (this.distance >= this.nextJetpackDistance && !this.items.some(o => o.type === 'jetpack')) {
      this.add(safe, -62, 'jetpack'); this.nextJetpackDistance = this.distance + 420;
    }
  }
  record(key, amount = 1) {
    this.stats[key] = (this.stats[key] || 0) + amount;
    for (const mission of this.missions) {
      if (mission.done || mission.key !== key) continue;
      mission.progress = Math.min(mission.target, this.stats[key]);
      if (mission.progress >= mission.target) {
        mission.done = true; this.missionsDone++; this.bonusScore += 250;
        this.emit('mission', { title: mission.title, completed: this.missionsDone, reward: 250 });
        if (this.missionsDone === 3) { this.bonusScore += 750; this.shield = 1; this.emit('all-missions', { reward: 750 }); }
      }
    }
  }
  trick(kind, item) {
    this.style = Math.min(5, this.style + 1); this.styleTimer = 6.5;
    const points = (kind === 'near' ? 35 : 60) * this.multiplier;
    this.bonusScore += points;
    this.emit('dodge', { kind, item, points, multiplier: this.multiplier });
    this.record('dodge'); if (kind === 'jump' || kind === 'slide') this.record(kind);
  }
  useAbility() {
    if (this.mode !== 'play' || this.abilityCooldown > 0) return;
    this.abilityCooldown = ABILITIES[this.character].cooldown;
    if (this.character === 'karina') this.dash = 3;
    else if (this.character === 'karina-2') { this.slow = Math.max(this.slow, 6); this.magnet = Math.max(this.magnet, 6); }
    else {
      for (const item of this.items) {
        if (!item.taken && OBSTACLES.has(item.type) && item.z > -32 && item.z < 8) {
          item.taken = true; this.bonusScore += 40; this.emit('smash', { item, wave: true });
        }
      }
      this.landing = Math.max(this.landing, 1.2);
    }
    this.record('ability'); this.emit('ability', { character: this.character });
  }
  action(action) {
    if (this.mode !== 'play') return;
    if (action === 'ability') { this.useAbility(); return; }
    if (action === 'left' && this.lane > 0) { this.lane--; this.emit('lane'); }
    if (action === 'right' && this.lane < 2) { this.lane++; this.emit('lane'); }
    if (action === 'jump' && this.jump <= 0 && this.jetpack <= 0 && this.bounce <= 0) {
      this.jump = .86; this.slide = 0; this.emit('jump');
    }
    if (action === 'slide' && this.slide <= 0 && this.jump <= 0 && this.jetpack <= 0 && this.bounce <= 0) {
      this.slide = .85; this.emit('slide');
    }
  }
  pause() { if (this.mode === 'play') this.mode = 'paused'; }
  resume() { if (this.mode === 'paused') this.mode = 'play'; }
  collect(item) {
    item.taken = true;
    const value = this.spicy > 0 ? 2 : 1;
    this.coins += value; this.combo++; this.comboTimer = 2.5;
    this.emit('coin', { item, combo: this.combo, value, magnet: this.magnet > 0 });
    this.record('coins', value);
    if (!this.power) {
      this.heat += value;
      if (this.heat >= 10) { this.heat %= 10; this.power = 8; this.emit('power'); }
    }
  }
  pickup(item) {
    item.taken = true;
    if (item.type === 'jetpack') {
      this.jetpack = 10; this.jump = this.slide = this.bounce = 0; this.emit('jetpack');
    } else if (item.type === 'spring') {
      this.bounce = 1.6; this.jump = this.slide = 0; this.emit('spring'); this.record('spring');
    } else if (item.type === 'gate') {
      for (const other of this.items) if (other.choice === item.choice) other.taken = true;
      if (item.reward === 'shield') this.shield = 1; else this.spicy = 9;
      this.emit('choice', { reward: item.reward }); this.record('choice');
    } else {
      if (item.type === 'shield') this.shield = 1;
      else if (item.type === 'magnet') this.magnet = 9;
      else if (item.type === 'slow') this.slow = 7;
      this.emit('boost', { kind: item.type });
    }
    this.record('boost');
  }
  step(dt) {
    if (this.mode !== 'play') return this.drain();
    dt = Math.max(0, Math.min(dt, .05));
    const powered = this.power > 0, flying = this.jetpack > 0, bouncing = this.bounce > 0;
    for (const key of ['landing', 'jetpack', 'power', 'magnet', 'slow', 'spicy', 'dash', 'slip', 'abilityCooldown', 'bounce', 'styleTimer', 'routeCooldown']) this[key] = Math.max(0, this[key] - dt);
    if (flying && !this.jetpack) { this.landing = 1.1; this.emit('jetpack-end'); }
    if (bouncing && !this.bounce) this.landing = Math.max(this.landing, .65);
    if (powered && !this.power) this.emit('power-end');
    if (!this.styleTimer) this.style = 0;
    const speed = (18 + Math.min(13, this.distance / 170) + (flying ? 10 : this.invincible ? 8 : 0) + (this.spicy > 0 ? 5 : 0)) * (this.slow > 0 ? .58 : 1) * (this.slip > 0 ? .52 : 1);
    this.distance += speed * dt; this.record('distance', speed * dt);
    this.jump = Math.max(0, this.jump - dt); this.slide = Math.max(0, this.slide - dt);
    this.y = this.jetpack > 0 ? 3.8 : this.bounce > 0 ? Math.sin(this.bounce / 1.6 * Math.PI) * 4.8 : this.jump > 0 ? Math.sin(this.jump / .86 * Math.PI) * 2.25 : 0;
    this.x += ((this.lane - 1) * 3 - this.x) * Math.min(1, dt * 18);
    this.lean = ((this.lane - 1) * 3 - this.x) * -.12;
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt); if (!this.comboTimer) this.combo = 0;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) { this.row(); this.spawnTimer = 1.65 - Math.min(.25, this.distance / 4000); }
    for (const item of this.items) {
      item.age += dt; item.z += speed * dt;
      if (item.sweep) {
        const [from, to] = item.sweep;
        item.x = (from - 1 + (to - from) * (.5 + .5 * Math.sin(item.age * 1.7 + item.phase))) * 3;
      }
      if (item.taken) continue;
      if (item.warning && !item.warned && item.z > -48 && !this.routeCooldown) {
        item.warned = true; this.routeCooldown = 3.8; this.emit('route', { text: item.warning });
      }
      const deltaX = Math.abs(this.x - (item.x ?? (item.lane - 1) * 3));
      const touching = item.type === 'train' ? item.z > -4.6 && item.z < 4.7 : Math.abs(item.z) < .8;
      const airborne = this.jetpack > 0 || flying || this.bounce > 0 || bouncing;
      const coinInReach = Math.abs(this.y - (item.altitude || 0)) < 1.8;
      const magnetic = this.magnet > 0 && item.type === 'coin' && item.z > -10 && item.z < 1 && coinInReach;
      if (item.type === 'coin') {
        if (magnetic || (touching && deltaX < 1.03 && coinInReach)) this.collect(item);
        continue;
      }
      if (touching && deltaX < 1.03) {
        if (!OBSTACLES.has(item.type)) {
          if (!airborne || item.type === 'jetpack') this.pickup(item);
        } else {
          const collision = item.type === 'train' || (item.type === 'bar' ? this.slide <= 0 : this.y < (item.type === 'puddle' ? .65 : 1.28));
          if (collision && !airborne && this.landing <= 0) {
            if (this.invincible) { item.taken = true; this.bonusScore += 40; this.emit('smash', { item }); }
            else if (item.type === 'puddle') {
              item.taken = true; this.slip = 1.2; this.heat = Math.max(0, this.heat - 3); this.style = this.styleTimer = 0; this.emit('slip');
            } else if (this.shield) {
              this.shield = 0; item.taken = true; this.landing = 1.25; this.style = this.styleTimer = 0; this.emit('shield-break', { item });
            } else { this.mode = 'over'; this.emit('hit', { item }); break; }
          }
        }
      }
      const end = item.type === 'train' ? 4.8 : .9;
      if (OBSTACLES.has(item.type) && !airborne && this.landing <= 0 && !item.taken && !item.passed && item.z > end) {
        item.passed = true;
        if (deltaX < 3.25 && !this.dodgeCooldown) {
          this.dodgeCooldown = .35;
          this.trick(deltaX < 1.05 ? item.type === 'bar' ? 'slide' : 'jump' : 'near', item);
        }
      }
    }
    this.items = this.items.filter(item => !item.taken && item.z < 18);
    const milestone = Math.floor(this.distance / 250);
    if (this.mode === 'play' && milestone > this.milestone) { this.milestone = milestone; this.emit('milestone', { distance: milestone * 250 }); }
    return this.drain();
  }
  drain() { const events = this.queue; this.queue = []; return events; }
}
