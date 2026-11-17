import { validateGearDesign, spurOutline, gearDimensions, gearFaceRelief } from './gear-design.js';

// Fixed reference material, not inferred from the model's display color.
export const GEAR_MATERIAL = Object.freeze({ id: 'steel-7850', name: 'Acero de referencia', density: 7850 });
export const STANDARD_GRAVITY = 9.80665;
const cache = new Map();
/** Area and polar second moment of the same polygon used to extrude the gear. */
export function polygonProperties(points) {
  let twiceArea = 0, twelveMoment = 0;
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i], [a, b] = points[(i + 1) % points.length], cross = x * b - a * y;
    twiceArea += cross;
    twelveMoment += cross * (x * x + x * a + a * a + y * y + y * b + b * b);
  }
  return { area: Math.abs(twiceArea) / 2, polarMoment: Math.abs(twelveMoment) / 12 };
}
export function gearPhysicalProperties(input) {
  const design = validateGearDesign(input), key = JSON.stringify(design);
  if (cache.has(key)) return cache.get(key);
  const parts = design.teeth.map(teeth => {
    const section = polygonProperties(spurOutline(teeth, design.module)), holeRadius = design.bore / 2;
    const area = (section.area - Math.PI * holeRadius ** 2) * 1e-6;
    const polarMoment = (section.polarMoment - Math.PI * holeRadius ** 4 / 2) * 1e-12;
    const width = design.width / 1000, relief = gearFaceRelief(teeth, design.module, design.width, design.bore);
    const reliefVolume = Math.PI * (relief.radius ** 2 - holeRadius ** 2) * 2 * relief.depth * 1e-9;
    const reliefMoment = Math.PI * (relief.radius ** 4 - holeRadius ** 4) * relief.depth * 1e-15;
    const volume = area * width - reliefVolume, mass = GEAR_MATERIAL.density * volume;
    const dimensions = gearDimensions(teeth, design.module);
    return Object.freeze({ pitchRadius: dimensions.pitch / 1000, outerRadius: dimensions.tip / 1000, width,
      bore: design.bore / 1000, area, volume, mass, weight: mass * STANDARD_GRAVITY,
      inertia: GEAR_MATERIAL.density * (width * polarMoment - reliefMoment) });
  });
  const result = Object.freeze({ material: GEAR_MATERIAL, parts: Object.freeze(parts), totalMass: parts.reduce((sum, p) => sum + p.mass, 0) });
  // Design changes are discrete; avoid recomputing a toothed contour every animation frame.
  if (cache.size >= 64) cache.delete(cache.keys().next().value);
  cache.set(key, result); return result;
}
