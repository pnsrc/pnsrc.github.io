import * as T from './three.module.js';

// A paper puppet rig over the supplied photograph. The original face remains the
// base texture; independent eyes, brows and a hinged lower jaw animate at 9 fps.
export function createKarina(texture, materials) {
  const group = new T.Group();
  const torso = new T.Group();
  group.add(torso);
  function mesh(geometry, material, parent, x, y, z) {
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  const sphere = (r, mat, p, x, y, z, scale) => {
    const m = mesh(new T.SphereGeometry(r, 24, 18), mat, p, x, y, z);
    if (scale) m.scale.set(...scale);
    return m;
  };
  sphere(.62, materials.jacket, torso, 0, 1.52, 0, [1, 1.13, .7]);
  for (let i = 0; i < 5; i++) {
    const ring = mesh(new T.TorusGeometry(.57, .027, 8, 32), materials.seam, torso, 0, 1.12 + i * .19, 0);
    ring.rotation.x = Math.PI / 2;
    ring.scale.y = .73;
  }
  mesh(new T.BoxGeometry(.025, .97, .035), materials.zip, torso, 0, 1.53, .44);
  sphere(.16, materials.skin, torso, 0, 2.22, 0);
  const head = new T.Group();
  head.position.set(0, 2.85, 0);
  torso.add(head);
  sphere(.55, materials.hair, head, .06, .01, -.08, [1.12, 1.2, .94]);
  const photoGeo = new T.PlaneGeometry(1.52, 1.48, 32, 28);
  const vertices = photoGeo.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i);
    vertices.setZ(i, .62 - .37 * x * x - .1 * y * y);
  }
  photoGeo.computeVertexNormals();
  const photoMat = new T.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .12, side: T.DoubleSide });
  const photo = mesh(photoGeo, photoMat, head, .17, 0, 0);
  photo.castShadow = false;

  const ink = new T.MeshBasicMaterial({ color: '#241b20' });
  const white = new T.MeshBasicMaterial({ color: '#fffcf0' });
  const pink = new T.MeshBasicMaterial({ color: '#f4979b' });
  const red = new T.MeshBasicMaterial({ color: '#f37664', transparent: true, opacity: .45 });
  function oval(rx, ry, material, parent, x, y, z) {
    const m = mesh(new T.CircleGeometry(1, 32), material, parent, x, y, z);
    m.scale.set(rx, ry, 1);
    m.castShadow = false;
    return m;
  }
  const eyes = [];
  for (const [x, y, angle] of [[-.15, .044, .1], [.117, -.005, -.1]]) {
    const eye = new T.Group();
    eye.position.set(x, y, .69);
    eye.rotation.z = angle;
    head.add(eye);
    oval(.145, .11, ink, eye, 0, 0, 0);
    const whites = oval(.13, .098, white, eye, 0, 0, .003);
    const pupil = oval(.029, .042, ink, eye, -.02, 0, .008);
    const lid = mesh(new T.PlaneGeometry(.27, .035), ink, eye, 0, .13, .009);
    const cross = new T.Group();
    eye.add(cross);
    for (let dir of [-1, 1]) {
      const stroke = mesh(new T.PlaneGeometry(.11, .024), ink, cross, 0, 0, .012);
      stroke.rotation.z = dir * .8;
    }
    const tear = oval(.035, .09, new T.MeshBasicMaterial({ color: '#9bd7e6' }), eye, .055, -.16, .014);
    eyes.push({ eye, pupil, whites, lid, cross, tear });
  }
  const mouthGroup = new T.Group();
  mouthGroup.position.set(-.05, -.32, .74);
  mouthGroup.rotation.z = -.045;
  head.add(mouthGroup);
  const mouth = oval(.17, .08, ink, mouthGroup, 0, 0, 0);
  const teeth = mesh(new T.PlaneGeometry(.255, .038), white, mouthGroup, 0, .04, .004);
  const tongue = oval(.065, .024, pink, mouthGroup, .025, -.05, .007);
  const jawGeo = new T.PlaneGeometry(.56, .28, 10, 6);
  const uvs = jawGeo.attributes.uv;
  for (let i = 0; i < uvs.count; i++) {
    uvs.setXY(i, .355 + (uvs.getX(i) - .5) * (.56 / 1.52), .17 + (uvs.getY(i) - .5) * (.28 / 1.48));
  }
  const jawMat = new T.ShaderMaterial({
    uniforms: { photo: { value: texture } }, transparent: true,
    vertexShader: `varying vec2 vUv; varying vec2 localUv; void main(){vUv=uv;localUv=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D photo;varying vec2 vUv;varying vec2 localUv;void main(){vec2 p=localUv/vec2(.28,.14);float edge=1.-smoothstep(.85,1.,length(p));vec4 c=texture2D(photo,vUv);gl_FragColor=vec4(c.rgb,c.a*edge);#include <colorspace_fragment>\n}`.replace(';#include', ';\n#include')
  });
  const jaw = mesh(jawGeo, jawMat, head, -.05, -.49, .73);
  jaw.castShadow = false;
  const cheeks = [-.30, .28].map(x => oval(.11, .058, red, head, x, -.20, .70));
  const limbs = [];
  for (const side of [-1, 1]) {
    const arm = new T.Group();
    arm.position.set(side * .61, 1.9, 0);
    torso.add(arm);
    sphere(.2, materials.jacket, arm, 0, -.31, 0, [1, 2.1, 1]);
    sphere(.14, materials.skin, arm, 0, -.72, .01);
    const leg = new T.Group();
    leg.position.set(side * .27, 1.05, 0);
    torso.add(leg);
    mesh(new T.BoxGeometry(.33, .78, .35), materials.jeans, leg, 0, -.37, 0);
    mesh(new T.BoxGeometry(.38, .23, .64), materials.shoes, leg, 0, -.82, .12);
    limbs.push({ arm, leg, side });
  }
  const aura = new T.Mesh(new T.SphereGeometry(1, 24, 16), new T.MeshBasicMaterial({ color: '#edff76', transparent: true, opacity: .12, wireframe: true }));
  aura.scale.set(1.1, 1.8, 1.0);
  aura.position.y = 1.8;
  group.add(aura);
  const moods = {
    neutral: { eye: .84, brow: 0, mouth: .03 },
    smug: { eye: .57, brow: -.18, mouth: .07 },
    happy: { eye: .5, brow: -.12, mouth: .11 },
    panic: { eye: 1.5, brow: .42, mouth: .22 },
    angry: { eye: .74, brow: -.48, mouth: .10 },
    spicy: { eye: 1.15, brow: .25, mouth: .20 },
    dead: { eye: .9, brow: 0, mouth: .07 }
  };
  let lastTick = -1;
  return {
    group, head,
    update(time, dt, { playing, mood = 'neutral', speaking = false, reaction = false, jump = 0, slide = false, power = false, lean = 0, menu = false }) {
      const tick = Math.floor(time * 9);
      const stepTime = tick / 9;
      const desiredTurn = menu ? .08 : reaction ? 0 : Math.PI;
      // Head turns independently to look back at the player while the body runs.
      torso.rotation.y = menu ? .08 : Math.PI;
      const headTarget = desiredTurn - torso.rotation.y;
      head.rotation.y += (headTarget - head.rotation.y) * Math.min(1, dt * 12);
      if (tick !== lastTick) {
        lastTick = tick;
        const current = moods[mood] || moods.neutral;
        const blink = (stepTime % 3.7) < .12;
        const open = speaking ? [.05, .20, .09, .25, .02][tick % 5] : current.mouth;
        for (const [i, e] of eyes.entries()) {
          e.eye.visible = mood !== 'neutral' || blink;
          e.eye.scale.y = blink ? .08 : current.eye;
          e.pupil.position.x = (i ? -.018 : -.01) + (mood === 'panic' ? Math.sin(tick * 3) * .026 : 0);
          e.pupil.scale.y = mood === 'happy' ? .025 : .042;
          e.lid.rotation.z = (i ? -1 : 1) * current.brow;
          e.cross.visible = mood === 'dead';
          e.pupil.visible = mood !== 'dead';
          e.tear.visible = mood === 'spicy';
          e.tear.position.y = -.14 - (tick % 3) * .025;
        }
        mouthGroup.visible = mood !== 'neutral' || speaking;
        mouth.scale.y = open;
        teeth.visible = mood !== 'panic' && mood !== 'dead';
        teeth.position.y = open * .55;
        tongue.position.y = -open * .6;
        jaw.visible = speaking || mood === 'panic' || mood === 'spicy';
        jaw.position.y = -.49 - (speaking ? open * .42 : open * .2);
        head.rotation.z = speaking ? (tick % 2 ? -.075 : .045) : mood === 'dead' ? -.20 : Math.sin(stepTime * 2) * .025;
        head.position.y = 2.85 + (speaking && tick % 2 ? .035 : 0);
        cheeks.forEach(c => c.visible = mood === 'spicy' || mood === 'happy');
      }
      for (const { side, arm, leg } of limbs) {
        const run = playing ? Math.sin(time * (power ? 17 : 12)) * .65 * side : Math.sin(time * 2) * .045;
        leg.rotation.x = jump ? -.35 * side : run;
        arm.rotation.x = -run;
        arm.rotation.z = power ? side * -.45 : menu && side === -1 ? -.15 : 0;
      }
      group.rotation.z = lean;
      torso.scale.y += ((slide ? .43 : 1) - torso.scale.y) * Math.min(1, dt * 20);
      torso.position.y = playing && !jump && !slide ? Math.abs(Math.sin(time * 12)) * .035 : 0;
      aura.visible = power;
      aura.rotation.y = time * 2;
      aura.material.opacity = .10 + Math.sin(time * 10) * .04;
    }
  };
}
