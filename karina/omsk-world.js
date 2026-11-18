import * as T from './three.module.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { DRACOLoader } from './vendor/loaders/DRACOLoader.js';
import { OMSK_MODELS, ROUTE_LENGTH, loopZ } from './omsk-layout.js';

const geometry = new T.BoxGeometry(1, 1, 1);
const up = new T.Vector3(0, 1, 0);

export class OmskWorld {
  constructor(scene, onProgress = () => {}) {
    this.group = new T.Group();
    this.group.name = 'Омская набережная';
    scene.add(this.group);
    this.loaded = 0;
    this.total = OMSK_MODELS.length;
    this.loading = true;
    this.errors = [];
    this.landmarks = [];
    this.repeaters = [];
    this.lifeBatches = [];
    this.materials = new Map();
    this.onProgress = onProgress;
    this.previousDistance = -1;
    this.waterTime = { value: 0 };
    this.buildPromenade();
    this.buildStreetLife();
    this.ready = this.loadModels();
  }

  material(color, emissive = false) {
    const key = color + emissive;
    if (!this.materials.has(key)) this.materials.set(key, new T.MeshStandardMaterial({
      color, roughness: .88, ...(emissive ? { emissive: color, emissiveIntensity: .65 } : {}),
    }));
    return this.materials.get(key);
  }

  box(w, h, d, color, x, y, z, parent = this.group, emissive = false) {
    const mesh = new T.Mesh(geometry, this.material(color, emissive));
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  instanced(geo, material, entries, scale) {
    const mesh = new T.InstancedMesh(geo, material, entries.length);
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.group.add(mesh);
    this.repeaters.push({ mesh, entries, scale });
    return mesh;
  }

  batch(geo, entries, material = this.material('#ffffff')) {
    if (!entries.length) return;
    const mesh = new T.InstancedMesh(geo, material, entries.length);
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    entries.forEach((entry, i) => mesh.setColorAt(i, new T.Color(entry.color || '#ffffff')));
    this.group.add(mesh);
    this.lifeBatches.push({ mesh, entries, animated: entries.some(e => e.walk || e.leg) });
  }

  buildStreetLife() {
    const walls = [], trim = [], windows = [], darkGlass = [], awnings = [];
    const palettes = ['#d5bca3', '#c5c9ba', '#d6ab99', '#b4c3c6', '#ead4af'];
    const add = (to, x, y, z, sx, sy, sz, color, extra = {}) => to.push({ x, y, z, sx, sy, sz, color, ...extra });
    const occupied = (x, z, depth, width) => OMSK_MODELS.some(spec => {
      if (spec.water) return false;
      const gap = Math.abs(loopZ(z - spec.z, 0, ROUTE_LENGTH, ROUTE_LENGTH / 2));
      return Math.abs(x - spec.x) < (depth + spec.width) / 2 + 3 && gap < (width + spec.depth) / 2 + 5;
    });
    let house = 0;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 25; i++) {
        const z = 25 - i * 22 - (side < 0 ? 7 : 0);
        const x = side * (side < 0 ? 20 : 21);
        if (occupied(x, z, 11, 17)) continue;
        const height = 6.2 + (i % 4) * 1.9;
        const facade = x - side * 5.55;
        add(walls, x, height / 2, z, 11, height, 17, palettes[(i + (side + 1)) % palettes.length]);
        add(trim, x, height + .10, z, 11.5, .3, 17.5, '#eee1c8');
        add(trim, x, .25, z, 11.15, .5, 17.15, '#8c938b');
        add(trim, facade, 2.8, z, .19, .3, 17.15, '#eee1c8');
        add(awnings, facade - side * .65, 2.55, z, 1.5, .14, 16.5, i % 2 ? '#609282' : '#bd6655');
        for (let row = 0; row < Math.floor((height - 2.5) / 2); row++) {
          for (let column = -3; column <= 3; column++) {
            const wz = z + column * 2.15;
            const wy = 4 + row * 2;
            add(trim, facade, wy, wz, .14, 1.45, 1.10, '#eee1c8');
            add(windows, facade - side * .09, wy + .03, wz, .035, 1.18, .85, (column + row + i) % 3 ? '#70939c' : '#edce94');
            add(trim, facade - side * .18, wy - .73, wz, .45, .10, 1.27, '#eee1c8');
          }
        }
        for (let j = -2; j <= 2; j++) add(darkGlass, facade - side * .04, 1.35, z + j * 2.9, .06, 2.1, 2.4, '#33545d');
        for (let j = -3; j <= 3; j++) add(trim, facade - side * .12, 1.4, z + j * 2.7, .3, 2.8, .18, '#eee1c8');
        // A street-corner shop faces the approaching player, with a real game-world sign.
        if (house++ % 2 === 0) {
          const titles = ['ЛАТЯО 24/7', 'КОФЕ С СОБОЙ', 'ХРУСТЬ', 'ПРАВКИ ПОТОМ'];
          const sign = this.sign(titles[i % 4], 'ОТКРЫТО · ДЕДЛАЙН ЗАКРЫТ', 5.6, .92);
          sign.position.set(x - side * 1.5, 1.1, 0);
          this.group.add(sign);
          this.landmarks.push({ group: sign, z: z + 8.65 });
        }
      }
    }
    // A second row gives the right bank a skyline beyond the supplied landmarks.
    for (let i = 0; i < 28; i++) {
      const z = 36 - i * 20;
      const h = 13 + (i * 7 % 19);
      const x = 46 + (i % 3) * 8;
      add(walls, x, h / 2, z, 13, h, 16, palettes[i % palettes.length]);
      add(trim, x, h + .15, z, 13.4, .35, 16.4, '#c9cabc');
      for (let row = 0; row < Math.floor(h / 2.5); row++) {
        for (let column = -2; column <= 2; column++) add(windows, x - 6.53, 2 + row * 2.5, z + column * 2.5, .05, 1.4, 1.05, '#8aa4a9');
      }
    }
    this.batch(geometry, walls);
    this.batch(geometry, trim);
    this.batch(geometry, windows);
    this.batch(geometry, darkGlass);
    this.batch(geometry, awnings);

