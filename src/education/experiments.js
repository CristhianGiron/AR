import { $ } from '../ui/dom.js';
import { createExperiment } from './experiment.js';
import { createEchoExperiment } from './echo-experiment.js';

/** One entry point, independent laboratories, one optional scene tool at a time. */
export function createExperiments(app) {
  const light = createExperiment(app), echo = createEchoExperiment(app);
  const surface = (item = app.state.chosen) => item?.definition.id === 'sensor-ultrasonico' ? 'echo-experiment' : 'experiment';
  const explanationId = (item = app.state.chosen) => surface(item) === 'echo-experiment' ? 'echo-explanation' : 'experiment-explanation';
  function open() { app.hud.open(surface(), $('open-experiment')); }
  function render(item) {
    light.render(item); echo.render(item);
    const supported = ['sensor-luz-ldr', 'sensor-ultrasonico'].includes(item?.definition.id);
    if (['experiment', 'echo-experiment'].includes(app.state.hudSurface) && (!supported || app.state.hudSurface !== surface(item))) app.hud.close(false);
    $('open-experiment').hidden = $('learning-experiment-tab').hidden = !supported;
    $('learning-quiz-tab').textContent = supported ? '3. Responder' : '2. Responder';
    for (const id of ['open-experiment', 'learning-experiment-tab']) $(id).setAttribute('aria-controls', surface(item));
  }
  $('learning-experiment-tab').onclick = open;
  return { render, open, surface, explanationId, stop: () => { light.stop(); echo.stop(); },
    updateFrame: () => { light.updateFrame(); echo.updateFrame(); },
    setDistance: light.setDistance, light, echo };
}
