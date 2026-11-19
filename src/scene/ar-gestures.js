/** Rotate content only; the native anchor and scale are never changed by a gesture. */
export function bindARRotation(element, { enabled, canRotate, rotate, tap }) {
  const pointers = new Map();
  let previous = null, moved = false, multi = false;
  function sample() {
    const p = [...pointers.values()];
    return { x: p.reduce((s,v)=>s+v.x,0)/p.length, y: p.reduce((s,v)=>s+v.y,0)/p.length,
      angle: p.length === 2 ? Math.atan2(p[1].y-p[0].y,p[1].x-p[0].x) : 0 };
  }
  function cancel() {
    const ids = [...pointers.keys()]; pointers.clear(); previous = null;
    for (const id of ids) if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
  }
  const down = event => {
    if (!enabled() || event.button !== 0 || pointers.size >= 2) return;
    event.preventDefault();
    if (!pointers.size) { moved = multi = false; }
    pointers.set(event.pointerId, {x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY});
    multi ||= pointers.size > 1;
    previous = sample(); element.setPointerCapture(event.pointerId);
  };
  const move = event => {
    const p = pointers.get(event.pointerId); if (!p) return;
    if (!enabled()) { cancel(); return; }
    event.preventDefault();
    const next = {...p,x:event.clientX,y:event.clientY}; pointers.set(event.pointerId,next);
    moved ||= Math.hypot(next.x-p.startX,next.y-p.startY)>6;
    const current = sample();
    if (canRotate() && (moved || multi)) {
      const twist = pointers.size === 2 ? Math.atan2(Math.sin(current.angle-previous.angle),Math.cos(current.angle-previous.angle)) : 0;
      rotate(current.x-previous.x,current.y-previous.y,-twist);
    }
    previous = current;
  };
  const up = event => {
    if (!pointers.has(event.pointerId)) return;
    const shouldTap = pointers.size === 1 && !moved && !multi && event.type === 'pointerup';
    pointers.delete(event.pointerId);
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    previous = pointers.size ? sample() : null;
    if (shouldTap && enabled()) tap();
  };
  const key = event => {
    if (!enabled() || !canRotate()) return;
    const vectors = {ArrowLeft:[-14,0],ArrowRight:[14,0],ArrowUp:[0,-14],ArrowDown:[0,14]};
    if (vectors[event.key]) { event.preventDefault(); rotate(...vectors[event.key],0); }
  };
  const events = {pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,lostpointercapture:up,keydown:key,blur:cancel};
  for (const [name,callback] of Object.entries(events)) element.addEventListener(name,callback);
  return { cancel, dispose() { cancel(); for(const [name,callback] of Object.entries(events)) element.removeEventListener(name,callback); } };
}
