import * as T from './three.module.js';

// A paper puppet rig over the supplied photograph. The original face remains the
// base texture; independent eyes, brows and a hinged lower jaw animate at 9 fps.
export function createKarina(texture, materials, skin) {
  const layout = skin.face;
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
  sphere(.62, materials.jacket, torso, 0, 1.52, 0, [1, skin.outfit === 'blazer' ? 1.35 : 1.13, .7]);
  if (skin.outfit === 'puffer') for (let i = 0; i < 5; i++) {
    const ring = mesh(new T.TorusGeometry(.57, .027, 8, 32), materials.seam, torso, 0, 1.12 + i * .19, 0);
    ring.rotation.x = Math.PI / 2;
    ring.scale.y = .73;
  }
  if (skin.outfit === 'puffer') {
    mesh(new T.BoxGeometry(.025, .97, .035), materials.zip, torso, 0, 1.53, .44);
  } else if (skin.outfit === 'hoodie') {
    // Hoodie: a soft hood, front pocket and two loose drawstrings.
    const hood = mesh(new T.TorusGeometry(.28, .115, 10, 28), materials.seam, torso, 0, 2.05, -.12);
    hood.scale.set(1.4, 1.0, 1);
    sphere(.29, materials.jacket, torso, 0, 1.25, .37, [1.25, .45, .5]);
    for (const side of [-1, 1]) {
      const string = mesh(new T.CylinderGeometry(.013, .013, .45, 8), materials.zip, torso, side * .13, 1.88, .43);
      string.rotation.z = side * .15;
      sphere(.024, materials.zip, torso, side * .16, 1.65, .43);
    }
  }
  if (skin.outfit === 'blazer') {
    const shirt = new T.MeshStandardMaterial({ color: '#505344', roughness: 1 });
    mesh(new T.PlaneGeometry(.49, .87), shirt, torso, 0, 1.78, .447);
    // Pointed lapels keep the plaid jacket distinct from the other two outfits.
    for (const side of [-1, 1]) {
      const shape = new T.Shape();
      shape.moveTo(side * .44, 2.13);
      shape.lineTo(side * .20, 2.16);
      shape.lineTo(side * .03, 1.27);
      shape.lineTo(side * .40, 1.78);
      shape.lineTo(side * .27, 1.91);
      shape.closePath();
      const lapel = mesh(new T.ExtrudeGeometry(shape, { depth: .023, bevelEnabled: false }), materials.jacket, torso, 0, 0, .46);
      lapel.castShadow = false;
      mesh(new T.BoxGeometry(.27, .035, .03), materials.seam, torso, side * .35, 1.18, .43);
    }
    sphere(.048, materials.seam, torso, .07, 1.17, .49, [1, 1, .35]);
  }
  sphere(.16, materials.skin, torso, 0, 2.22, 0);
  const head = new T.Group();
  head.position.set(0, 2.85, 0);
  torso.add(head);
  if (skin.outfit !== 'puffer') {
    sphere(.55, materials.hair, head, -.02, .01, .16, [.94, 1.13, .56]);
  } else {
    sphere(.55, materials.hair, head, .06, .01, -.08, [1.12, 1.2, .94]);
  }
  if (skin.outfit === 'blazer') sphere(.22, materials.hair, head, 0, -.02, -.27, [1, 1, 1]);
  const photoGeo = new T.PlaneGeometry(1.52, 1.48, 32, 28);
  const vertices = photoGeo.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i);
    vertices.setZ(i, .62 - .37 * x * x - .1 * y * y);
  }
  photoGeo.computeVertexNormals();
  const photoMat = new T.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .12, side: T.DoubleSide });
  const photo = mesh(photoGeo, photoMat, head, layout.offsetX, 0, 0);
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
  for (const [x, y, angle] of layout.eyes) {
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
  mouthGroup.position.set(layout.mouth[0], layout.mouth[1], .74);
  mouthGroup.rotation.z = layout.mouth[2];
  head.add(mouthGroup);
  const mouth = oval(.17, .08, ink, mouthGroup, 0, 0, 0);
  const teeth = mesh(new T.PlaneGeometry(.255, .038), white, mouthGroup, 0, .04, .004);
  const tongue = oval(.065, .024, pink, mouthGroup, .025, -.05, .007);
  const jawGeo = new T.PlaneGeometry(.56, .28, 10, 6);
  const uvs = jawGeo.attributes.uv;
  for (let i = 0; i < uvs.count; i++) {
    uvs.setXY(i, layout.jawUv[0] + (uvs.getX(i) - .5) * (.56 / 1.52), layout.jawUv[1] + (uvs.getY(i) - .5) * (.28 / 1.48));
  }
  const jawMat = new T.ShaderMaterial({
    uniforms: { photo: { value: texture } }, transparent: true,
    vertexShader: `varying vec2 vUv; varying vec2 localUv; void main(){vUv=uv;localUv=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D photo;varying vec2 vUv;varying vec2 localUv;void main(){vec2 p=localUv/vec2(.28,.14);float edge=1.-smoothstep(.85,1.,length(p));vec4 c=texture2D(photo,vUv);gl_FragColor=vec4(c.rgb,c.a*edge);#include <colorspace_fragment>\n}`.replace(';#include', ';\n#include')
  });
  const jaw = mesh(jawGeo, jawMat, head, layout.jaw[0], layout.jaw[1], .73);
  jaw.castShadow = false;
  const cheeks = layout.cheeks.map(x => oval(.11, .058, red, head, x, layout.cheekY, .70));
  if (skin.outfit === 'hoodie') {
    // Longer wavy locks remain attached to the head during comic turn-backs.
    for (const side of [-1, 1]) for (let strand = 0; strand < 3; strand++) {
      const x = side * (.48 + strand * .025);
      const curve = new T.CatmullRomCurve3([
        new T.Vector3(x, .15, -.16), new T.Vector3(x + side * .07, -.42, -.06),
        new T.Vector3(x - side * .035, -.92, .06 + strand * .04),
        new T.Vector3(x + side * .04, -1.42 + strand * .10, .12)
      ]);
      mesh(new T.TubeGeometry(curve, 20, .095 - strand * .012, 7, false), materials.hair, head, 0, 0, 0);
    }
  }
  const limbs = [];
  for (const side of [-1, 1]) {
    const arm = new T.Group();
    arm.position.set(side * .61, 1.9, 0);
    torso.add(arm);
    sphere(.2, materials.jacket, arm, 0, -.31, 0, [1, 2.1, 1]);
    sphere(.14, materials.skin, arm, 0, -.72, .01);
    if (skin.outfit === 'hoodie' && side === 1) {
      for (const [index, color] of ['#efad3b', '#63bd74', '#e79553'].entries()) {
        const band = mesh(new T.TorusGeometry(.142, .025, 7, 18), new T.MeshStandardMaterial({ color }), arm, 0, -.62 - index * .045, .01);
        band.rotation.x = Math.PI / 2;
      }
    }
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
    update(time, dt, { playing, mood = 'neutral', speaking = false, reaction = false, meme = false, jump = 0, slide = false, power = false, lean = 0, menu = false }) {
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
        jaw.position.y = layout.jaw[1] - (speaking ? open * .42 : open * .2);
        head.rotation.z = speaking ? (tick % 2 ? -.075 : .045) : mood === 'dead' ? -.20 : Math.sin(stepTime * 2) * .025;
        head.position.y = 2.85 + (speaking && tick % 2 ? .035 : 0);
        cheeks.forEach(c => c.visible = mood === 'spicy' || mood === 'happy');
      }
      for (const { side, arm, leg } of limbs) {
        const run = playing ? Math.sin(time * (power ? 17 : 12)) * .65 * side : Math.sin(time * 2) * .045;
        leg.rotation.x = jump ? -.35 * side : run;
        arm.rotation.x = -run;
        arm.rotation.z = power ? side * -.45 : menu && side === -1 ? -.15 : 0;
        if (meme) {
          const alternate = Math.sin(Math.floor(time * 9) / 9 * 7) * side;
          arm.rotation.x = -1.35 + alternate * .35;
          arm.rotation.z = side * (.85 + alternate * .3);
        }
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