    const cars = [], carGlass = [], wheels = [], carLights = [], planters = [], foliage = [], flowers = [];
    for (let i = 0; i < 42; i++) {
      const side = i % 2 ? -1 : 1, z = 17 - Math.floor(i / 2) * 26 - (side < 0 ? 11 : 0), x = side * 7.2;
      const color = ['#d76e5b', '#e4d6b6', '#51869d', '#708d79', '#e4ad5f'][i % 5];
      add(cars, x, .52, z, 1.45, .6, 3.2, color);
      add(cars, x, .98, z - .1, 1.25, .55, 1.9, color);
      add(carGlass, x, 1.02, z + .88, 1.12, .40, .035, '#274c5d');
      add(carGlass, x, 1.02, z - 1.07, 1.12, .37, .035, '#274c5d');
      for (const sx of [-1, 1]) {
        add(carGlass, x + sx * .635, 1.02, z - .12, .025, .37, 1.65, '#274c5d');
        for (const sz of [-1, 1]) add(wheels, x + sx * .70, .32, z + sz * 1.02, .16, .55, .55, '#243944');
        add(carLights, x + sx * .48, .61, z + 1.61, .27, .16, .035, '#ffe2ad');
        add(carLights, x + sx * .48, .61, z - 1.61, .27, .15, .035, '#ca6558');
      }
    }
    for (let i = 0; i < 44; i++) {
      const side = i % 2 ? -1 : 1, x = side * 5.45, z = 8 - Math.floor(i / 2) * 25;
      add(planters, x, .20, z, .52, .4, 2.2, '#e2c9a8');
      add(foliage, x, .48, z, .53, .40, 2.0, '#6e976d');
      for (let j = -2; j <= 2; j++) add(flowers, x + (j % 2) * .09, .72, z + j * .35, .15, .15, .15, j % 2 ? '#f3c764' : '#e58b88');
    }
    this.batch(geometry, cars); this.batch(geometry, carGlass); this.batch(geometry, wheels); this.batch(geometry, carLights);
    this.batch(geometry, planters); this.batch(new T.IcosahedronGeometry(1, 0), foliage); this.batch(new T.IcosahedronGeometry(1, 0), flowers);

