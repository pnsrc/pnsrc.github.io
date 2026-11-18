import test from 'node:test';
import assert from 'node:assert/strict';
import { RunnerGame, ABILITIES } from '../runner.js';

function game(character = 'karina') {
  const g = new RunnerGame(() => .1); g.start(character);
  g.items = []; g.spawnTimer = 999; g.missions = []; g.drain(); return g;
}
function step(g, seconds) {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 100); i++) events.push(...g.step(.01));
  return events;
}

test('magnet collects all lanes at the same height; it cannot pick up ground snacks during flight', () => {
  const g = game(); g.magnet = 9;
  g.add(0, -8, 'coin'); g.add(2, -8, 'coin'); g.add(1, -8, 'coin', { altitude: 3.8 });
  step(g, .01); assert.equal(g.coins, 2); assert.equal(g.items.length, 1);
  g.jetpack = 5; g.add(0, -8, 'coin');
  step(g, .01); assert.equal(g.coins, 3); assert.equal(g.items[0].altitude, undefined);
});

test('unreachable aerial snacks after landing are ignored and never become fake bonuses', () => {
  const g = game();
  g.missions = [{ key: 'boost', title: 'Collect bonuses', target: 2, progress: 0, done: false }];
  for (let i = 0; i < 5; i++) g.add(1, -1 - i * .15, 'coin', { altitude: 3.8 });
  const events = step(g, .2);
  assert.equal(g.coins, 0); assert.equal(g.stats.boost, undefined);
  assert.equal(g.missions[0].progress, 0);
  assert.ok(!events.some(e => e.type === 'boost' || e.type === 'coin' || e.type === 'mission'));
  g.add(1, -1, 'magnet'); assert.ok(step(g, .1).some(e => e.type === 'boost' && e.kind === 'magnet'));
  assert.equal(g.stats.boost, 1);
});

test('shield absorbs exactly one crash and grace prevents an immediate second hit', () => {
  const g = game(); g.shield = 1; g.add(1, -1, 'train');
  const events = step(g, .1);
  assert.equal(g.mode, 'play'); assert.equal(g.shield, 0);
  assert.equal(events.filter(e => e.type === 'shield-break').length, 1);
  g.add(1, -1, 'box'); step(g, .1); assert.equal(g.mode, 'play');
  step(g, 1.5); g.add(1, -1, 'box'); step(g, .1); assert.equal(g.mode, 'over');
});

test('power protection is used before the spare shield', () => {
  const g = game(); g.shield = 1; g.power = 4; g.add(1, -1, 'train');
  const events = step(g, .1);
  assert.equal(g.shield, 1); assert.ok(events.some(e => e.type === 'smash'));
});

test('Karina’s dash is temporary protection with a cooldown, not a free repeated action', () => {
  const g = game(); g.action('ability'); g.action('ability'); g.add(1, -1, 'train');
  const events = step(g, .1);
  assert.equal(events.filter(e => e.type === 'ability').length, 1);
  assert.ok(g.dash > 2); assert.equal(g.mode, 'play'); assert.ok(g.abilityCooldown > 17);
  step(g, 3.1); g.add(1, -1, 'box'); step(g, .1); assert.equal(g.mode, 'over');
});

test('Karina II slows approach speed while keeping lane changes responsive', () => {
  const g = game('karina-2'), normal = game();
  g.action('ability'); g.action('left'); step(g, .5); step(normal, .5);
  assert.ok(g.slow > 5); assert.ok(g.magnet > 5);
  assert.ok(g.distance < normal.distance * .65); assert.ok(g.x < -2.9);
});

test('Maria removes nearby threats across all lanes and leaves distant items and rewards', () => {
  const g = game('maria');
  g.add(0, -20, 'box'); g.add(1, -25, 'train'); g.add(2, -12, 'cart');
  const distant = g.add(1, -60, 'bar'), coin = g.add(0, -20, 'coin');
  g.action('ability'); const events = g.drain();
  assert.equal(events.filter(e => e.type === 'smash').length, 3);
  assert.equal(distant.taken, false); assert.equal(coin.taken, false);
  assert.equal(g.bonusScore, 120); assert.equal(g.abilityCooldown, ABILITIES.maria.cooldown);
});

test('pause freezes new bonuses, cooldown, style, cart motion and mission progress', () => {
  const g = game(); g.action('ability'); g.magnet = 7; g.slow = 3; g.spicy = 6; g.bounce = 1;
  const cart = g.add(1, -20, 'cart', { sweep: [0, 1], phase: 0 });
  g.pause();
  const before = JSON.stringify(g); step(g, 4);
  // Draining already queued events is allowed; simulation state stays frozen.
  const after = JSON.parse(JSON.stringify(g)), original = JSON.parse(before);
  delete after.queue; delete original.queue;
  assert.deepEqual(after, original); assert.equal(cart.age, 0);
});

