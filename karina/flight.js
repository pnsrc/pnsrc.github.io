import * as T from './three.module.js';

export function makeJetpack() {
  const group = new T.Group();
  const flames = [];
  const metal = new T.MeshStandardMaterial({ color: '#a7c5ca', metalness: .7, roughness: .28 });
  const red = new T.MeshStandardMaterial({ color: '#ee634c', roughness: .5 });
  const dark = new T.MeshStandardMaterial({ color: '#243b4d', metalness: .5 });
  const yellow = new T.MeshBasicMaterial({ color: '#ffe381' });
  const orange = new T.MeshBasicMaterial({ color: '#ff7b37', transparent: true, opacity: .8, depthWrite: false });
  function put(geometry, material, x, y, z) {
    const object = new T.Mesh(geometry, material); object.position.set(x, y, z); group.add(object); return object;
  }
  put(new T.BoxGeometry(.65, .65, .23), dark, 0, 0, 0);
  for (const side of [-1, 1]) {
    put(new T.CapsuleGeometry(.19, .53, 5, 14), metal, side * .29, 0, -.02);
    put(new T.CylinderGeometry(.198, .198, .12, 14), red, side * .29, -.05, -.02);
    put(new T.CylinderGeometry(.10, .17, .19, 14), dark, side * .29, -.49, -.02);
    const outer = put(new T.ConeGeometry(.20, 1, 12), orange, side * .29, -1.1, -.02);
    const inner = put(new T.ConeGeometry(.10, 1, 12), yellow, side * .29, -.95, -.02);
    outer.rotation.z = inner.rotation.z = Math.PI;
    flames.push({ outer, inner });
  }
  put(new T.BoxGeometry(.27, .18, .04), red, 0, .18, -.14);
  return { group, update(time, active, orbit = false) {
    for (let i = 0; i < flames.length; i++) {
      const { outer, inner } = flames[i];
      outer.visible = inner.visible = active;
      const length = (orbit ? 2.5 : 1.1) * (1 + Math.sin(time * 35 + i) * .18);
      outer.scale.y = length; outer.position.y = -.6 - length / 2;
      inner.scale.y = length * .7; inner.position.y = -.6 - length * .35;
    }
  } };
}

export class OrbitMeme {
  constructor(root, overlay) {
    this.root = root; this.overlay = overlay;
    this.scene = new T.Scene(); this.scene.background = new T.Color('#08142b');
    this.camera = new T.PerspectiveCamera(46, 1, .1, 100);
    this.camera.position.set(0, 1.7, 8);
    this.camera.lookAt(0, 1.5, 0);
    this.scene.add(new T.HemisphereLight('#c4eaff', '#6263a9', 3));
    const key = new T.DirectionalLight('#ffdbb2', 3.5); key.position.set(-3, 6, 8); this.scene.add(key);
    const fill = new T.DirectionalLight('#78c6ff', 2); fill.position.set(5, -1, -5); this.scene.add(fill);
    this.background = new T.TextureLoader().load('orbit-earth.jpg', texture => { texture.colorSpace = T.SRGBColorSpace; this.scene.background = texture; });
    this.background.colorSpace = T.SRGBColorSpace;
    this.active = false;
    this.actor = null;
    this.age = 0;
    this.duration = 4.2;
  }
  begin(actor, name) {
    this.finish();
    this.actor = actor;
    this.parent = actor.parent;
    this.scene.add(actor);
    this.age = 0; this.active = true;
    this.overlay.hidden = false;
    this.overlay.querySelector('[data-orbit-name]').textContent = `${name.toUpperCase()} · ОРБИТА ДЕДЛАЙНОВ`;
    this.root.classList.add('orbiting');
  }
  finish() {
    if (this.actor && this.parent) {
      this.parent.add(this.actor);
      this.actor.rotation.set(0, 0, 0);
      this.actor.scale.setScalar(1);
    }
    this.actor = null; this.parent = null; this.active = false;
    this.overlay.hidden = true;
    this.root.classList.remove('orbiting');
  }
  render(renderer, time, dt, width, height) {
    if (!this.active) return;
    this.age += dt;
    const portrait = width < 650;
    this.camera.aspect = width / height;
    this.camera.position.z = portrait ? 10.4 : 7.8;
    this.camera.updateProjectionMatrix();
    this.actor.position.set(portrait ? 1.2 : 1.1, portrait ? 1.0 : .8, 0);
    this.actor.rotation.set(.10, -.08, 1.12 + Math.sin(time * 8) * .035);
    this.actor.scale.setScalar(portrait ? .78 : 1.13);
    renderer.render(this.scene, this.camera);
    if (this.age >= this.duration) this.finish();
  }
}
