export const TRANSMISSION_VARIANTS = Object.freeze({
  simple: { name: 'Simple · 1:1', pairs: [[20, 30], [30, 20]], compound: false,
    lesson: 'La rueda intermedia cambia el recorrido del giro, pero no la relación total. Entrada y salida giran en el mismo sentido.' },
  reducer: { name: 'Reductora · 4:1', pairs: [[20, 40], [20, 40]], compound: true,
    lesson: 'Dos reducciones de 2:1 se multiplican: la salida gira cuatro veces más despacio que la entrada.' },
  multiplier: { name: 'Multiplicadora · 1:4', pairs: [[40, 20], [40, 20]], compound: true,
    lesson: 'Dos multiplicaciones de velocidad: la salida gira cuatro veces más rápido que la entrada.' },
  advanced: { name: 'Compuesta · 6:1', pairs: [[18, 36], [18, 54], [18, 36], [36, 18]], compound: true,
    lesson: 'Cuatro etapas combinan reducción y multiplicación: 2 × 3 × 2 × 0,5 = 6. Ocho ruedas en cinco ejes.' },
});
export function validateTransmissionVariant(id) {
  if (typeof id !== 'string' || !Object.hasOwn(TRANSMISSION_VARIANTS, id)) throw new Error('Elige una variante de transmisión válida.');
  return id;
}
export function transmissionSystem(id) {
  const variant = TRANSMISSION_VARIANTS[validateTransmissionVariant(id)], count = variant.pairs.length + 1;
  const centers = [[0, 0, 0]], phase = [0], module = 2, width = 8, layers = variant.compound;
  const partTeeth = Array.from({ length: count }, () => []), stages = [], contacts = [];
  variant.pairs.forEach(([a, b], i) => {
    const angle = layers && i % 2 ? -.55 : 0, distance = module * (a + b) / 2, previous = centers[i];
    centers.push([previous[0] + distance * Math.cos(angle), previous[1] + distance * Math.sin(angle), 0]);
    phase.push((1 + a / b) * angle + Math.PI - Math.PI / b - (layers ? 0 : a / b * phase[i]));
    if (layers || !partTeeth[i].includes(a)) partTeeth[i].push(a);
    partTeeth[i + 1].push(b);
    stages.push({ input: i, output: i + 1, teeth: [a, b] });
    contacts.push({ z: layers ? i * (width + 5) : 0, angle });
  });
  return { teeth: partTeeth.map(p => p[0]), partTeeth, centers, phase, stages, contacts, module, width,
    nodes: Array.from({ length: count }, (_, i) => 'Shaft' + i),
    labels: partTeeth.map((teeth, i) => (i === 0 ? 'Entrada' : i === count - 1 ? 'Salida' : 'Intermedio ' + i) + ' · ' + teeth.join(' y ') + ' dientes'),
    axes: Array.from({ length: count }, () => [0, 0, 1]),
    separation: Array.from({ length: count }, (_, i) => [i % 2 ? 1 : -1, i % 2 ? -.5 : .5, .2 * i]),
    travel: 35, description: variant.name + '. ' + variant.lesson };
}
