const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { run } = require('./harness.cjs');

run(async ({ page, artifacts, openMenuAction, click, close, load }) => {
  const folder = path.join(artifacts, 'model-formats'); fs.mkdirSync(folder, { recursive: true });
  const obj = 'mtllib triangle.mtl\no Triangle\nv 0 0 0\nv 1 0 0\nv 0 1 0\nvt 0 0\nvt 1 0\nvt 0 1\nusemtl red\nf 1/1 2/2 3/3\n';
  fs.writeFileSync(path.join(folder, 'triangle.obj'), obj);
  fs.writeFileSync(path.join(folder, 'triangle.mtl'), 'newmtl red\nKd 1 0.2 0.1\nmap_Kd textures/pixel.png\n');
  const png = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 2, 2); return canvas.toDataURL().split(',')[1]; });
  fs.writeFileSync(path.join(folder, 'pixel.png'), Buffer.from(png, 'base64'));
  await openMenuAction('add-shortcut');
  await (await page.$('#local-file')).uploadFile(path.join(folder, 'triangle.obj'));
  await (await page.$('#local-resources')).uploadFile(path.join(folder, 'triangle.mtl'), path.join(folder, 'pixel.png'));
  await click('#import-local');
  await page.waitForFunction(() => __app.state.pendingLoads === 0);
  assert.equal(await page.$eval('#local-error', (e) => e.hidden), true, await page.$eval('#local-error', (e) => e.textContent));
  const imported = await page.evaluate(async (png) => {
    const { importLocalModel, loadCatalogModel } = await import('/src/models/importer.js');
    const triangle = 'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n';
    const stl = 'solid triangle\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid triangle';
    const ply = 'ply\nformat ascii 1.0\nelement vertex 3\nproperty float x\nproperty float y\nproperty float z\nelement face 1\nproperty list uchar int vertex_indices\nend_header\n0 0 0\n1 0 0\n0 1 0\n3 0 1 2\n';
    const fbx = '; FBX 7.4.0 project file\nFBXHeaderExtension:  {\n\tFBXHeaderVersion: 1003\n\tFBXVersion: 7400\n}\nObjects:  {\n\tGeometry: 1, "Geometry::Triangle", "Mesh" {\n\t\tVertices: *9 {\n\t\t\ta: 0,0,0,1,0,0,0,1,0\n\t\t}\n\t\tPolygonVertexIndex: *3 {\n\t\t\ta: 0,1,-3\n\t\t}\n\t}\n\tModel: 2, "Model::Triangle", "Mesh" {\n\t\tVersion: 232\n\t}\n}\nConnections:  {\n\tC: "OO",1,2\n\tC: "OO",2,0\n}\n';
    const binary = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const image = new File([Uint8Array.from(atob(png), (c) => c.charCodeAt(0))], 'pixel.png', { type: 'image/png' });
    const gltf = JSON.stringify({ asset: { version: '2.0', extras: { author: 'Fixture author' } }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }], materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }], textures: [{ source: 0 }], images: [{ uri: 'pixel.png' }], buffers: [{ uri: 'mesh.bin', byteLength: 36 }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }], accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] }] });
    const fixtures = [['obj', triangle, []], ['stl', stl, []], ['ply', ply, []], ['fbx', fbx, []], ['gltf', gltf, [new File([binary], 'mesh.bin'), image]]];
    const results = [];
    for (const [format, text, resources] of fixtures) {
      const { gltf, buffer } = await importLocalModel(new File([text], 'triangle.' + format), resources, __app.assets);
      __app.assets.validateLocalGLB(buffer);
      const item = __app.models.insertModel(gltf, { id: 'local-' + format, nombre: format, archivo: 'triangle.' + format, descripcion: 'Fixture', visualizacion: { tamano: 1.6, alturaEtiqueta: 1.85, rotacion: [0, 0, 0] } });
      item.localBuffer = buffer;
      results.push({ format, visible: item.radius > 0, author: __app.assets.localCredits(gltf)?.autor });
    }
    const binarySTL = new ArrayBuffer(134), view = new DataView(binarySTL);
    view.setUint32(80, 1, true);
    [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0].forEach((value, index) => view.setFloat32(84 + index * 4, value, true));
    const plyHeader = new TextEncoder().encode('ply\nformat binary_little_endian 1.0\nelement vertex 3\nproperty float x\nproperty float y\nproperty float z\nelement face 1\nproperty list uchar int vertex_indices\nend_header\n');
    const binaryPLY = new Uint8Array(plyHeader.length + 36 + 13); binaryPLY.set(plyHeader); binaryPLY.set(new Uint8Array(binary.buffer), plyHeader.length);
    const faces = new DataView(binaryPLY.buffer); faces.setUint8(plyHeader.length + 36, 3);
    [0, 1, 2].forEach((value, index) => faces.setInt32(plyHeader.length + 37 + index * 4, value, true));
    for (const [format, data] of [['stl', binarySTL], ['ply', binaryPLY]]) {
      const { gltf } = await importLocalModel(new File([data], 'binary.' + format), [], __app.assets);
      if (new __THREE.Box3().setFromObject(gltf.scene).isEmpty()) throw new Error('Empty binary ' + format);
      __app.assets.disposeResources(gltf.scene);
    }
    const fetchOriginal = window.fetch;
    try {
      for (const [format, text] of fixtures.filter(([format]) => format !== 'gltf')) {
        const url = location.origin + '/format-fixtures/triangle.' + format;
        window.fetch = async (requested, ...args) => requested === url ? new Response(text) : fetchOriginal(requested, ...args);
        const model = await loadCatalogModel(url, __app.models.loader, __app.assets);
        if (new __THREE.Box3().setFromObject(model.scene).isEmpty()) throw new Error('Empty catalog ' + format);
        __app.assets.disposeResources(model.scene);
      }
    } finally { window.fetch = fetchOriginal; }
    return results;
  }, png);
  assert.deepEqual(imported.map((item) => [item.format, item.visible]), ['obj', 'stl', 'ply', 'fbx', 'gltf'].map((format) => [format, true]));
  assert.equal(imported.find((item) => item.format === 'gltf').author, 'Fixture author');
  await close();
  const expected = await page.evaluate(() => __app.projects.capture());
  assert.equal(expected.assets.length, 6);
  const textureCount = await page.evaluate(() => { let count = 0; __app.state.entries.find((item) => item.definition.archivo === 'triangle.obj').mesh.traverse((node) => { if (node.material?.map) count++; }); return count; });
  assert.ok(textureCount > 0, 'OBJ retains its MTL texture');
  await page.evaluate(async () => { const data = __app.projects.capture(); await __app.projects.restore(data); });
  assert.deepEqual(await page.evaluate(() => __app.projects.capture()), expected, 'all formats survive project restore');
  const restoredTextures = await page.evaluate(() => { let count = 0; __app.state.entries.find((item) => item.definition.archivo === 'triangle.obj').mesh.traverse((node) => { if (node.material?.map?.image) count++; }); return count; });
  assert.equal(restoredTextures, textureCount);
  const failures = await page.evaluate(async () => {
    const { importLocalModel } = await import('/src/models/importer.js');
    const before = [...__app.state.entries], messages = [];
    for (const [name, text, resources] of [['missing.obj', 'mtllib missing.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3', []], ['empty.obj', '', []], ['model.xyz', 'invalid', []], ['bad.glb', 'invalid', []], ['texture.obj', 'mtllib texture.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3', [new File(['newmtl paint\nmap_Kd missing.png'], 'texture.mtl')]]]) {
      try { await importLocalModel(new File([text], name), resources, __app.assets); messages.push('accepted'); } catch (error) { messages.push(error.message); }
    }
    return { messages, preserved: before.every((item, index) => item === __app.state.entries[index]) };
  });
  assert.ok(failures.preserved); assert.ok(failures.messages.every((message) => message !== 'accepted'));
  await load();
  await page.evaluate(async (document) => __app.projects.restore(document), expected);
  assert.deepEqual(await page.evaluate(() => __app.projects.capture()), expected, 'integrated models reload without original files');
  console.log('PASS: OBJ + MTL + texture UI, glTF + BIN, FBX, STL, PLY, integrated project restore/reload and invalid/missing resource rejection.');
}).catch((error) => { console.error(error); process.exitCode = 1; });
