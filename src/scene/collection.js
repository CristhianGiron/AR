import { $ } from "../ui/dom.js";
import { clamp, wrapAngle } from "../core/math.js";

export function createView(app) {
  const state = app.state;
  function syncCollectionControls() {
    $("collection-mode").setAttribute("aria-pressed", String(state.collectionMode));
    const label = state.collectionMode ? "Conjunto: volver al control individual" : "Controlar todo el conjunto";
    $("collection-mode").title = label; $("collection-mode").setAttribute("aria-label", label);
    const scope = state.collectionMode ? "Ahora controlas: todos los componentes" : state.chosen ? "Ahora controlas: " + state.chosen.name : "Elige un componente para empezar";
    if ($("scope-status").textContent !== scope) $("scope-status").textContent = scope;
    $("scope-status").title = scope;
    $("collection-zoom").textContent = Math.round(state.viewState.zoom * 100) + "%";
    for (const axis of ["x", "y"]) {
      if (document.activeElement !== $("collection-" + axis)) $("collection-" + axis).value = state.viewState[axis];
    }
    if (!state.collectionMode) {
      $("collection-rotation").hidden = true;
      $("collection-rotate").setAttribute("aria-expanded", "false");
    }
  }

  function setCollectionMode(enabled) {
    app.interactions.cancelGesture();
    if (enabled && state.isolatedItem) app.learning.showAll();
    state.collectionMode = enabled;
    syncCollectionControls(); app.interface.syncControls();
  }

  function setViewZoom(value) {
    state.viewState.zoom = clamp(value, 0.4, 2.5);
    syncCollectionControls();
  }

  function rotateView(start, dx, dy, fine = false) {
    const axis = $("collection-axis").value;
    const sensitivity = fine ? 0.06 : 0.35;
    if (axis !== "y") state.viewState.x = wrapAngle(start.x - dy * sensitivity);
    if (axis !== "x") state.viewState.y = wrapAngle(start.y - dx * sensitivity);
    syncCollectionControls();
  }

  $("collection-mode").onclick = () => setCollectionMode(!state.collectionMode);

  $("collection-in").onclick = () => { app.interactions.cancelGesture(); setViewZoom(state.viewState.zoom * 1.2); };

  $("collection-out").onclick = () => { app.interactions.cancelGesture(); setViewZoom(state.viewState.zoom / 1.2); };

  $("collection-reset").onclick = () => {
    app.interactions.cancelGesture(); state.viewState.x = state.viewState.y = 0; state.viewState.zoom = 1;
    $("collection-axis").value = "xy"; syncCollectionControls();
  };

  $("collection-rotate").onclick = () => {
    const open = $("collection-rotation").hidden;
    if (open) setCollectionMode(true);
    $("collection-rotation").hidden = !open;
    $("collection-rotate").setAttribute("aria-expanded", String(open));
  };

  for (const axis of ["x", "y"]) {
    const input = $("collection-" + axis);
    input.addEventListener("input", () => {
      if (!Number.isFinite(input.valueAsNumber)) return;
      app.interactions.cancelGesture(); state.viewState[axis] = wrapAngle(input.valueAsNumber); syncCollectionControls();
    });
    input.addEventListener("change", () => { input.value = state.viewState[axis]; });
  }

  $("collection-axis").onchange = () => app.interactions.cancelGesture();

  return { syncCollectionControls, setViewZoom, rotateView };
}
