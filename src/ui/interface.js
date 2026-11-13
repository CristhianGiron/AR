import { $ } from "./dom.js";

export function createInterface(app) {
  const state = app.state;
  function setLoading(message) {
    $("loading-indicator").textContent = message;
    $("loading-indicator").hidden = !message;
  }

  function modelIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="12" cy="10" r="4"/><path d="M8 20v3M12 20v3M16 20v3M2 8h2M20 8h2M2 15h2M20 15h2"/></svg>';
  }

  function refreshInspector() {
    const item = state.chosen;
    app.learning.render(item);
    app.parts?.render(item);
    app.experiment?.render(item);
    $("object-kind").textContent = item ? item.definition.categoria + " · seleccionado" : "Tu espacio creativo";
    $("object-title").textContent = item ? item.name : "¡A explorar!";
    $("object-description").textContent = item ? app.learning.getSummary(item) : "Un pequeño laboratorio, infinitas ideas. Toca un objeto y descubre todo lo que puedes hacer con él.";
    $("full-description").textContent = item?.definition.descripcion || "";
    $("full-description").hidden = !item || app.learning.getSummary(item) === item.definition.descripcion;
    $("advanced-target").textContent = item ? "Componente: " + item.name : "Elige un componente de la escena para editarlo.";
    if (item) {
      const source = app.thumbnails.source(item);
      if ($("object-icon").firstElementChild?.getAttribute("src") !== source) {
        const image = document.createElement("img"); image.src = source; image.alt = "";
        $("object-icon").replaceChildren(image);
      }
    } else $("object-icon").innerHTML = modelIcon("box");
    $("object-facts").replaceChildren();
    const facts = item?.definition.datos?.slice(0, 3) || [];

    for (const datum of facts) {
      const row = document.createElement("div"); row.className = "reference-fact";
      row.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16 12-12 4 4L8 20H4v-4ZM12 8l4 4M8 12l2 2"/></svg>';
      const text = document.createElement("span"), term = document.createElement("b");
      term.textContent = datum.etiqueta + ": "; text.append(term, document.createTextNode(datum.valor));
      row.append(text); $("object-facts").append(row);
    }
    $("focus-component").hidden = !item;
    $("model-data").replaceChildren();
    $("model-data").hidden = !item || !item.definition.datos?.length;
    for (const datum of item?.definition.datos || []) {
      const row = document.createElement("div"), term = document.createElement("dt"), value = document.createElement("dd");
      term.textContent = datum.etiqueta; value.textContent = datum.valor; row.append(term, value); $("model-data").append(row);
    }
    if (item?.definition.creditos) {
      const credit = item.definition.creditos;
      const row = document.createElement("div"), term = document.createElement("dt"), value = document.createElement("dd");
      term.textContent = "Créditos del modelo 3D";
      for (const [label, href] of [[credit.autor, credit.autorUrl], [credit.licencia, credit.licenciaUrl], ...(credit.fuente ? [["Modelo original", credit.fuente]] : [])]) {
        if (!label) continue;
        if (value.childNodes.length) value.append(document.createTextNode(" · "));
        let url; try { url = new URL(href); } catch { url = null; }
        if (url && ["https:", "http:"].includes(url.protocol)) {
          const link = document.createElement("a"); link.textContent = label; link.href = url.href; link.target = "_blank"; link.rel = "noopener noreferrer"; value.append(link);
        } else value.append(document.createTextNode(label));
      }
      row.append(term, value); $("model-data").append(row); $("model-data").hidden = false;
    }
    $("object-stats").hidden = !item;
    $("inspect-action-text").textContent = item ? "Abrir ajustes avanzados" : state.entries.length ? "Empezar a explorar" : "Añadir mi primer objeto";
    if (item) {
      $("stat-size").textContent = item.size.toFixed(2) + "×";
      $("stat-rotation").textContent = item.rot.map((v) => v + "°").join(" / ");
      $("stat-position").textContent = item.anchor.position.x.toFixed(1) + " / " + item.anchor.position.z.toFixed(1);
    }
  }

  function refreshSceneList() {
    $("scene-count").textContent = state.entries.length + (state.entries.length === 1 ? " objeto" : " objetos");
    const list = $("scene-list");
    list.replaceChildren();
    if (!state.entries.length) {
      const empty = document.createElement("p"); empty.className = "empty-scene";
      empty.textContent = "Tu escena está lista para una nueva idea. Añade tu primer objeto.";
      list.append(empty);
    }
    state.entries.forEach((item) => {
      const button = document.createElement("button"); button.className = "scene-item";
      button.innerHTML = modelIcon(item.type);
      const name = document.createElement("span"); name.textContent = item.name; button.append(name);
      button.onclick = () => { select(item); closePanels(); };
      list.append(button);
    });
  }

  function rebuild() {
    refreshSceneList();
    $("scene-text-alternative").textContent = state.entries.length
      ? "Escena 3D con " + state.entries.length + " componentes: " + state.entries.map((item) => item.name).join(", ") + ". Puedes seleccionarlos desde Herramientas, Mi escena, y modificarlos con valores sin arrastrar."
      : "La escena no tiene componentes. Abre Herramientas para añadir uno.";
    const s = $("select");
    s.innerHTML = '<option value="">Selecciona un objeto</option>';
    state.entries.forEach((e, i) => {
      const op = document.createElement("option");
      op.value = String(i);
      op.textContent = `${i + 1}. ${e.name}`;
      s.appendChild(op);
    });
  }

  function refreshHint() {
    const tips = {
      rotate: "Arrastra el componente para girarlo. Más opciones abre el giro preciso y los aros X/Y/Z.",
      move: "Arrastra el objeto para moverlo sobre el suelo.",
      scale: "Arrastra el objeto hacia arriba para agrandarlo; hacia abajo para reducirlo.",
    };
    $("guide-text").textContent = state.collectionMode ? "Conjunto · Arrastra: giro X/Y · Pellizca o rueda: zoom" : state.chosen ? ({ rotate: state.rotationExpanded ? "Aros X / Y / Z · Giro fino y ángulos exactos" : "Arrastra para girar · Más opciones: ajustes precisos", move: "Arrastra para mover · La escena es tuya", scale: "Arrastra hacia arriba o abajo para cambiar el tamaño" })[state.mode] : "Toca un objeto y dale vida a tu idea";
    const action = state.collectionMode ? "Arrastra para girar todos los componentes." : ({ rotate: "Arrastra este componente para girarlo.", move: "Arrastra este componente para moverlo.", scale: "Arrastra hacia arriba o abajo para cambiar su tamaño." })[state.mode];
    if ($("tool-description").textContent !== action) $("tool-description").textContent = action;
    $("hint").textContent = state.collectionMode ? "Control del conjunto activo. Arrastra sobre cualquier componente o sobre el fondo para girar toda la vista en X e Y. Pellizca o usa la rueda para cambiar el zoom." : state.chosen
      ? tips[state.mode] + " Dos dedos: mover, pellizcar y girar. Rueda: tamaño. Arrastra la etiqueta para subirla o bajarla. Fondo: girar vista."
      : "Toca un objeto para mostrar sus acciones. Arrastra el fondo para girar la vista.";
  }

  function syncControls() {
    const item = state.chosen;
    refreshInspector();
    app.editor.syncRotationControls();
    $("tools").hidden = !item || state.collectionMode || !!app.hud?.isBlocking();
    for (const id of ["name", "color", "size", "height", "rx", "ry", "rz", "quick-name", "quick-color", "delete", "home", "remove", "reset", "position-x", "position-z", "object-size-number", "label-height-number"])
      $(id).disabled = !item;
    if (!item) {
      $("select").value = "";
      $("quick-name").value = "";
      app.selection.selection.visible = false;
      refreshHint();
      return;
    }
    $("select").value = String(state.entries.indexOf(item));
    $("name").value = $("quick-name").value = item.name;
    $("color").value = $("quick-color").value = item.color;
    $("size").value = item.size;
    $("height").value = item.height;
    for (const [id, value] of [["position-x", item.anchor.position.x], ["position-z", item.anchor.position.z], ["object-size-number", item.size], ["label-height-number", item.height]]) {
      if (document.activeElement !== $(id)) $(id).value = Math.round(value * 100) / 100;
    }
    ["x", "y", "z"].forEach((axis, i) => {
      $("r" + axis).value = item.rot[i];
      $("o" + axis).textContent = item.rot[i] + "°";
    });
    app.selection.selection.visible = !state.collectionMode;
    refreshHint();
  }

  function select(item) {
    if (item && state.collectionMode) state.collectionMode = false;
    if (item !== state.chosen) { app.editor.closeRename(); state.rotationExpanded = false; $("precision-details").open = false; app.selection.buildGlow(item); }
    state.chosen = item;
    app.view.syncCollectionControls();
    syncControls();
    $("status").textContent = item ? "Seleccionado: " + item.name : state.entries.length ? "Toca un objeto para seleccionarlo." : "Escena vacía. Añade un objeto para comenzar.";
  }

  function closePanels() {
    app.hud.close(false);
  }

  function openPanel(id) {
    $("notice").hidden = true;
    app.hud.open(id);
  }

  const hudElements = document.querySelectorAll("#scene-guide, .decoration, .brand, .mode-badge");

  $("hud-toggle").onclick = () => {
    app.interactions.cancelGesture();
    state.hudHidden = !state.hudHidden;
    if (state.hudHidden) { closePanels(); app.parts.stop(); app.experiment.stop(); }
    app.hud.setNavigation(!state.hudHidden && matchMedia("(min-width: 701px)").matches);
    document.body.classList.toggle("hud-hidden", state.hudHidden);
    hudElements.forEach((element) => { element.inert = state.hudHidden; });
    const label = state.hudHidden ? "Mostrar paneles" : "Despejar la vista";
    $("hud-toggle").setAttribute("aria-label", label);
    $("hud-toggle").setAttribute("title", label);
    $("hud-toggle").setAttribute("aria-pressed", String(state.hudHidden));
    $("hud-toggle").querySelector("span").textContent = label;
    $("hud-toggle").focus({ preventScroll: true });
  };


  $("inspect-action").onclick = () => {
    if (state.chosen) openPanel("panel");
    else if (state.entries.length) select(state.entries[0]);
    else openPanel("library");
  };

  let noticeTimer;

  function notify(message) {
    $("notice").textContent = message; $("notice").hidden = false;
    clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { $("notice").hidden = true; }, 6000);
  }

  return { rebuild, select, setLoading, closePanels, notify, modelIcon, syncControls, refreshInspector, refreshHint };
}