    const bodies = [], heads = [], legs = [], bags = [];
    for (let i = 0; i < 56; i++) {
      const side = i % 2 ? -1 : 1;
      const x = side * (i % 4 ? 6.15 : 9.9), z = 34 - i * 9.7;
      const motion = { walk: side * (.5 + i % 3 * .17), phase: i * 2.1 };
      const shirt = ['#ba6b60', '#537e9f', '#e4b36b', '#73885d', '#a09cb8', '#e0c9b3'][i % 6];
      add(bodies, x, 1.03, z, .40, .63, .27, shirt, motion);
      add(heads, x, 1.52, z, .24, .27, .24, ['#d8a27c', '#efc19e', '#bd8a69'][i % 3], motion);
      add(heads, x, 1.69, z - .015, .25, .13, .25, ['#58453b', '#453b38', '#987e5e'][i % 3], motion);
      for (const sign of [-1, 1]) add(legs, x + sign * .12, .43, z, .14, .66, .17, '#3b4b5a', { ...motion, leg: sign });
      add(bags, x + side * .30, .83, z + .02, .22, .35, .17, i % 3 ? '#d2af70' : '#c36e58', motion);
    }
    this.batch(geometry, bodies); this.batch(new T.IcosahedronGeometry(1, 0), heads); this.batch(geometry, legs); this.batch(geometry, bags);

