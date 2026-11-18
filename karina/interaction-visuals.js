import * as T from './three.module.js';

const ring = new T.TorusGeometry(.55, .055, 8, 28);
const wheel = new T.CylinderGeometry(.17, .17, .13, 10).rotateZ(Math.PI / 2);
const disc = new T.CircleGeometry(1, 32).rotateX(-Math.PI / 2);
const crystal = new T.OctahedronGeometry(.40);
const magnetArc = new T.TorusGeometry(.34, .12, 8, 20, Math.PI);
const pickupNames = { magnet: 'МАГНИТ', shield: 'ЩИТ', slow: 'СЛОУ-МО' };
const pickupColors = { magnet: '#d9a5ff', shield: '#8ce4f0', slow: '#9caeff' };
const gateFloors = Object.fromEntries([['shield', '#7fcbd9'], ['spicy', '#ef9460']].map(([key, color]) => [key, new T.MeshBasicMaterial({ color, transparent: true, opacity: .30, depthWrite: false })]));
const puddleMaterial = new T.MeshStandardMaterial({ color: '#4c9bb6', roughness: .12, metalness: .2, transparent: true, opacity: .87 });

export function interactiveItem(item, { box, ball, sign, mat }) {
  if (!['magnet', 'shield', 'slow', 'spring', 'gate', 'cart', 'puddle'].includes(item.type)) return null;
  const g = new T.Group();
  if (pickupNames[item.type]) {
    const color = pickupColors[item.type];
    const halo = new T.Mesh(ring, mat(color, .4)); halo.position.y = 1.5; g.add(halo);
    if (item.type === 'magnet') {
      const arc = new T.Mesh(magnetArc, mat('#e57575')); arc.rotation.z = Math.PI; arc.position.y = 1.6; g.add(arc);
      box(.24, .28, .24, '#eff5e3', -.34, 1.75, 0, g);
      box(.24, .28, .24, '#7197da', .34, 1.75, 0, g);
    } else if (item.type === 'shield') {
      const mesh = new T.Mesh(crystal, mat(color, .35)); mesh.scale.set(1, 1.35, .4); mesh.position.y = 1.5; g.add(mesh);
      sign('✓', .4, .5, 0, 1.5, .2, g, '#7bc9da', '#ffffff');
    } else {
      ball(.33, '#d2ddf5', 0, 1.5, 0, g, [1, 1, .24]);
      box(.035, .24, .035, '#485e95', 0, 1.61, .1, g);
      box(.17, .035, .035, '#485e95', .065, 1.5, .1, g);
    }
    sign(pickupNames[item.type], 1.75, .48, 0, .58, .1, g, '#263e55', '#f4f5dc');
    g.userData.float = true;
  } else if (item.type === 'gate') {
    const spicy = item.reward === 'spicy', color = spicy ? '#ef9460' : '#7fcbd9';
    for (const side of [-1, 1]) {
      box(.12, 3.25, .17, color, side * 1.20, 1.62, 0, g, .18);
      box(.42, .13, 1.0, '#345861', side * 1.20, .065, 0, g);
    }
    box(2.55, .85, .25, color, 0, 3.30, 0, g, .15);
    sign(spicy ? 'ОСТРО ×2' : 'ЩИТ', 2.40, .73, 0, 3.30, .14, g, spicy ? '#b65a3e' : '#386f82');
    sign(spicy ? '+ СКОРОСТЬ' : '1 СПАСЕНИЕ', 2.2, .42, 0, 2.58, .1, g, '#284751');
    const floor = new T.Mesh(disc, gateFloors[item.reward]);
    floor.scale.set(1.15, 1, 2.8); floor.position.y = .055; g.add(floor);
  } else if (item.type === 'spring') {
    box(2.1, .16, 1.8, '#54777a', 0, .10, 0, g);
    for (const y of [.22, .37, .52]) {
      const coil = new T.Mesh(ring, mat('#e3d7ab')); coil.rotation.x = Math.PI / 2; coil.position.y = y; coil.scale.set(.65, .65, .65); g.add(coil);
    }
    box(2.15, .15, 1.75, '#dfff70', 0, .64, 0, g, .10);
    sign('↑ БАТУТ ↑', 1.95, .42, 0, .74, .89, g, '#4c674e', '#e6ff99');
  } else if (item.type === 'puddle') {
    const puddle = new T.Mesh(disc, puddleMaterial);
    puddle.scale.set(1.15, 1, 1.8); puddle.position.y = .045; g.add(puddle);
    for (let i = 0; i < 3; i++) box(.65 - i * .12, .012, .035, '#b2dde0', -.2 + i * .25, .057, -.7 + i * .6, g);
    sign('СКОЛЬЗКО', 1.7, .40, 0, .28, -1.7, g, '#e6bc6e', '#354b54');
  } else if (item.type === 'cart') {
    box(1.6, .30, 1.7, '#8fa7a9', 0, .49, 0, g);
    box(1.6, .64, .08, '#c59769', 0, .91, .84, g);
    box(1.6, .64, .08, '#c59769', 0, .91, -.84, g);
    box(1.45, .05, .05, '#c5d3ca', 0, 1.48, -.84, g);
    for (const side of [-1, 1]) {
      box(.08, .64, 1.7, '#c59769', side * .77, .91, 0, g);
      box(.05, .60, .05, '#c5d3ca', side * .70, 1.18, -.84, g);
      for (const z of [-.56, .56]) {
        const mesh = new T.Mesh(wheel, mat('#354754')); mesh.position.set(side * .76, .28, z); g.add(mesh);
      }
    }
    for (let i = 0; i < 6; i++) box(.20, .45, .14, i % 2 ? '#f1bb64' : '#db6655', (i % 3 - 1) * .4, 1.20, -.3 + Math.floor(i / 3) * .55, g);
    sign('ЛАТЯО', 1.35, .47, 0, .92, .89, g, '#ad6850');
  }
  return g;
}

