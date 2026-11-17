/** Model-aware callouts: protect the projected mechanism and route short elbow leaders. */
export const boxAt = (x, y, w, h) => ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h });
export const overlapArea = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pad = (b, g) => boxAt(b.left - g, b.top - g, b.right - b.left + 2 * g, b.bottom - b.top + 2 * g);
export function closestPoint(b, p) { return { x: clamp(p.x, b.left, b.right), y: clamp(p.y, b.top, b.bottom) }; }
export function connectorDistance(b, p) { const q = closestPoint(b, p); return Math.hypot(q.x - p.x, q.y - p.y); }
export function boxDistance(a, b) { return Math.hypot(Math.max(a.left - b.right, b.left - a.right, 0), Math.max(a.top - b.bottom, b.top - a.bottom, 0)); }
const inside = (p, b) => p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;
function crossing(a, b, c, d) {
  const side = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
}
function hits(a, b, box) {
  if (inside(a, box) || inside(b, box)) return true;
  const p = [{ x: box.left, y: box.top }, { x: box.right, y: box.top }, { x: box.right, y: box.bottom }, { x: box.left, y: box.bottom }];
  return p.some((point, i) => crossing(a, b, point, p[(i + 1) % 4]));
}
const segments = points => points.slice(1).map((p, i) => [points[i], p]);
const length = points => segments(points).reduce((sum, [a, b]) => sum + Math.hypot(b.x - a.x, b.y - a.y), 0);
const routeHits = (points, box) => segments(points).some(([a, b]) => hits(a, b, box));
const routesCross = (a, b) => segments(a).some(([p, q]) => segments(b).some(([r, s]) => crossing(p, q, r, s)));

function simpleLeader(anchor, box) {
  const horizontal = anchor.x < box.left || anchor.x > box.right;
  const middle = horizontal ? (box.top + box.bottom) / 2 : (box.left + box.right) / 2;
  const end = horizontal ? { x: anchor.x < box.left ? box.left : box.right, y: clamp(anchor.y + (anchor.y < middle ? 14 : -14), box.top + 10, box.bottom - 10) }
    : { x: clamp(anchor.x + (anchor.x < middle ? 14 : -14), box.left + 10, box.right - 10), y: anchor.y < box.top ? box.top : box.bottom };
  return [anchor, horizontal ? { x: anchor.x, y: end.y } : { x: end.x, y: anchor.y }, end];
}
function leader(anchor, box, own, models, obstacles, old, routed = []) {
  const horizontal = anchor.x < box.left || anchor.x > box.right;
  const port = horizontal ? { x: anchor.x < box.left ? box.left : box.right, y: clamp(anchor.y, box.top + 12, box.bottom - 12) }
    : { x: clamp(anchor.x, box.left + 12, box.right - 12), y: anchor.y < box.top ? box.top : box.bottom };
  const routes = [];
  for (const offset of [-16, 16, 0]) {
    const end = horizontal ? { x: port.x, y: clamp(port.y + offset, box.top + 10, box.bottom - 10) }
      : { x: clamp(port.x + offset, box.left + 10, box.right - 10), y: port.y };
    const normal = horizontal ? Math.sign(anchor.x - end.x) : Math.sign(anchor.y - end.y);
    const stub = horizontal ? { x: end.x + normal * 12, y: end.y } : { x: end.x, y: end.y + normal * 12 };
    const diagonal = Math.min(Math.abs(stub.x - anchor.x), Math.abs(stub.y - anchor.y));
    const knee = horizontal ? { x: stub.x - Math.sign(stub.x - anchor.x) * diagonal, y: anchor.y }
      : { x: anchor.x, y: stub.y - Math.sign(stub.y - anchor.y) * diagonal };
    routes.push([anchor, knee, stub, end]);
    routes.push([anchor, { x: anchor.x, y: end.y }, end], [anchor, { x: end.x, y: anchor.y }, end]);
    // Nearby rails let a leader go around another wheel or the model's title.
    for (const x of [own.left - 10, own.right + 10, stub.x]) routes.push([anchor, { x, y: anchor.y }, { x, y: end.y }, end]);
    for (const y of [own.top - 10, own.bottom + 10, stub.y]) routes.push([anchor, { x: anchor.x, y }, { x: end.x, y }, end]);
  }
  const direct = Math.hypot(port.x - anchor.x, port.y - anchor.y);
  const ranked = routes.map(points => {
    points = points.filter((point, i) => !i || Math.hypot(point.x - points[i - 1].x, point.y - points[i - 1].y) > .1);
    const travel = length(points);
    const bent = points.some((p, i) => i >= 2 && Math.abs((points[i - 1].x - points[i - 2].x) * (p.y - points[i - 1].y) - (points[i - 1].y - points[i - 2].y) * (p.x - points[i - 1].x)) > .1);
    if (travel > direct + 100 || points.length < 3 || !bent) return null;
    const blocked = obstacles.reduce((n, obstacle) => n + (routeHits(points.slice(0, -1), obstacle) ? 1 : 0), 0);
    // The line must reach its own axis; avoid traversing the other wheels on the way.
    const throughModel = models.reduce((n, model) => n + (model !== own && !inside(anchor, model) && routeHits(points, model) ? 1 : 0), 0);
    const throughCard = segments(points).slice(0, -1).some(([a, b]) => hits(a, b, box)) ? 1 : 0;
    const prior = old?.route?.at(-1);
    const portDrift = prior ? Math.min(6, Math.hypot(points.at(-1).x - prior.x - (anchor.x - old.anchor.x), points.at(-1).y - prior.y - (anchor.y - old.anchor.y)) * .12) : 0;
    const crossings = routed.reduce((n, route) => n + (routesCross(points, route) ? 1 : 0), 0);
    return { points, cost: crossings * 70 + portDrift + travel * .08 + blocked * 150 + throughModel * 70 + throughCard * 250 + (points.length - 3) * 1.5 };
  }).filter(Boolean).sort((a, b) => a.cost - b.cost);
  // Degenerate alignment still has a small angled approach at the card edge.
  return ranked[0] || { points: [anchor, { x: port.x - 12, y: port.y - 12 }, port], cost: direct * .08 };
}

