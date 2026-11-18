import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { Box3, Vector3, Matrix4, Quaternion } from '../three.module.js';
import { OMSK_MODELS, ROUTE_LENGTH, ROUTE_FRONT, loopZ } from '../omsk-layout.js';

function model(id) {
  const file = readFileSync(new URL(`../models/${id}.glb`, import.meta.url));
  assert.equal(file.toString('ascii', 0, 4), 'glTF');
  assert.equal(file.readUInt32LE(4), 2);
  assert.equal(file.readUInt32LE(8), file.length);
  return JSON.parse(file.toString('utf8', 20, 20 + file.readUInt32LE(12)));
}

function sourceBounds(gltf, turn) {
  const result = new Box3();
  function visit(index, parent) {
    const node = gltf.nodes[index];
    if (node.scale?.every(v => v === 0)) return;
    const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
      new Vector3(...(node.translation || [0, 0, 0])),
      new Quaternion(...(node.rotation || [0, 0, 0, 1])),
      new Vector3(...(node.scale || [1, 1, 1])),
    );
    const matrix = parent.clone().multiply(local);
    if (node.mesh !== undefined) for (const primitive of gltf.meshes[node.mesh].primitives) {
      const bounds = gltf.accessors[primitive.attributes.POSITION];
      result.union(new Box3(new Vector3(...bounds.min), new Vector3(...bounds.max)).applyMatrix4(matrix));
    }
    for (const child of node.children || []) visit(child, matrix);
  }
  for (const root of gltf.scenes[gltf.scene || 0].nodes) visit(root, new Matrix4().makeRotationY((turn || 0) * Math.PI));
  return result;
}

test('all sixteen supplied GLB models and their embedded textures are packaged', () => {
  const files = readdirSync(new URL('../models/', import.meta.url)).filter(f => f.endsWith('.glb'));
  assert.equal(files.length, 16);
  assert.equal(new Set(OMSK_MODELS.map(s => s.id)).size, 16);
  assert.deepEqual(files.sort(), OMSK_MODELS.map(s => `${s.id}.glb`).sort());
  for (const spec of OMSK_MODELS) {
    const gltf = model(spec.id);
    assert.ok(gltf.images.length > 0, `${spec.id} has textures`);
    assert.ok(gltf.images.every(image => image.bufferView !== undefined && !image.uri), `${spec.id} is self-contained`);
    assert.ok(gltf.extensionsRequired.includes('KHR_draco_mesh_compression'));
  }
});

test('normalized landmarks leave all three running lanes clear and the boat stays on the river', () => {
  for (const spec of OMSK_MODELS) {
    const size = sourceBounds(model(spec.id), spec.turn).getSize(new Vector3());
    const factor = Math.min(spec.width / size.x, spec.depth / size.z, spec.height / size.y);
    size.multiplyScalar(factor);
    assert.ok(size.toArray().every(v => v > 0 && Number.isFinite(v)), spec.id);
    assert.ok(Math.abs(spec.x) - size.x / 2 >= 5.5, `${spec.id} intrudes into the route`);
    if (spec.water) assert.ok(spec.x + size.x / 2 < -33, 'boat is entirely on water');
  }
});

test('a long run visits every landmark and wraps behind the camera without spacing drift', () => {
  const visited = new Set();
  for (let distance = 0; distance < ROUTE_LENGTH * 4; distance += 3.7) {
    for (const spec of OMSK_MODELS) {
      const z = loopZ(spec.z, distance);
      assert.ok(z <= ROUTE_FRONT && z > ROUTE_FRONT - ROUTE_LENGTH);
      assert.ok(Math.abs(z - loopZ(spec.z, distance + ROUTE_LENGTH * 100)) < 1e-8);
      if (z > -100 && z < -15) visited.add(spec.id);
    }
  }
  assert.equal(visited.size, 16);
  assert.ok(loopZ(-42, 89) > 9, 'last visible position is behind the camera');
  assert.ok(loopZ(-42, 91) < -210, 'recycled position is beyond the fog');
});

test('the supplied flag retains its stepped animation and mutually exclusive frame meshes', () => {
  const gltf = model('russiaflagstep_a');
  assert.equal(gltf.animations.length, 1);
  assert.ok(gltf.animations[0].samplers.every(s => s.interpolation === 'STEP'));
  assert.equal(gltf.nodes.filter(n => /^flag\d+$/.test(n.name)).length, 25);
  assert.equal(gltf.nodes.filter(n => /^flag\d+$/.test(n.name) && !n.scale?.every(v => v === 0)).length, 1);
});
