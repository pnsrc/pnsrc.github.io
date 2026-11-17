// Gameplay is independent of rendering so collisions and power-ups stay testable.
export class RunnerGame {
  constructor(random = Math.random) {
    this.random = random;
    this.mode = 'ready';
    this.distance = this.coins = this.heat = this.power = this.jetpack = this.landing = 0;
    this.x = this.y = this.lean = this.jump = this.slide = 0;
    this.lane = 1;
    this.items = [];
    this.queue = [];
    this.serial = 0;
  }
  emit(type, details = {}) { this.queue.push({ type, ...details }); }
  start() {
    this.mode = 'play';
    this.distance = this.coins = this.heat = this.power = this.jetpack = this.landing = 0;
    this.x = this.y = this.lean = this.jump = this.slide = 0;
    this.lane = 1;
    this.items = [];
    this.queue = [];
    this.spawnTimer = 1.5;
    this.nextJetpackDistance = 350;
    this.dodgeCooldown = this.milestone = this.combo = 0;
    this.comboTimer = 0;
    this.add(1, -12, 'coin');
    for (let i = 1; i < 5; i++) this.add(1, -12 - i * 2.7, 'coin');
    this.add(1, -31, 'jetpack');
    this.add(1, -50, 'box');
    for (let i = 0; i < 5; i++) this.add(0, -48 - i * 2.7, 'coin');
    this.emit('start');
  }
  add(lane, z, type) {
    const item = { id: ++this.serial, lane, z, type, taken: false, passed: false };
    this.items.push(item);
    return item;
  }
  row() {
    if (this.jetpack > 0) {
      const lane = Math.floor(this.random() * 3);
      for (let i = 0; i < 8; i++) this.add(lane, -65 - i * 2.4, 'coin').altitude = 3.8;
      return;
    }
    const obstacleLane = Math.floor(this.random() * 3);
    const safe = (obstacleLane + 1 + Math.floor(this.random() * 2)) % 3;
    const roll = this.random();
    const type = roll < .27 ? 'train' : roll < .65 ? 'box' : 'bar';
    this.add(obstacleLane, -76, type);
    if (this.distance > 450 && this.random() > .7) {
      this.add(3 - obstacleLane - safe, -76, 'box');
    }
    for (let i = 0; i < 5; i++) this.add(safe, -76 - i * 2.6, 'coin');
    if (this.distance >= this.nextJetpackDistance && !this.items.some(o => o.type === 'jetpack')) {
      this.add(safe, -70, 'jetpack');
      this.nextJetpackDistance = this.distance + 420;
    }
  }
  action(action) {
    if (this.mode !== 'play') return;
    if (action === 'left' && this.lane > 0) { this.lane--; this.emit('lane'); }
    if (action === 'right' && this.lane < 2) { this.lane++; this.emit('lane'); }
    if (action === 'jump' && this.jump <= 0 && this.jetpack <= 0) {
      this.jump = .86;
      this.slide = 0;
      this.emit('jump');
    }
    if (action === 'slide' && this.slide <= 0 && this.jump <= 0 && this.jetpack <= 0) {
      this.slide = .85;
      this.emit('slide');
    }
  }
  pause() { if (this.mode === 'play') this.mode = 'paused'; }
  resume() { if (this.mode === 'paused') this.mode = 'play'; }
  step(dt) {
    if (this.mode !== 'play') return this.drain();
    dt = Math.min(dt, .05);
    const powered = this.power > 0;
    const flying = this.jetpack > 0;
    this.landing = Math.max(0, this.landing - dt);
    this.jetpack = Math.max(0, this.jetpack - dt);
    if (flying && this.jetpack === 0) { this.landing = 1.1; this.emit('jetpack-end'); }
    const speed = 18 + Math.min(13, this.distance / 170) + (flying ? 10 : powered ? 8 : 0);
    this.power = Math.max(0, this.power - dt);
    if (powered && this.power === 0) this.emit('power-end');
    this.distance += speed * dt;
    this.jump = Math.max(0, this.jump - dt);
    this.slide = Math.max(0, this.slide - dt);
    this.y = this.jetpack > 0 ? 3.8 : this.jump > 0 ? Math.sin(this.jump / .86 * Math.PI) * 2.25 : 0;
    this.x += ((this.lane - 1) * 3 - this.x) * Math.min(1, dt * 18);
    this.lean = ((this.lane - 1) * 3 - this.x) * -.12;
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (!this.comboTimer) this.combo = 0;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.row();
      this.spawnTimer = 1.65 - Math.min(.25, this.distance / 4000);
    }
    for (const o of this.items) {
      o.z += speed * dt;
      const deltaX = Math.abs(this.x - (o.lane - 1) * 3);
      const touching = o.type === 'train' ? o.z > -4.6 && o.z < 4.7 : Math.abs(o.z) < .8;
      if (!o.taken && touching && deltaX < 1.03) {
        if (o.type === 'jetpack') {
          o.taken = true;
          this.jetpack = 10;
          this.jump = this.slide = 0;
          this.emit('jetpack');
        } else if (o.type === 'coin') {
          o.taken = true;
          this.coins++;
          this.combo++;
          this.comboTimer = 2.5;
          this.emit('coin', { item: o, combo: this.combo });
          if (!this.power) {
            this.heat++;
            if (this.heat >= 10) {
              this.heat = 0;
              this.power = 8;
              this.emit('power');
            }
          }
        } else {
          const collision = o.type === 'train' || (o.type === 'box' ? this.y < 1.28 : this.slide <= 0);
          if (collision && !flying && this.jetpack <= 0 && this.landing <= 0) {
            if (this.power > 0) {
              o.taken = true;
              this.emit('smash', { item: o });
            } else {
              this.mode = 'over';
              this.emit('hit', { item: o });
              break;
            }
          }
        }
      }
      const end = o.type === 'train' ? 4.8 : .9;
      if (o.type !== 'coin' && o.type !== 'jetpack' && !flying && this.landing <= 0 && !o.taken && !o.passed && o.z > end) {
        o.passed = true;
        if (deltaX < 3.25 && !this.dodgeCooldown) {
          this.dodgeCooldown = 2.2;
          this.emit('dodge', { kind: deltaX < 1.05 ? o.type === 'box' ? 'jump' : 'slide' : 'near', item: o });
        }
      }
    }
    this.items = this.items.filter(o => !o.taken && o.z < 18);
    const milestone = Math.floor(this.distance / 250);
    if (milestone > this.milestone) {
      this.milestone = milestone;
      this.emit('milestone', { distance: milestone * 250 });
    }
    return this.drain();
  }
  drain() { const events = this.queue; this.queue = []; return events; }
}
