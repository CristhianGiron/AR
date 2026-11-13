import { XR_UNAVAILABLE, xrFailure, spatialPolicyAllowed } from './xr-availability.js';
import * as THREE from 'three';
import { $ } from '../ui/dom.js';
import { horizontalSurface } from './surface-pose.js';

/** Temporary WebXR placement; original scene objects and project files stay in lab space. */
export function createSpatialAR(app) {
  const renderer = app.engine.renderer, overlay = $('surface-overlay');
  let session = null, source = null, reference = null, pending = false, active = false, generation = 0;
  let arScene = null, camera = null, placement = null, content = null, reticle = null;
  let readyPose = false, placed = false, lastPoseAt = 0, scale = 1, yaw = 0, savedLoop = false;
  let hidden = [], previousFocus = null, pageHidden = false;
  const pose = new THREE.Matrix4();
  let availability = "unknown", supportRun = 0;
  function message(text) {
    for (const id of ['surface-message', 'surface-live']) if ($(id).textContent !== text) $(id).textContent = text;
  }
  function sync() {
    $('surface-start').disabled = pending || active || availability !== 'available';
    $('surface-check').disabled = pending || active || availability === 'checking';
    $('surface-cancel').hidden = !pending;
    $('surface-place').disabled = !active || !readyPose;
    $('surface-reposition').disabled = !active || !placed;
    for (const id of ['surface-smaller','surface-larger','surface-left','surface-right']) $(id).disabled = !placed;
    $('surface-size').textContent = Math.round(scale * 100) + '% · ' + yaw + '°';
  }
  function build() {
    const entries = $('surface-scope').value === 'selected' && app.state.chosen ? [app.state.chosen] : app.state.entries.filter((item) => item.anchor.visible);
    if (!entries.length) throw new Error('Añade un componente antes de colocarlo sobre una superficie.');
    arScene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(60, 1, .01, 30);
    arScene.add(new THREE.HemisphereLight(0xffffff, 0x657387, 3));
    const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(2, 4, 2); arScene.add(sun);
    placement = new THREE.Group(); content = new THREE.Group();
    const models = new THREE.Group(); content.add(models); placement.add(content); arScene.add(placement); placement.visible = false;
    for (const item of entries) {
      const anchor = new THREE.Group(); anchor.position.copy(item.anchor.position);
      anchor.add(item.mesh.clone(true)); models.add(anchor);
    }
    const bounds = new THREE.Box3().setFromObject(models), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    const largest = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(largest) || largest <= 0) throw new Error('No se pudo preparar la geometría para AR.');
    models.position.set(-center.x, -bounds.min.y, -center.z);
    content.userData.baseScale = .5 / largest; content.scale.setScalar(content.userData.baseScale);
    reticle = new THREE.Mesh(new THREE.RingGeometry(.055, .075, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7defff, side: THREE.DoubleSide, depthTest: true }));
    reticle.matrixAutoUpdate = false; reticle.visible = false; arScene.add(reticle);
    placed = readyPose = false; scale = 1; yaw = 0;
  }
  function dispose() {
    // Mesh clones share source geometry/materials. Only the guide owns resources here.
    reticle?.geometry.dispose(); reticle?.material.dispose();
    arScene?.clear(); arScene = camera = placement = content = reticle = null;
  }
  function isolateOverlay() {
    previousFocus = document.activeElement;
    hidden = [...document.body.children].filter((element) => element !== overlay && !['SCRIPT','STYLE'].includes(element.tagName)).map((element) => ({element,inert:element.inert}));
    hidden.forEach(({element}) => { element.inert = true; });
    document.body.classList.add('surface-active'); overlay.hidden = false;
    $('surface-exit').focus({preventScroll:true});
  }
  function referenceReset() { placed = readyPose = false; if (placement) placement.visible = false; sync(); message('El seguimiento cambió de origen. Busca de nuevo una superficie.'); }
  function cleanup(ownSession) {
    if (ownSession && session !== ownSession) return;
    generation++; try { source?.cancel(); } catch {} source = null;
    reference?.removeEventListener?.('reset', referenceReset); session?.removeEventListener('select', place);
    reference = null; session = null;
    renderer.setAnimationLoop(null); renderer.xr.enabled = false;
    active = pending = readyPose = placed = false;
    dispose(); overlay.hidden = true; document.body.classList.remove('surface-active');
    hidden.forEach(({element,inert}) => { element.inert = inert; }); hidden = [];
    sync();
    if (savedLoop && !document.hidden && !pageHidden) app.loop.start(); savedLoop = false;
    if (previousFocus?.isConnected && !previousFocus.closest('[hidden], [inert]')) previousFocus.focus({preventScroll:true});
    else $($('surfaces').open ? 'surface-start' : 'view-controls-toggle').focus({preventScroll:true});
    previousFocus = null;
  }
  function place() {
    if (!active || session?.visibilityState === 'hidden' || !readyPose || performance.now() - lastPoseAt > 500) return;
    pose.decompose(placement.position, placement.quaternion, placement.scale);
    placement.visible = true; placed = true; readyPose = false; reticle.visible = false;
    message('Colocado. Muévete para observarlo. Puedes girar, cambiar tamaño o buscar otro lugar.'); sync();
  }
  function frame(time, xrFrame) {
    if (!active || !xrFrame || !session) return;
    readyPose = false; reticle.visible = false;
    try {
      const tracked = session.visibilityState !== 'hidden' && !!xrFrame.getViewerPose(reference);
      placement.visible = placed && tracked;
      if (!tracked) message('Se perdió el seguimiento. Mueve el dispositivo despacio para recuperarlo.');
      else if (!placed) {
        const hit = xrFrame.getHitTestResults(source).find((result) => horizontalSurface(result.getPose(reference)?.transform.matrix));
        const matrix = hit?.getPose(reference)?.transform.matrix;
        if (matrix) {
          pose.fromArray(matrix); reticle.matrix.copy(pose); reticle.visible = readyPose = true; lastPoseAt = performance.now();
          message(session.domOverlayState ? 'Superficie horizontal encontrada. Pulsa Colocar o toca la pantalla.' : 'Superficie horizontal encontrada. Toca la pantalla para colocar.');
        } else message('Mueve el dispositivo despacio y apunta a una mesa o al suelo.');
      } else message('Colocado. Muévete para observarlo. Puedes girar, cambiar tamaño o buscar otro lugar.');
      sync(); renderer.render(arScene, camera);
    } catch {
      readyPose = false; placement.visible = reticle.visible = false; sync();
      message('No se pudo actualizar el seguimiento. Sal de AR y vuelve a intentarlo.');
    }
  }
  async function start() {
    if (pending || active) return;
    if (availability !== 'available') { await support(); return; }
    if (!spatialPolicyAllowed(document)) { availability = 'blocked'; sync(); message(xrFailure({name:'SecurityError'})); return; }
    if (!isSecureContext || !navigator.xr?.requestSession) { message('La detección de superficies necesita HTTPS y un navegador con WebXR AR. Puedes continuar en 3D o con cámara de fondo.'); return; }
    if (!app.state.startupReady || app.state.pendingLoads || app.state.catalogLoading || app.projects.busy) { message('Espera a que termine la carga antes de entrar en AR.'); return; }
    let candidate = null, preparedScene = null; const operation = ++generation; pending = true; sync();
    const check = () => { if (operation !== generation) throw new DOMException('Cancelado','AbortError'); };
    try {
      build(); preparedScene = arScene; app.camera.stop(); app.interactions.cancelGesture(); app.parts.stop(); app.experiment.stop();
      message('Solicitando AR al dispositivo…');
      // Keep the actual session request in the user activation event.
      candidate = await navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['local','hit-test'], optionalFeatures: ['dom-overlay'], domOverlay: {root: overlay} });
      check(); session = candidate;
      candidate.addEventListener('end', () => queueMicrotask(() => cleanup(candidate)), {once:true});
      renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local');
      savedLoop = app.loop.running; app.loop.stop();
      await renderer.xr.setSession(candidate); check();
      reference = renderer.xr.getReferenceSpace();
      reference?.addEventListener?.('reset', referenceReset);
      const viewer = await candidate.requestReferenceSpace('viewer'); check();
      const hitSource = await candidate.requestHitTestSource({space:viewer});
      if (operation !== generation) { hitSource.cancel(); check(); }
      source = hitSource; pending = false; active = true;
      app.hud.close(false); isolateOverlay(); sync();
      candidate.addEventListener('select', place);
      message(candidate.domOverlayState ? 'Mueve el dispositivo despacio y apunta a una mesa o al suelo.' : 'Apunta a una mesa y toca cuando aparezca el aro. Para salir usa el control del navegador.');
      renderer.setAnimationLoop(frame);
    } catch (error) {
      if (candidate) { try { await candidate.end(); } catch {} }
      const ownsState = operation === generation || arScene === preparedScene && (!session || session === candidate);
      if (!ownsState) return;
      cleanup();
      if (error.name === 'NotSupportedError' || /no runtimes supported|requested configuration/i.test(error.message || '')) availability = 'unavailable';
      sync(); message(xrFailure(error));
    }
  }
  async function end() {
    generation++;
    if (!session) { if (pending) message('Cancelando entrada. Espera a que el navegador cierre la solicitud.'); return; }
    const previous = session;
    try { await previous.end(); } catch { message('No se pudo salir de AR. Usa el control de salida del navegador.'); }
  }
  async function support() {
    if (pending || active) return;
    const check = ++supportRun;
    $('surface-scope').querySelector('[value="selected"]').disabled = !app.state.chosen;
    $('surface-scope').value = app.state.chosen ? 'selected' : 'visible';
    availability = 'checking'; sync(); message('Comprobando compatibilidad con AR espacial…');
    if (!isSecureContext || !navigator.xr?.isSessionSupported) {
      availability = 'unavailable'; sync();
      message(!isSecureContext ? 'Abre la dirección HTTPS del sitio para comprobar AR. La dirección HTTP de otro equipo no es un contexto seguro.' : XR_UNAVAILABLE); return;
    }
    if (!spatialPolicyAllowed(document)) { availability = 'blocked'; sync(); message(xrFailure({name:'SecurityError'})); return; }
    try {
      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      if (check !== supportRun) return;
      availability = supported ? 'available' : 'unavailable'; sync();
      message(supported ? 'El navegador admite sesiones AR. Al entrar se comprobará también la detección de superficies; mueve el dispositivo despacio.' : XR_UNAVAILABLE);
    } catch (error) { if (check !== supportRun) return; availability = 'unavailable'; sync(); message(xrFailure(error)); }
  }
  $('surface-check').onclick = support;
  $('surface-start').onclick = start; $('surface-cancel').onclick = end; $('surface-exit').onclick = end; $('surface-place').onclick = place;
  $('surface-reposition').onclick = () => { placed = false; readyPose = false; placement.visible = false; sync(); };
  const transform = () => { if (!content) return; content.scale.setScalar(content.userData.baseScale * scale); content.rotation.y = THREE.MathUtils.degToRad(yaw); sync(); };
  $('surface-smaller').onclick = () => { scale = Math.max(.25, Math.round((scale-.1)*100)/100); transform(); };
  $('surface-larger').onclick = () => { scale = Math.min(2, Math.round((scale+.1)*100)/100); transform(); };
  $('surface-left').onclick = () => { yaw = (yaw - 15) % 360; transform(); };
  $('surface-right').onclick = () => { yaw = (yaw + 15) % 360; transform(); };
  overlay.addEventListener('beforexrselect', event => { if (event.target.closest('.surface-card, .surface-controls')) event.preventDefault(); });
  $('surfaces').addEventListener('close', () => { if (pending) end(); });
  window.addEventListener('pagehide', () => { pageHidden = true; end(); });
  window.addEventListener('pageshow', () => { pageHidden = false; });
  navigator.xr?.addEventListener?.('devicechange', support);
  sync();
  return {start,end,support,get active(){return active;},get pending(){return pending;},get placed(){return placed;}};
}
