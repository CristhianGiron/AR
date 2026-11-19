import { XR_UNAVAILABLE, xrFailure, spatialPolicyAllowed } from './xr-availability.js';
import * as THREE from 'three';
import { $ } from '../ui/dom.js';
import { horizontalSurface, createSurfaceTracker } from './surface-pose.js';
import { createAnchorRecovery } from './anchor-tracking.js';
import { createARContent } from './ar-content.js';
import { bindARRotation } from './ar-gestures.js';
import { uiIcon } from '../ui/icons.js';

/** Temporary WebXR placement; original scene objects and project files stay in lab space. */
export function createSpatialAR(app) {
  const renderer = app.engine.renderer, overlay = $('surface-overlay');
  let session = null, source = null, reference = null, pending = false, active = false, generation = 0;
  let arScene = null, camera = null, placement = null, content = null, reticle = null;
  let readyPose = false, placed = false, savedLoop = false, presentation = null;
  let hidden = [], previousFocus = null, pageHidden = false;
  const pose = new THREE.Matrix4(), targetPose = new THREE.Matrix4();
  const targetPosition = new THREE.Vector3(), targetRotation = new THREE.Quaternion(), unitScale = new THREE.Vector3(1, 1, 1);
  const tracker = createSurfaceTracker(), recovery = createAnchorRecovery();
  let anchor = null, anchorPending = false, anchorRun = 0, placeRequested = false, previousTime = 0;
  function clearAnchor() {
    anchorRun++; recovery.reset(); anchorPending = false; placeRequested = false;
    try { anchor?.delete(); } catch {}
    anchor = null;
  }
  function resetScan() { tracker.reset(); readyPose = false; previousTime = 0; if (reticle) reticle.visible = false; $('surface-telemetry').hidden = true; }
  function placedMessage() {
    if (anchorPending) return 'Fijando el modelo a la superficie…';
    return anchor ? 'Modelo anclado. Muévete despacio para observarlo desde otros ángulos.' : 'Modelo colocado. No se pudo activar el anclaje espacial; la posición puede variar al moverte.';
  }
  let availability = "unknown", supportRun = 0;
  function message(text) {
    for (const id of ['surface-message', 'surface-live']) if ($(id).textContent !== text) $(id).textContent = text;
  }
  function sync() {
    app.gearTelemetry?.updateFrame();
    $('surface-start').disabled = pending || active || availability !== 'available';
    $('surface-check').disabled = pending || active || availability === 'checking';
    $('surface-cancel').hidden = !pending;
    $('surface-place').disabled = !active || placed || !readyPose || placeRequested;
    $('surface-reposition').disabled = !active || !placed;
    $('surface-place').hidden = placed;
    $('surface-play').hidden = !placed || !presentation?.hasMechanism;
    $('surface-reposition').hidden = !placed;
    $('surface-play').disabled = !placed;
    const running = !!presentation?.running, playLabel = running ? 'Pausar' : 'Poner en marcha';
    if ($('surface-play').getAttribute('aria-label') !== playLabel) {
      $('surface-play').innerHTML = uiIcon(running ? 'pause' : 'play') + '<span>' + playLabel + '</span>';
      $('surface-play').setAttribute('aria-label',playLabel);
    }
    $('surface-play').setAttribute('aria-pressed',String(running));
    $('surface-gesture-help').textContent = placed ? 'Arrastra para girar · Dos dedos para dar vuelta' : 'Escanea y toca una superficie estable para colocar';
    $('surface-gesture').tabIndex = placed ? 0 : -1;
  }
  function build() {
    const entries = $('surface-scope').value === 'selected' && app.state.chosen ? [app.state.chosen] : app.state.entries.filter((item) => item.anchor.visible);
    if (!entries.length) throw new Error('Añade un componente antes de colocarlo sobre una superficie.');
    arScene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(60, 1, .01, 30);
    arScene.add(new THREE.HemisphereLight(0xffffff, 0x657387, 3));
    const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(2, 4, 2); arScene.add(sun);
    placement = new THREE.Group(); content = new THREE.Group();
    const models = new THREE.Group(); content.add(models); placement.add(content); arScene.add(placement); placement.visible = false;
    presentation = createARContent(app, models, camera, entries);
    $('surface-title').textContent = entries.length === 1 ? entries[0].name : 'Conjunto en AR';
    const bounds = new THREE.Box3();
    for(const entry of presentation.entries) bounds.union(new THREE.Box3().setFromObject(entry.mesh));
    const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    const largest = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(largest) || largest <= 0) throw new Error('No se pudo preparar la geometría para AR.');
    models.position.set(-center.x, -bounds.min.y, -center.z);
    content.userData.baseScale = .5 / largest; content.scale.setScalar(content.userData.baseScale);
    reticle = new THREE.Mesh(new THREE.RingGeometry(.055, .075, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7defff, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
    reticle.renderOrder = 10; reticle.matrixAutoUpdate = false; reticle.visible = false; arScene.add(reticle);
    clearAnchor(); resetScan(); placed = readyPose = false;
  }
  function dispose() {
    // Models and name sprites share source resources; AR owns its guide and connectors.
    gestures.cancel(); presentation?.dispose(); presentation = null;
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
  function referenceReset(event) {
    recovery.reset(); resetScan(); placeRequested = false;
    if (placed && !anchor && !anchorPending && event.transform) {
      // reset.transform maps the new reference origin into the old coordinates.
      placement.updateMatrix();
      targetPose.fromArray(event.transform.matrix).invert().multiply(placement.matrix);
      targetPose.decompose(placement.position, placement.quaternion, placement.scale);
    } else if (!anchor) {
      clearAnchor(); placed = false;
    }
    if (placement) placement.visible = false;
    sync(); message(placed ? 'Recuperando la posición del modelo…' : 'El seguimiento cambió. Busca de nuevo una superficie.');
  }
  function cleanup(ownSession) {
    if (ownSession && session !== ownSession) return;
    generation++; clearAnchor(); resetScan(); try { source?.cancel(); } catch {} source = null;
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
    if (!active || placed || session?.visibilityState !== 'visible' || !readyPose) return;
    // Consume the request inside the next XR frame: hit results cannot create anchors later.
    placeRequested = true; sync();
  }
  function commit(hit) {
    clearAnchor();
    const operation = anchorRun;
    // Use the current measured hit for both placement and anchor, never a stale guide pose.
    targetPose.decompose(placement.position, placement.quaternion, placement.scale);
    placement.visible = true; placed = true; resetScan();
    if (typeof hit.createAnchor === 'function' && (!session.enabledFeatures || session.enabledFeatures.includes('anchors'))) {
      anchorPending = true; placement.visible = false;
      try {
        Promise.resolve(hit.createAnchor()).then(created => {
          if (!active || operation !== anchorRun || !placed) { created.delete(); return; }
          anchor = created; anchorPending = false;
        }).catch(() => { if (operation === anchorRun) anchorPending = false; });
      } catch { anchorPending = false; }
    }
    message(placedMessage()); sync();
  }
  function frame(time, xrFrame) {
    if (!active || !xrFrame || !session) return;
    const dt = previousTime ? Math.max(0, time - previousTime) : 16; previousTime = time;
    readyPose = false; reticle.visible = false;
    try {
      const viewer = session.visibilityState === 'visible' && xrFrame.getViewerPose(reference);
      const tracked = viewer && !viewer.emulatedPosition;
      placement.visible = placed && !!tracked && !anchorPending;
      if (!tracked) {
        gestures.cancel(); recovery.reset(); resetScan(); placeRequested = false;
        message('Se perdió el seguimiento. Mira una zona iluminada con detalles y mueve el dispositivo despacio para recuperarlo.');
      } else if (!placed) {
        let hit = null, matrix = null;
        for (const result of xrFrame.getHitTestResults(source)) {
          const candidate = result.getPose(reference);
          if (candidate && !candidate.emulatedPosition && horizontalSurface(candidate.transform.matrix)) {
            hit = result; matrix = candidate.transform.matrix; break;
          }
        }
        const scan = tracker.update(matrix, time);
        if (matrix) {
          targetPose.fromArray(matrix);
          targetPose.decompose(targetPosition, targetRotation, unitScale);
          if (scan.restarted) pose.copy(targetPose);
          else {
            pose.decompose(reticle.position, reticle.quaternion, reticle.scale);
            const alpha = 1 - Math.exp(-dt / 65);
            reticle.position.lerp(targetPosition, alpha); reticle.quaternion.slerp(targetRotation, alpha);
            pose.compose(reticle.position, reticle.quaternion, unitScale);
          }
        }
        reticle.matrix.copy(pose); reticle.visible = scan.visible; readyPose = scan.ready;
        reticle.material.color.setHex(readyPose ? 0x7defff : 0xffcf70);
        if (placeRequested) { placeRequested = false; if (readyPose && hit) commit(hit); }
        if (!placed) message(readyPose
          ? (session.domOverlayState ? 'Superficie estable. Pulsa Colocar aquí o toca la pantalla.' : 'Superficie estable. Toca la pantalla para colocar.')
          : scan.visible ? 'Comprobando la superficie… Mantén el dispositivo estable.'
          : 'Escanea despacio de lado a lado. Busca bordes o detalles con buena luz; las superficies lisas o blandas pueden no detectarse.');
      } else if (anchor) {
        const located = (!xrFrame.trackedAnchors || xrFrame.trackedAnchors.has(anchor)) && xrFrame.getPose(anchor.anchorSpace, reference);
        if (recovery.update(located && !located.emulatedPosition ? located.transform.matrix : null, time)) {
          pose.fromArray(located.transform.matrix);
          pose.decompose(placement.position, placement.quaternion, placement.scale);
          placement.visible = true; message(placedMessage());
        } else {
          placement.visible = false;
          message('Recuperando el anclaje. Apunta otra vez al lugar donde colocaste el modelo.');
        }
      } else message(placedMessage());
      // Update the user camera from the current native XR view before projecting labels.
      renderer.xr.updateCamera(camera);
      presentation?.update(Math.min(.1, dt / 1000), placement.visible);
      if (!placement.visible) gestures.cancel();
      sync(); renderer.render(arScene, camera);
    } catch {
      gestures.cancel(); recovery.reset(); resetScan(); placeRequested = false; placement.visible = false; sync();
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
      candidate = await navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['local','hit-test'], optionalFeatures: ['dom-overlay', 'anchors'], domOverlay: {root: overlay} });
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
  $('surface-reposition').onclick = () => { gestures.cancel(); clearAnchor(); resetScan(); placed = false; placement.visible = false; sync(); };
  $('surface-play').onclick = () => { if (placed) { presentation?.toggleRunning(); sync(); } };
  const gestures = bindARRotation($('surface-gesture'), {
    enabled:()=>active && session?.visibilityState === 'visible',
    canRotate:()=>placed && placement?.visible,
    rotate:(dx,dy,twist)=>{ content.rotation.x+=dy*.006;content.rotation.y+=dx*.006;content.rotation.z+=twist; },
    tap:()=>{ if(!placed) place(); }
  });
  overlay.addEventListener('beforexrselect', event => {
    if (event.target.closest('.surface-card, .surface-controls, #surface-gesture')) event.preventDefault();
  });
  $('surfaces').addEventListener('close', () => { if (pending) end(); });
  window.addEventListener('pagehide', () => { pageHidden = true; end(); });
  window.addEventListener('pageshow', () => { pageHidden = false; });
  navigator.xr?.addEventListener?.('devicechange', support);
  sync();
  return {start,end,support,get active(){return active;},get pending(){return pending;},get placed(){return placed;}};
}