    // Outdoor café tables and striped festival bunting fill the spaces above/beside the route.
    const parasols = [], poles = [], tables = [], chairs = [], ropes = [], bulbs = [];
    for (let i = 0; i < 12; i++) {
      const z = 2 - i * 45, x = -10.7 - (i % 2) * 1.2;
      add(parasols, x, 2.5, z, 1.25, .55, 1.25, i % 2 ? '#e0c58e' : '#b97362');
      add(poles, x, 1.35, z, .045, 2.6, .045, '#775d4c');
      add(tables, x, .80, z, 1.25, .10, 1.25, '#c2a47d');
      for (const sign of [-1, 1]) {
        add(chairs, x + sign * .88, .44, z, .46, .11, .46, '#526d69');
        add(chairs, x + sign * 1.03, .75, z, .09, .54, .46, '#526d69');
      }
    }
    for (let i = 0; i < 13; i++) {
      const z = -9 - i * 43;
      add(ropes, 0, 6.3, z, 12, .028, .028, '#49656b');
      for (let j = -5; j <= 5; j++) add(bulbs, j * 1.05, 6.0 + Math.abs(j) * .035, z, .14, .20, .14, j % 2 ? '#ffc777' : '#f2dfa8');
    }
    this.batch(new T.ConeGeometry(1, 1, 8), parasols); this.batch(geometry, poles); this.batch(geometry, tables); this.batch(geometry, chairs); this.batch(geometry, ropes);
    this.batch(new T.SphereGeometry(1, 6, 4), bulbs, this.material('#ffffff', true));
  }

  buildPromenade() {
    this.box(80, .35, 350, '#739386', 47, -.15, -110);
    this.box(26, .35, 350, '#a7b0a1', -20, -.15, -110);
    this.box(3.1, .18, 350, '#d6ccb6', -7, .005, -110);
    this.box(3.1, .18, 350, '#d6ccb6', 7, .005, -110);
    this.box(2.4, .16, 350, '#e1d1b5', -31.5, -.04, -110);
    this.box(.22, .22, 350, '#e7d9bd', -33, -.12, -110);
    this.box(40, 1.2, 350, '#637e76', -121, -.7, -110);

    const waterGeo = new T.PlaneGeometry(68, 350, 12, 60).rotateX(-Math.PI / 2);
    const waterMat = new T.MeshStandardMaterial({ color: '#438997', roughness: .32, metalness: .22 });
    waterMat.onBeforeCompile = shader => {
      shader.uniforms.omskTime = this.waterTime;
      shader.vertexShader = 'uniform float omskTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        transformed.y += sin(position.z * 1.3 + omskTime * 1.7) * .05
          + sin(position.x * 2.4 + position.z * .4 + omskTime) * .025;
      `);
    };
    waterMat.customProgramCacheKey = () => 'omsk-river';
    const river = new T.Mesh(waterGeo, waterMat);
    river.position.set(-67, -.65, -110);
    this.group.add(river);

    const paving = [], posts = [], lamps = [], lights = [], trunks = [], crowns = [], waterLines = [];
    for (let z = 38; z > -260; z -= 3.5) {
      for (const side of [-1, 1]) paving.push([side * 7, .102, z]);
      posts.push([-32.6, .45, z]);
    }
    this.instanced(geometry, this.material('#b6aa92'), paving, [2.8, .012, .035]);
    this.instanced(geometry, this.material('#425f61'), posts, [.07, 1.05, .07]);
    for (const y of [.45, .88]) this.box(.07, .065, 350, '#425f61', -32.6, y, -110);

    for (let z = 36, index = 0; z > -260; z -= 18, index++) {
      for (const side of [-1, 1]) {
        lamps.push([side * 5.9, 2.35, z]);
        lights.push([side * 5.9, 4.78, z]);
      }
      if (index % 2) waterLines.push([-40 - (index % 4) * 12, -.57, z]);
    }
    this.instanced(geometry, this.material('#405761'), lamps, [.085, 4.6, .085]);
    this.instanced(geometry, this.material('#ffe5ac', true), lights, [.4, .23, .4]);
    this.instanced(geometry, this.material('#83b5b7'), waterLines, [7.4, .012, .045]);
    for (let z = 42, index = 0; z > -260; z -= 14, index++) {
      for (const side of [-1, 1]) {
        const x = side * (index % 3 ? 8.3 : 30);
        trunks.push([x, 1, z]);
        crowns.push([x, 2.9 + (index % 3) * .2, z]);
      }
    }
    this.instanced(new T.CylinderGeometry(.16, .21, 1, 5), this.material('#836653'), trunks, [1, 2, 1]);
    this.instanced(new T.IcosahedronGeometry(1, 0), this.material('#5b8a72'), crowns, [1.2, 1.6, 1.2]);
    this.instanced(new T.IcosahedronGeometry(1, 0), this.material('#8da875'), crowns.map(([x, y, z]) => [x + .38, y + .65, z + .1]), [.85, 1.1, .9]);

    for (let i = 0; i < 9; i++) {
      const bench = new T.Group();
      this.box(2.1, .14, .65, '#b58d65', 0, .55, 0, bench);
      this.box(2.1, .50, .12, '#b58d65', 0, .93, -.29, bench);
      for (const x of [-.8, .8]) this.box(.10, .55, .5, '#42585b', x, .26, 0, bench);
      bench.position.set(-29, 0, 0);
      bench.rotation.y = Math.PI / 2;
      this.group.add(bench);
      this.landmarks.push({ group: bench, z: 24 - i * 36 });
    }
    const welcome = this.sign('ОМСК', 'ДЕДЛАЙН ПОДОЖДЁТ', 6.3, 1.8);
    welcome.position.x = 11.5;
    this.group.add(welcome);
    this.landmarks.push({ group: welcome, z: -14 });
  }

  sign(title, subtitle = 'ОМСК · НАБЕРЕЖНАЯ', width = 4.6, height = .86) {
    const group = new T.Group();
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#21434b'; ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#e4ddbb'; ctx.lineWidth = 7; ctx.strokeRect(9, 9, 1006, 238);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#eff0d8'; ctx.font = '800 68px system-ui'; ctx.fillText(title, 512, 100, 948);
    ctx.fillStyle = '#c9e494'; ctx.font = '700 28px system-ui'; ctx.fillText(subtitle, 512, 190, 948);
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
    const panel = new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide }));
    panel.position.y = height / 2 + 1.5; group.add(panel);
    for (const x of [-width * .35, width * .35]) this.box(.065, 1.9, .065, '#405961', x, .9, 0, group);
    return group;
  }

  async loadModels() {
    // Two workers bound decoding/upload spikes on phones. No external CDN is used.
    const draco = new DRACOLoader().setDecoderPath(new URL('./vendor/draco/', import.meta.url).href).setWorkerLimit(2);
    const loader = new GLTFLoader().setDRACOLoader(draco);
    let next = 0;
    const worker = async () => {
      while (next < OMSK_MODELS.length) {
        const spec = OMSK_MODELS[next++];
        try {
          const gltf = await loader.loadAsync(new URL(`./models/${spec.id}.glb`, import.meta.url).href);
          this.addModel(spec, gltf);
        } catch (error) {
          this.errors.push(spec.id);
          console.warn(`Не загрузилась модель Омска: ${spec.id}`, error);
        }
        this.loaded++;
        this.onProgress();
      }
    };
    await Promise.all([worker(), worker()]);
    draco.dispose();
    this.loading = false;
    this.onProgress();
    return this;
  }

  addModel(spec, gltf) {
    const group = new T.Group();
    group.name = `omsk:${spec.id}`;
    const content = new T.Group();
    content.add(gltf.scene);
    content.rotation.y = (spec.turn || 0) * Math.PI;
    content.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(content);
    const size = bounds.getSize(new T.Vector3());
    const center = bounds.getCenter(new T.Vector3());
    const scale = Math.min(spec.width / size.x, spec.depth / size.z, spec.height / size.y);
    content.position.set(-center.x, -bounds.min.y, -center.z);
    group.add(content); group.scale.setScalar(scale);
    group.position.set(spec.x, spec.water ? -.63 : .05, loopZ(spec.z, this.previousDistance < 0 ? 0 : this.previousDistance));
    group.userData.modelId = spec.id;
    group.userData.size = size.multiplyScalar(scale).toArray();
    group.userData.sourceSize = bounds.getSize(new T.Vector3()).toArray();
    const animatedFrames = [];
    gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = false;
      object.receiveShadow = false;
      // The source flag contains 25 mutually exclusive STEP frames.
      if (/^flag\d+$/.test(object.name)) animatedFrames.push(object);
    });
    let mixer;
    if (gltf.animations.length) {
      mixer = new T.AnimationMixer(gltf.scene);
      gltf.animations.forEach(clip => mixer.clipAction(clip).play());
    }
    this.group.add(group);
    const entry = { group, z: spec.z, spec, mixer, animatedFrames };
    this.landmarks.push(entry);
    if (!spec.water && spec.id !== 'russiaflagstep_a') {
      const label = this.sign(spec.name);
      label.position.x = Math.sign(spec.x) * 8.8;
      label.quaternion.setFromAxisAngle(up, Math.sign(spec.x) * -.12);
      this.group.add(label);
      this.landmarks.push({ group: label, z: spec.z + Math.min(12, group.userData.size[2] / 2 + 2) });
    }
    if (spec.water) {
      const wake = new T.Group();
      for (const side of [-1, 1]) {
        const trail = this.box(.15, .012, 9, '#a3c8c4', side * 1.15, 0, 16, wake);
        trail.rotation.y = side * -.16;
      }
      this.group.add(wake);
      entry.wake = wake;
    }
    // Update placement immediately even if a model finishes during a live run.
    this.previousDistance = -1;
  }

  update(distance, time, dt) {
    this.waterTime.value = time;
    const moved = distance !== this.previousDistance;
    for (const entry of this.landmarks) {
      const boat = entry.spec?.water;
      if (moved || boat) entry.group.position.z = loopZ(entry.z, distance + (boat ? time * 1.1 : 0));
      const z = entry.group.position.z;
      entry.group.visible = z > -225 && z < (boat ? 48 : 43);
      if (boat) {
        entry.group.position.y = -.63 + Math.sin(time * 1.7) * .045;
        entry.group.rotation.z = Math.sin(time * 1.3) * .012;
        entry.wake.position.set(entry.spec.x, -.565, z);
        entry.wake.visible = entry.group.visible;
      }
      if (entry.mixer && entry.group.visible) {
        entry.mixer.update(dt);
        entry.animatedFrames.forEach(mesh => mesh.visible = mesh.scale.lengthSq() > .01);
      }
    }
    if (moved) {
      const dummy = new T.Object3D();
      for (const { mesh, entries, scale } of this.repeaters) {
        entries.forEach(([x, y, z], index) => {
          // Street furniture repeats on a shorter seamless segment than the landmarks.
          dummy.position.set(x, y, loopZ(z, distance, 306, 46));
          dummy.scale.set(...scale); dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    }
    const dummy = new T.Object3D();
    for (const { mesh, entries, animated } of this.lifeBatches) {
      if (!moved && !animated) continue;
      entries.forEach((e, index) => {
        const z = loopZ(e.z, distance + time * (e.walk || 0));
        const visible = z > -225 && z < 43;
        dummy.position.set(e.x, e.y + (e.walk ? Math.abs(Math.sin(time * 7 + e.phase)) * .025 : 0), z);
        dummy.scale.set(visible ? e.sx : 0, e.sy, e.sz);
        dummy.rotation.set(e.leg ? Math.sin(time * 7 + e.phase) * .5 * e.leg : 0, 0, 0);
        dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    this.previousDistance = distance;
  }
}