export class GameplayEffects {
  constructor(scene) {
    this.shield = new T.Group(); scene.add(this.shield);
    const shieldGeo = new T.IcosahedronGeometry(1, 1);
    const shell = new T.Mesh(shieldGeo, new T.MeshBasicMaterial({ color: '#8ce4f0', transparent: true, opacity: .13, depthWrite: false }));
    const edges = new T.LineSegments(new T.EdgesGeometry(shieldGeo), new T.LineBasicMaterial({ color: '#9be9ed', transparent: true, opacity: .35 }));
    this.shield.add(shell, edges);
    this.magnet = new T.Group(); scene.add(this.magnet);
    for (let i = 0; i < 2; i++) {
      const orbit = new T.Mesh(ring, new T.MeshBasicMaterial({ color: i ? '#aebcff' : '#d8a4ff', transparent: true, opacity: .6 }));
      orbit.scale.setScalar(2.4); orbit.rotation.x = .8 + i * 1.7; this.magnet.add(orbit);
    }
    this.waves = [];
    for (let i = 0; i < 3; i++) {
      const mesh = new T.Mesh(ring, new T.MeshBasicMaterial({ color: '#ffe2a0', transparent: true, opacity: 0, depthWrite: false }));
      mesh.rotation.x = -Math.PI / 2; mesh.visible = false; scene.add(mesh); this.waves.push({ mesh, age: 99 });
    }
  }
  wave(x, color = '#ffe2a0') {
    const wave = this.waves.find(w => w.age > .9) || this.waves[0];
    wave.age = 0; wave.mesh.position.set(x, .22, -1); wave.mesh.material.color.set(color);
  }
  update(sim, time, dt, orbit) {
    const playing = sim.mode === 'play' || sim.mode === 'paused';
    this.shield.visible = playing && sim.shield > 0 && !orbit;
    this.shield.position.set(sim.x, sim.y + 1.65, 0);
    this.shield.scale.set(1.18, 1.85, .85); this.shield.rotation.y = time * .35;
    this.magnet.visible = playing && sim.magnet > 0 && !orbit;
    this.magnet.position.set(sim.x, sim.y + 1.7, 0); this.magnet.rotation.y = time * 1.8;
    for (const wave of this.waves) {
      wave.age += dt; wave.mesh.visible = wave.age < .9 && playing && !orbit;
      wave.mesh.scale.setScalar(1 + wave.age * 28); wave.mesh.material.opacity = Math.max(0, .8 * (1 - wave.age / .9));
    }
  }
}
