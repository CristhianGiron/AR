/** Rotate content only. DOM pointers, legacy touch and XR screen rays share one gesture model. */
export function bindARRotation(element, { enabled, canRotate, rotate, tap }) {
  const pointers = new Map();
  let previous = null, origin = null, moved = false, multi = false, nativePrevious = null, lastDOM = -Infinity;
  const blocked = event => event.target?.closest?.('.surface-card, .surface-controls, button, input, select, a');
  function sample(points) {
    return {
      x: points.reduce((sum,p)=>sum+p.x,0)/points.length,
      y: points.reduce((sum,p)=>sum+p.y,0)/points.length,
      angle: points.length === 2 ? Math.atan2(points[1].y-points[0].y,points[1].x-points[0].x) : 0
    };
  }
  function delta(current, before, count) {
    const twist = count === 2 ? Math.atan2(Math.sin(current.angle-before.angle),Math.cos(current.angle-before.angle)) : 0;
    rotate(current.x-before.x,current.y-before.y,-twist);
  }
  function capture(id, release = false) {
    // Some immersive browsers dispatch synthetic pointers without native pointer capture.
    try {
      if (release) { if (element.hasPointerCapture?.(id)) element.releasePointerCapture(id); }
      else element.setPointerCapture?.(id);
    } catch {}
  }
  function cancel() {
    const ids = [...pointers.keys()]; pointers.clear();
    previous = origin = nativePrevious = null;
    for (const id of ids) if (typeof id === 'number') capture(id,true);
  }
  function begin(id,x,y) {
    if (pointers.size >= 2) return;
    if (!pointers.size) moved = multi = false;
    pointers.set(id,{x,y});
    multi ||= pointers.size > 1;
    origin = previous = sample([...pointers.values()]);
    nativePrevious = null; lastDOM = performance.now();
  }
  function move(id,x,y) {
    if (!pointers.has(id)) return;
    if (!enabled()) { cancel(); return; }
    pointers.set(id,{x,y}); lastDOM = performance.now();
    const current = sample([...pointers.values()]);
    moved ||= Math.hypot(current.x-origin.x,current.y-origin.y)>6 || multi;
    if (canRotate() && moved) delta(current,previous,pointers.size);
    previous = current;
  }
  function end(id, allowTap) {
    if (!pointers.has(id)) return;
    const shouldTap = pointers.size === 1 && !moved && !multi && allowTap;
    pointers.delete(id);
    if (typeof id === 'number') capture(id,true);
    previous = origin = pointers.size ? sample([...pointers.values()]) : null;
    lastDOM = performance.now();
    if (shouldTap && enabled()) tap();
  }
  const down = event => {
    if (!enabled() || blocked(event) || (event.button !== undefined && event.button !== 0)) return;
    event.preventDefault();
    begin(event.pointerId,event.clientX,event.clientY); capture(event.pointerId);
  };
  const pointerMove = event => {
    if (!pointers.has(event.pointerId)) return;
    event.preventDefault(); move(event.pointerId,event.clientX,event.clientY);
  };
  const up = event => end(event.pointerId,event.type === 'pointerup');
  const touchStart = event => {
    if (!enabled() || blocked(event)) return;
    // Pointer Events normally arrive before Touch Events: do not rotate twice.
    if ([...pointers.keys()].some(id=>typeof id === 'number')) return;
    event.preventDefault();
    for (const touch of event.changedTouches) begin('touch-'+touch.identifier,touch.clientX,touch.clientY);
  };
  const touchMove = event => {
    if (![...pointers.keys()].some(id=>typeof id === 'string')) return;
    event.preventDefault();
    for (const touch of event.changedTouches) move('touch-'+touch.identifier,touch.clientX,touch.clientY);
  };
  const touchEnd = event => {
    for (const touch of event.changedTouches) end('touch-'+touch.identifier,event.type === 'touchend');
  };
  const key = event => {
    if (!enabled() || !canRotate() || blocked(event)) return;
    const vectors = {ArrowLeft:[-14,0],ArrowRight:[14,0],ArrowUp:[0,-14],ArrowDown:[0,14]};
    if (vectors[event.key]) { event.preventDefault(); rotate(...vectors[event.key],0); }
  };
  const lost = event => { if (pointers.has(event.pointerId)) end(event.pointerId,false); };
  const events = {pointerdown:down,pointermove:pointerMove,pointerup:up,pointercancel:cancel,lostpointercapture:lost,
    touchstart:touchStart,touchmove:touchMove,touchend:touchEnd,touchcancel:cancel,keydown:key};
  // Capture at the overlay root so transparent areas and changing child targets work alike.
  for (const [name,callback] of Object.entries(events)) element.addEventListener(name,callback,{capture:true,passive:false});
  window.addEventListener('blur',cancel);
  return {
    cancel,
    updateXR(points) {
      if (!enabled() || !canRotate() || pointers.size || performance.now()-lastDOM<200 || !points.length) { nativePrevious=null; return; }
      const current = sample(points);
      const ids = points.map(p=>p.id);
      if (nativePrevious && ids.length === nativePrevious.ids.length && ids.every((id,i)=>id===nativePrevious.ids[i])) delta(current,nativePrevious,points.length);
      nativePrevious={...current,ids};
    },
    dispose() {
      cancel(); window.removeEventListener('blur',cancel);
      for (const [name,callback] of Object.entries(events)) element.removeEventListener(name,callback,true);
    }
  };
}
