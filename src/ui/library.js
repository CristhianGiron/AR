import { $ } from "./dom.js";

export function createLibrary(app) {
  const state = app.state;
  let manualSequence = 0, manualImporting = false;

  $("local-file").addEventListener("change", () => {
    $("local-error").hidden = true;
    const file = $("local-file").files[0];
    if (file) $("local-name").value = file.name.replace(/\.glb$/i, "").replace(/[_-]+/g, " ").trim().slice(0, 35) || "Modelo local";
  });

  $("upload-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (manualImporting) return;
    const file = $("local-file").files[0];
    if (!file) return;
    $("local-error").hidden = true;
    if (!/\.glb$/i.test(file.name)) {
      $("local-error").textContent = "Selecciona un modelo con extensión .glb."; $("local-error").hidden = false; return;
    }
    if (state.catalogLoading) {
      $("local-error").textContent = "Espera a que termine de cargar el catálogo y vuelve a intentarlo."; $("local-error").hidden = false; return;
    }
    const name = $("local-name").value.trim() || "Modelo local";
    const description = $("local-description").value.trim() || "Modelo 3D cargado desde tu equipo.";
    const generation = state.sceneGeneration;
    const inputs = [$("local-file"), $("local-name"), $("local-description"), $("import-local")];
    manualImporting = true; state.pendingLoads++; inputs.forEach((input) => { input.disabled = true; });
    app.interface.setLoading("Abriendo " + name + "…");
    try {
      const buffer = await file.arrayBuffer(); app.assets.validateLocalGLB(buffer);
      const gltf = await app.models.loader.parseAsync(buffer, "");
      const definition = {
        id: "local-" + Date.now() + "-" + (++manualSequence), nombre: name,
        archivo: file.name, categoria: "Modelo local", descripcion: description,
        cargarAlInicio: false, visualizacion: { tamano: 1.6, rotacion: [0, 0, 0], alturaEtiqueta: 1.85 },
        datos: [{ etiqueta: "Archivo", valor: file.name }, { etiqueta: "Origen", valor: "Cargado desde tu equipo" }],
        creditos: app.assets.localCredits(gltf),
      };
      const item = app.models.insertModel(gltf, definition, generation);
      if (!item) throw new Error("La escena se recargó durante la importación. Vuelve a añadir el archivo.");
      item.localBuffer = buffer;
      app.interface.closePanels(); $("upload-form").reset(); $("manual-upload").open = false;
      $("status").textContent = "Modelo local listo: " + item.name;
      app.interface.notify("Modelo añadido a la escena: " + item.name);
    } catch (error) {
      $("local-error").textContent = "No se pudo abrir el modelo. " + error.message;
      $("local-error").hidden = false;
      app.pagination.refresh($("library")); app.pagination.reveal($("local-error"));
    } finally {
      manualImporting = false; state.pendingLoads--; inputs.forEach((input) => { input.disabled = false; });
      if (!state.pendingLoads && !state.catalogLoading) app.interface.setLoading("");
    }
  });

  function renderCatalog() {
    $("library-grid").replaceChildren(); $("shape").replaceChildren();
    state.catalog.forEach((definition) => {
      const button = document.createElement("button"); button.className = "model-card";
      button.dataset.model = definition.id; button.innerHTML = app.interface.modelIcon();
      const title = document.createElement("span"); title.textContent = definition.nombre;
      const category = document.createElement("small"); category.textContent = definition.categoria;
      button.append(title, category); button.onclick = () => app.models.addFromCatalog(definition.id, button);
      $("library-grid").append(button);
      const option = document.createElement("option"); option.value = definition.id; option.textContent = definition.nombre; $("shape").append(option);
    });
    if (!state.catalog.length) {
      const empty = document.createElement("p"); empty.className = "catalog-message";
      empty.textContent = "Todavía no hay modelos en la colección."; $("library-grid").append(empty);
    }
    $("shape").disabled = $("add").disabled = !state.catalog.length;
  }

  return { renderCatalog };
}