export function arrangeGearLabels({ labels, obstacles, viewport, previous = [], maxDistance = 112, modelBounds = [] }) {
  if (!labels.length) return [];
  const models = modelBounds.length ? modelBounds : labels.map(label => label.footprint || boxAt(label.anchor.x - 18, label.anchor.y - 18, 36, 36));
  const center = { x: models.reduce((s, b) => s + (b.left + b.right) / 2, 0) / models.length, y: models.reduce((s, b) => s + (b.top + b.bottom) / 2, 0) / models.length };
  const lists = labels.map((label, modelIndex) => {
    const own = label.footprint || models[modelIndex], { anchor } = label, old = previous[label.index];
    const expected = old ? { x: old.box.left + anchor.x - old.anchor.x, y: old.box.top + anchor.y - old.anchor.y } : null;
    const candidates = [], seen = new Set();
    for (const density of ['full', 'compact']) {
      const { w, h } = label.sizes[density];
      if (w > viewport.width || h > viewport.height) continue;
      const positions = old?.density === density ? [[expected.x, expected.y]] : [];
      for (const gap of [8, 16, 30, 48, 64, 88, 104]) {
        for (const x of [anchor.x - w / 2, own.left, own.right - w, anchor.x - w, anchor.x]) positions.push([x, own.top - h - gap], [x, own.bottom + gap]);
        for (const y of [anchor.y - h / 2, own.top, own.bottom - h, anchor.y - h, anchor.y]) positions.push([own.left - w - gap, y], [own.right + gap, y]);
        for (const x of [own.left - w - gap, own.right + gap]) for (const y of [own.top - h - gap, own.bottom + gap]) positions.push([x, y]);
      }
      for (const [rawX, rawY] of positions) {
        const x = clamp(rawX, viewport.left, viewport.right - w), y = clamp(rawY, viewport.top, viewport.bottom - h);
        const key = density + ':' + Math.round(x) + ':' + Math.round(y); if (seen.has(key)) continue; seen.add(key);
        const box = boxAt(x, y, w, h), gap = boxDistance(box, own);
        if (gap > maxDistance || models.some(model => overlapArea(box, pad(model, 7)) > .5)) continue;
        if (obstacles.some(obstacle => overlapArea(box, pad(obstacle, 4)) > .5)) continue;
        const dx = x + w / 2 - anchor.x, dy = y + h / 2 - anchor.y;
        const inward = dx * (anchor.x - center.x) + dy * (anchor.y - center.y) < 0 ? 12 : 0;
        const drift = expected ? Math.min(32, Math.hypot(x - expected.x, y - expected.y) * .22) : 0;
        const resize = old && old.density !== density ? 10 : 0;
        const cost = gap * .65 + connectorDistance(box, anchor) * .12 + inward + drift + resize + (density === 'compact' ? 18 : 0);
        candidates.push({ index: label.index, box, anchor, footprint: own, density, cost });
      }
    }
    candidates.sort((a, b) => a.cost - b.cost);
    const diverse = [], sectors = new Map();
    for (const candidate of candidates) {
      const b = candidate.box, sector = candidate.density + ':' + Math.round(Math.atan2(b.top + b.height / 2 - anchor.y, b.left + b.width / 2 - anchor.x) / (Math.PI / 4));
      if ((sectors.get(sector) || 0) >= 2) continue;
      sectors.set(sector, (sectors.get(sector) || 0) + 1);
      const route = simpleLeader(anchor, b);
      diverse.push({ ...candidate, footprint: own, route, end: route.at(-1), cost: candidate.cost + length(route) * .08 });
      if (diverse.length >= 24) break;
    }
    return { index: label.index, candidates: diverse };
  });
  lists.sort((a, b) => a.candidates.length - b.candidates.length || a.index - b.index);
  let beam = [{ placements: [], cost: 0 }];
  for (const list of lists) {
    const next = [];
    for (const state of beam) {
      for (const candidate of list.candidates) {
        if (state.placements.some(other => overlapArea(candidate.box, pad(other.box, 7)) > .5)) continue;
        let routing = 0;
        for (const other of state.placements) {
          if (routesCross(candidate.route, other.route)) routing += 70;
          if (routeHits(candidate.route, other.box) || routeHits(other.route, candidate.box)) routing += 160;
        }
        next.push({ placements: [...state.placements, candidate], cost: state.cost + candidate.cost + routing });
      }
      next.push({ placements: state.placements, cost: state.cost + 1400 });
    }
    next.sort((a, b) => a.cost - b.cost); beam = next.slice(0, 24);
  }
  const result = beam[0].placements.sort((a, b) => a.index - b.index), routed = [];
  for (const placement of result) {
    const blockers = [...obstacles, ...result.filter(other => other !== placement).map(other => other.box)];
    const route = leader(placement.anchor, placement.box, placement.footprint, models, blockers, previous[placement.index], routed);
    placement.route = route.points; placement.end = route.points.at(-1); routed.push(route.points);
  }
  return result;
}
