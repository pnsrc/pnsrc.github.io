import test from 'node:test';
import assert from 'node:assert/strict';
import { RunnerGame } from '../runner.js';
function game() { const g = new RunnerGame(() => .1); g.start(); g.items = []; g.spawnTimer = 100; g.drain(); return g; }
function step(g, seconds) { const events = []; for (let t = 0; t < seconds; t += .01) events.push(...g.step(.01)); return events; }
test('a paused run preserves position, distance, and power timer', () => {
  const g = game(); g.power = 4; g.pause(); step(g, 2); assert.equal(g.distance, 0); assert.equal(g.power, 4); g.resume(); step(g, .1); assert.ok(g.distance > 0);
});
test('running into a box ends the run exactly once', () => {
  const g = game(); g.add(1, -1, 'box'); const events = step(g, .3); assert.equal(g.mode, 'over'); assert.equal(events.filter(e => e.type === 'hit').length, 1);
});
test('jump clears a box and produces an evasion reaction', () => {
  const g = game(); g.add(1, -5, 'box'); g.action('jump'); const events = step(g, .5); assert.equal(g.mode, 'play'); assert.ok(events.some(e => e.type === 'dodge' && e.kind === 'jump'));
});
test('sliding clears the overhead bar', () => {
  const g = game(); g.add(1, -3, 'bar'); g.action('slide'); const events = step(g, .4); assert.equal(g.mode, 'play'); assert.ok(events.some(e => e.type === 'dodge' && e.kind === 'slide'));
});
test('changing lanes evades a train and triggers one near miss', () => {
  const g = game(); g.add(1, -12, 'train'); g.action('left'); const events = step(g, 1.3); assert.equal(g.mode, 'play'); assert.equal(events.filter(e => e.type === 'dodge').length, 1);
});
test('ten snacks enable power; a train is smashed while powered', () => {
  const g = game(); for(let i = 0; i < 10; i++) g.add(1, -1-i*.2, 'coin'); const events = step(g, .25); assert.equal(g.coins, 10); assert.ok(g.power > 7); assert.equal(g.heat, 0); assert.equal(events.filter(e => e.type === 'power').length, 1);
  g.add(1, -4.5, 'train'); const collision = step(g, .1); assert.equal(g.mode, 'play'); assert.ok(collision.some(e => e.type === 'smash'));
});
test('power expiration restores ordinary collisions', () => {
  const g = game(); g.power = .03; step(g, .1); g.add(1, -1, 'train'); step(g, .1); assert.equal(g.mode, 'over');
});
test('every generated row leaves a snack lane free of obstacles', () => {
  const g = game(); g.distance = 1000;
  for(let i = 0; i < 50; i++) { g.items = []; g.random = Math.random; g.row(); const snacks = g.items.filter(o => o.type === 'coin'); const blocks = g.items.filter(o => !['coin', 'jetpack'].includes(o.type)); assert.equal(snacks.length, 5); assert.ok(snacks.every(c => blocks.every(b => b.lane !== c.lane))); }
});
test('restart clears the previous run and its reaction queue', () => {
  const g = game(); g.power = 4; g.coins = 100; g.mode = 'over'; g.emit('hit'); g.start(); assert.equal(g.power, 0); assert.equal(g.coins, 0); assert.equal(g.mode, 'play'); assert.deepEqual(g.drain().map(e => e.type), ['start']);
});

test('rocket pickup grants flight; a train underneath cannot end the run', () => {
  const g = game(); g.add(1, -1, 'jetpack');
  const events = step(g, .1); assert.ok(events.some(e => e.type === 'jetpack')); assert.ok(g.jetpack > 9);
  g.add(1, -4, 'train'); step(g, .1); assert.equal(g.mode, 'play'); assert.ok(g.y > 3);
});
test('flight timer freezes on pause and resets on a new run', () => {
  const g = game(); g.jetpack = 5; g.pause(); step(g, 2); assert.equal(g.jetpack, 5); g.start(); assert.equal(g.jetpack, 0);
});
test('flight spawns elevated snacks and gives a safe landing interval', () => {
  const g = game(); g.jetpack = 4; g.row(); assert.ok(g.items.every(o => o.type === 'coin' && o.altitude > 3));
  g.items = []; g.jetpack = .03; const events = step(g, .1); assert.ok(events.some(e => e.type === 'jetpack-end'));
  g.add(1, -1, 'box'); step(g, .1); assert.equal(g.mode, 'play');
  step(g, 1.2); g.add(1, -1, 'box'); step(g, .1); assert.equal(g.mode, 'over');
});
