import { createSpatialAR } from "./scene/spatial-ar.js";
import { createMissions } from "./education/missions.js";
import { createParts } from "./education/parts.js";
import { createExperiments } from "./education/experiments.js";
import { createProjects } from "./ui/projects.js";
import { createEffects } from "./ui/effects.js";
import { createThumbnails } from "./ui/thumbnails.js";
import { createPagination } from "./ui/pagination.js";
import { createHud } from "./ui/hud.js";
import { createLearning } from "./education/learning.js";
import { createHistory } from "./core/history.js";
import { createState } from "./core/state.js";
import { createEngine } from "./scene/engine.js";
import { createSelection } from "./scene/selection.js";
import { createAssets } from "./models/assets.js";
import { createAnnotations } from "./scene/annotations.js";
import { createModels } from "./models/catalog.js";
import { createLibrary } from "./ui/library.js";
import { createInterface } from "./ui/interface.js";
import { createEditor } from "./ui/editor.js";
import { createView } from "./scene/collection.js";
import { createInteractions } from "./scene/interactions.js";
import { createLayout } from "./ui/layout.js";
import { createLoop } from "./scene/loop.js";
import { createCamera } from "./ui/camera.js";
import { createGears } from './education/gears.js';
import { createGearDesigner } from './education/gear-designer.js';
import { createGearClass } from './education/gear-class.js';
import { createGearTelemetry } from './scene/gear-telemetry.js';
import { createGearInline } from './ui/gear-inline.js';
import { installInterfaceIcons } from './ui/icons.js';
import { createGearCenter } from './ui/gear-center.js';

export const app = { state: createState() };

app.engine = createEngine(app);
app.assets = createAssets(app);
app.thumbnails = createThumbnails(app);
app.annotations = createAnnotations(app);
app.selection = createSelection(app);
app.models = createModels(app);
app.interface = createInterface(app);
app.editor = createEditor(app);
app.view = createView(app);
app.interactions = createInteractions(app);
app.layout = createLayout(app);
app.library = createLibrary(app);
app.loop = createLoop(app);
app.camera = createCamera(app);
app.learning = createLearning(app);
app.history = createHistory(app);
app.projects = createProjects(app);
app.parts = createParts(app);
app.experiment = createExperiments(app);
app.missions = createMissions(app);
app.pagination = createPagination();
app.pagination.initialize();
app.hud = createHud(app);
app.hud.initialize();
app.effects = createEffects(app);
app.spatial = createSpatialAR(app);
app.gears = createGears(app);
app.gearDesigner = createGearDesigner(app);
app.gearClass = createGearClass(app);
app.gearTelemetry = createGearTelemetry(app);
app.gearInline = createGearInline(app);
app.gearCenter = createGearCenter(app);
installInterfaceIcons();

app.view.syncCollectionControls();
app.loop.start();
app.ready = Promise.all([app.models.loadCatalogAndScene(), app.learning.load(), app.parts.load(), app.missions.load()]).then((results) => {
  app.state.startupReady = true;
  if (app.state.collection === 'engranajes') {
    app.gearCenter.activate();
    app.interface.select(app.state.entries.find((item) => item.mechanism) || null);
    document.body.classList.add('classroom-mode');
    app.hud.setNavigation(false);
  }
  return results;
});

window.addEventListener("pagehide", () => app.loop.stop());
window.addEventListener("pageshow", () => { if (!document.hidden) app.loop.start(); });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) app.loop.stop(); else app.loop.start();
});
