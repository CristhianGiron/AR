import { $ } from "../ui/dom.js";

/** One-step undo also supports imported models without reading the file again. */
export function createHistory(app) {
  let removed = null;
  function clear() {
    if (removed) app.models.disposeItem(removed.item);
    removed = null;
    document.body.classList.remove("has-undo");
    $("undo-remove").hidden = true;
  }
  function removeSelected() {
    const item = app.state.chosen;
    if (!item) return;
    app.interactions.cancelGesture();
    clear();
    if (app.state.isolatedItem) app.learning.showAll();
    const index = app.state.entries.indexOf(item);
    app.annotations.remove(item);
    app.engine.scene.remove(item.anchor);
    app.state.entries.splice(index, 1);
    removed = { item, index };
    app.interface.rebuild(); app.interface.select(null);
    app.interface.closePanels();
    document.body.classList.add("has-undo");
    $("undo-remove").hidden = false;
    $("undo-remove").focus({ preventScroll: true });
    app.interface.notify("Se quitó " + item.name + ". Puedes deshacer la eliminación.");
  }
  function undo() {
    if (!removed) return;
    const { item, index } = removed;
    removed = null; document.body.classList.remove("has-undo"); $("undo-remove").hidden = true;
    app.engine.scene.add(item.anchor);
    app.state.entries.splice(Math.min(index, app.state.entries.length), 0, item);
    app.interface.rebuild(); app.interface.select(item);
    app.interface.notify("Componente recuperado: " + item.name);
  }
  $("undo-remove").onclick = undo;
  return { clear, removeSelected, undo };
}