test('choosing one gate consumes the pair; shield and spicy rewards are mutually exclusive', () => {
  const g = game(); g.lane = 0; g.x = -3;
  g.add(0, -1, 'gate', { choice: 17, reward: 'shield' });
  g.add(2, -1, 'gate', { choice: 17, reward: 'spicy' });
  const events = step(g, .1);
  assert.equal(g.shield, 1); assert.equal(g.spicy, 0); assert.equal(g.items.length, 0);
  assert.equal(events.filter(e => e.type === 'choice').length, 1);
});

test('spicy gate doubles snacks and heat while increasing speed', () => {
  const g = game(); g.lane = 2; g.x = 3;
  g.add(2, -1, 'gate', { choice: 2, reward: 'spicy' }); step(g, .1);
  g.add(2, -1, 'coin'); const before = g.distance; step(g, .1);
  assert.equal(g.coins, 2); assert.equal(g.heat, 2); assert.ok(g.distance - before > 2.2);
});

test('spring launches the character above the following train and elevated snacks', () => {
  const g = game(); g.add(1, -1, 'spring'); g.add(1, -14, 'train'); g.add(1, -14, 'coin', { altitude: 3.8 });
  const events = step(g, 1);
  assert.ok(events.some(e => e.type === 'spring')); assert.equal(g.mode, 'play'); assert.ok(g.y > 4); assert.equal(g.coins, 1);
});

test('puddles cause a recoverable slip; jumping clears them', () => {
  const g = game(); g.heat = 5; g.add(1, -1, 'puddle');
  assert.ok(step(g, .1).some(e => e.type === 'slip')); assert.equal(g.mode, 'play'); assert.equal(g.heat, 2);
  const jumping = game(); jumping.add(1, -5, 'puddle'); jumping.action('jump');
  assert.ok(!step(jumping, .5).some(e => e.type === 'slip')); assert.equal(jumping.slip, 0);
});

test('cart collisions use its moving position rather than its spawn lane', () => {
  const g = game(); g.lane = 1; g.x = 0;
  g.add(0, -1, 'cart', { sweep: [0, 1], phase: Math.PI / 2 });
  step(g, .1); assert.equal(g.mode, 'over');
});

test('a puddle followed by a bar permits a jump-slide combo even at maximum ordinary speed', () => {
  const g = game(); g.distance = 5000;
  g.add(1, -7.5, 'puddle'); g.add(1, -35.5, 'bar');
  g.action('jump'); const first = step(g, .91); g.action('slide'); const second = step(g, .45);
  assert.equal(g.mode, 'play'); assert.equal(g.slip, 0);
  assert.ok(first.some(e => e.type === 'dodge' && e.kind === 'jump'));
  assert.ok(second.some(e => e.type === 'dodge' && e.kind === 'slide'));
  assert.equal(g.multiplier, 2);
});

test('successful maneuvers build a bounded style multiplier and it expires', () => {
  const g = game();
  for (let i = 0; i < 7; i++) g.trick('jump', {});
  assert.equal(g.multiplier, 5); assert.ok(g.bonusScore > 7 * 60);
  step(g, 6.6); assert.equal(g.multiplier, 1); assert.equal(g.style, 0);
});

test('a real jump counts toward missions during power, while crashing through a box does not', () => {
  const jumping = game(); jumping.power = 4;
  jumping.missions = [{ key: 'jump', title: 'Jump', target: 1, progress: 0, done: false }];
  jumping.add(1, -5, 'box'); jumping.action('jump'); step(jumping, .5);
  assert.equal(jumping.missionsDone, 1); assert.equal(jumping.stats.jump, 1);
  const smashing = game(); smashing.power = 4; smashing.add(1, -1, 'box'); step(smashing, .2);
  assert.equal(smashing.stats.jump, undefined); assert.equal(smashing.style, 0);
});

test('three missions reward once, award the full-run bonus and a shield', () => {
  const g = game();
  g.missions = ['coins', 'ability', 'choice'].map(key => ({ key, title: key, target: 1, progress: 0, done: false }));
  g.record('coins'); g.record('ability'); g.record('choice'); g.record('coins', 100);
  const events = g.drain();
  assert.equal(events.filter(e => e.type === 'mission').length, 3);
  assert.equal(events.filter(e => e.type === 'all-missions').length, 1);
  assert.equal(g.missionsDone, 3); assert.equal(g.bonusScore, 1500); assert.equal(g.shield, 1);
});

test('a new run clears all temporary effects and selects three distinct missions', () => {
  const g = game('maria'); g.magnet = g.slow = g.shield = g.spicy = g.bounce = g.style = 5; g.bonusScore = 1000;
  g.start('karina-2');
  for (const key of ['magnet', 'slow', 'shield', 'spicy', 'bounce', 'style', 'bonusScore', 'abilityCooldown']) assert.equal(g[key], 0, key);
  assert.equal(g.character, 'karina-2'); assert.equal(new Set(g.missions.map(m => m.key)).size, 3);
});
