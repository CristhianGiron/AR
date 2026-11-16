export const DEFAULT_GEAR_DESIGN = { version: 1, teeth: [20, 40], module: 2.5, width: 10, bore: 4 };
export const PRESSURE_ANGLE = 20 * Math.PI / 180;

function invalid(field, message) { const error = new Error(message); error.field = field; throw error; }
export function validateGearDesign(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.teeth) || value.teeth.length !== 2) invalid('teeth-1', 'El diseño de engranajes no es compatible.');
  value.teeth.forEach((teeth, index) => {
    if (!Number.isInteger(teeth) || teeth < 18 || teeth > 120) invalid('teeth-' + (index + 1), 'Introduce entre 18 y 120 dientes enteros por rueda.');
  });
  for (const [key, min, max, label] of [['module', .5, 5, 'El módulo debe estar entre 0,5 y 5 mm.'], ['width', 1, 20, 'El ancho debe estar entre 1 y 20 mm.'], ['bore', 0, 40, 'El diámetro del agujero debe estar entre 0 y 40 mm.']]) {
    if (!Number.isFinite(value[key]) || value[key] < min || value[key] > max) invalid(key, label);
  }
  const maxBore = value.module * (Math.min(...value.teeth) - 3.5);
  if (value.bore > maxBore) invalid('bore', 'El agujero es demasiado grande para esta rueda. Usa como máximo ' + maxBore.toFixed(2) + ' mm.');
  return { version: 1, teeth: [...value.teeth], module: value.module, width: value.width, bore: value.bore };
}

export function gearDimensions(teeth, module) {
  const pitch = teeth * module / 2;
  return { pitch, base: pitch * Math.cos(PRESSURE_ANGLE), tip: pitch + module, root: pitch - 1.25 * module };
}

const involute = (angle) => Math.tan(angle) - angle;
export function toothHalfAngle(teeth, module, radius) {
  const { pitch, base } = gearDimensions(teeth, module);
  // Total tangential backlash is 0.04 m, shared by the two tooth thicknesses.
  return Math.PI / (2 * teeth) - .04 * module / (4 * pitch) + involute(PRESSURE_ANGLE) - involute(Math.acos(Math.min(1, base / radius)));
}

/** Counterclockwise involute contour. The root joins use radial segments, not a machining fillet. */
export function spurOutline(teeth, module) {
  const { root, base, tip } = gearDimensions(teeth, module), start = Math.max(root, base);
  const points = [], pitchAngle = 2 * Math.PI / teeth;
  const flankHalf = toothHalfAngle(teeth, module, start), tipHalf = toothHalfAngle(teeth, module, tip);
  const point = (radius, angle) => points.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  for (let tooth = 0; tooth < teeth; tooth++) {
    const center = tooth * pitchAngle;
    point(root, center - flankHalf);
    for (let sample = 0; sample <= 12; sample++) {
      const radius = start + (tip - start) * sample / 12;
      point(radius, center - toothHalfAngle(teeth, module, radius));
    }
    for (let sample = 1; sample <= 6; sample++) point(tip, center - tipHalf + 2 * tipHalf * sample / 6);
    for (let sample = 11; sample >= 0; sample--) {
      const radius = start + (tip - start) * sample / 12;
      point(radius, center + toothHalfAngle(teeth, module, radius));
    }
    point(root, center + flankHalf);
    for (let sample = 1; sample <= 6; sample++) point(root, center + flankHalf + (pitchAngle - 2 * flankHalf) * sample / 6);
  }
  // Remove coincident junctions so extrusion has no zero-length edges.
  const outline = points.filter((p, i) => i === 0 || Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]) > 1e-9);
  if (Math.hypot(outline.at(-1)[0] - outline[0][0], outline.at(-1)[1] - outline[0][1]) < 1e-9) outline.pop();
  return outline;
}

export function parametricSystem(input) {
  const design = validateGearDesign(input), distance = design.module * (design.teeth[0] + design.teeth[1]) / 2;
  return { teeth: design.teeth, nodes: ['pinion', 'gear'], centers: [[0, 0, 0], [distance, 0, 0]], axes: [[0, 0, 1], [0, 0, 1]],
    separation: [[-1, 0, 0], [1, 0, 0]], travel: distance * .6, phase: [0, Math.PI - Math.PI / design.teeth[1]],
    description: 'Par paramétrico de ' + design.teeth.join(' y ') + ' dientes. Perfil de evolvente de 20°, módulo común de ' + design.module + ' mm y distancia entre ejes de ' + distance.toFixed(2) + ' mm.' };
}
