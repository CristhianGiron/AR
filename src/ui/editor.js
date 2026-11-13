import * as THREE from "three";
import { $ } from "./dom.js";
import { wrapAngle, clamp } from "../core/math.js";

export function createEditor(app) {
  const state = app.state;
  function applyTransform(item) {
    item.mesh.rotation.set(...item.rot.map(THREE.MathUtils.degToRad), "XYZ");
    item.mesh.scale.setScalar(item.size);
    item.tag.position.y = item.height;
    if (item === state.chosen) app.interface.syncControls();
  }

  function rename(item, name, refresh = true) {
    item.name = name || "Sin nombre";
    if (refresh) $("status").textContent = "Seleccionado: " + item.name;
    item.tag.material.map.dispose();
    item.tag.material.dispose();
    item.anchor.remove(item.tag);
    item.tag = app.annotations.labelSprite(item.name);
    item.tag.position.set(0, item.height, 0);
    item.anchor.add(item.tag);
    if (!refresh) return;
    app.interface.rebuild();
    $("select").value = String(state.entries.indexOf(item));
    app.interface.refreshInspector();
  }

  function recolor(item, color) {
    item.color = color;
    const tint = new THREE.Color(color);
    item.materialColors.forEach((original, material) => material.color.copy(original).multiply(tint));
  }

  function update() {
    if (!state.chosen) return;
    if (state.chosen.name !== ($("name").value || "Sin nombre")) rename(state.chosen, $("name").value);
    recolor(state.chosen, $("color").value);
    state.chosen.size = Number($("size").value);
    state.chosen.height = Number($("height").value);
    state.chosen.rot = ["x", "y", "z"].map((a) => Number($("r" + a).value));
    applyTransform(state.chosen);
  }

  for (const id of ["name", "color", "size", "height", "rx", "ry", "rz"])
    $(id).addEventListener("input", update);

  $("select").onchange = () => app.interface.select($("select").value === "" ? null : state.entries[Number($("select").value)]);

  $("reset").onclick = () => {
    if (!state.chosen) return;
    ["rx", "ry", "rz"].forEach((id, index) => ($(id).value = state.chosen.initialRot[index]));
    update();
  };

  $("remove").onclick = () => app.history.removeSelected();

  $("add").onclick = () => app.models.addFromCatalog($("shape").value, $("add"));

  $("presets").onclick = app.models.loadCatalogAndScene;

  $("quick-name").addEventListener("input", () => {
    if (!state.chosen) return;
    rename(state.chosen, $("quick-name").value);
    $("name").value = state.chosen.name;
  });

  $("quick-color").addEventListener("input", () => {
    if (!state.chosen) return;
    recolor(state.chosen, $("quick-color").value);
    $("color").value = state.chosen.color;
  });

  function closeRename() {
    $("rename-box").hidden = true;
    $("rename").setAttribute("aria-expanded", "false");
  }

  $("rename").onclick = () => {
    const open = $("rename-box").hidden;
    $("rename-box").hidden = !open;
    $("rename").setAttribute("aria-expanded", String(open));
    if (open) { $("quick-name").focus(); $("quick-name").select(); }
  };

  $("rename-box").onsubmit = (e) => {
    e.preventDefault();
    closeRename();
    $("rename").focus();
  };

  $("quick-name").addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeRename(); $("rename").focus(); }
  });

  $("deselect").onclick = () => { app.interactions.cancelGesture(); app.interface.select(null); app.hud.close(); };

  $("delete").onclick = () => $("remove").click();

  $("home").onclick = () => {
    if (!state.chosen) return;
    app.interactions.cancelGesture();
    state.chosen.anchor.position.copy(state.chosen.initialPosition);
    state.chosen.rot = state.chosen.initialRot.slice();
    state.chosen.size = 1;
    state.chosen.height = state.chosen.definition.visualizacion.alturaEtiqueta;
    recolor(state.chosen, "#ffffff");
    applyTransform(state.chosen);
  };

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.onclick = () => {
      app.interactions.cancelGesture();
      state.mode = button.dataset.mode;
      state.rotationExpanded = false;
      $("precision-details").open = false;
      syncRotationControls();
      document.querySelectorAll("[data-mode]").forEach((b) =>
        b.setAttribute("aria-pressed", String(b === button)));
      app.interface.refreshHint();
    };
  });

  function syncRotationControls() {
    $("rotation-controls").hidden = !state.chosen || state.mode !== "rotate" || !state.rotationExpanded;
    document.querySelector('[data-mode="rotate"]').removeAttribute("aria-expanded");
    document.querySelectorAll("[data-axis]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.axis === $("axis").value)));
    if (state.chosen) ["x", "y", "z"].forEach((axis, index) => {
      if (document.activeElement !== $("angle-" + axis)) $("angle-" + axis).value = state.chosen.rot[index];
    });
  }

  document.querySelectorAll("[data-axis]").forEach((button) => {
    button.onclick = () => { app.interactions.cancelGesture(); $("axis").value = button.dataset.axis; syncRotationControls(); };
  });

  ["x", "y", "z"].forEach((axis, index) => {
    const input = $("angle-" + axis);
    input.addEventListener("input", () => {
      if (!state.chosen || !Number.isFinite(input.valueAsNumber)) return;
      app.interactions.cancelGesture(); state.chosen.rot[index] = wrapAngle(input.valueAsNumber); applyTransform(state.chosen);
    });
    input.addEventListener("change", () => { if (state.chosen) input.value = state.chosen.rot[index]; });
  });

  $("precision-details").addEventListener("toggle", () => {
    state.rotationExpanded = $("precision-details").open && !!state.chosen;
    if (state.rotationExpanded) state.mode = "rotate";
    document.querySelectorAll("[data-mode]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.mode === state.mode)));
    syncRotationControls(); app.interface.refreshHint();
  });

  for (const axis of ["x", "z"]) {
    $("position-" + axis).addEventListener("input", () => {
      const value = $("position-" + axis).valueAsNumber;
      if (!state.chosen || !Number.isFinite(value)) return;
      app.interactions.cancelGesture(); state.chosen.anchor.position[axis] = clamp(value, -5, 5); applyTransform(state.chosen);
    });
  }
  for (const [id, field, min, max] of [["object-size-number", "size", 0.3, 2.5], ["label-height-number", "height", 0.8, 3.4]]) {
    $(id).addEventListener("input", () => {
      const value = $(id).valueAsNumber;
      if (!state.chosen || !Number.isFinite(value)) return;
      app.interactions.cancelGesture(); state.chosen[field] = clamp(value, min, max); applyTransform(state.chosen);
    });
  }
  document.querySelectorAll("[data-translate]").forEach((button) => {
    button.onclick = () => {
      if (!state.chosen) return;
      app.interactions.cancelGesture();
      const axis = button.dataset.translate;
      state.chosen.anchor.position[axis] = clamp(Math.round((state.chosen.anchor.position[axis] + Number(button.dataset.direction) * 0.1) * 10) / 10, -5, 5);
      applyTransform(state.chosen);
    };
  });

  $("axis").onchange = () => { app.interactions.cancelGesture(); syncRotationControls(); };

  $("fine-rotation").onchange = $("rotation-step").onchange = () => app.interactions.cancelGesture();

  return { rename, syncRotationControls, closeRename, applyTransform };
}
