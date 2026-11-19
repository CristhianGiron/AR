// Distinguish unavailable graphics from a failed application/module download.
import("./main.js").then(({app})=>app.ready).catch((error) => {
  console.error("No se pudo iniciar ExplorAR:", error);
  document.getElementById("loading-indicator").hidden = true;
  const notice = document.getElementById("notice");
  notice.textContent = error.name === 'SceneGraphicsError'
    ? "No se pudieron activar los gráficos de la vista 3D. Cierra otras pestañas que usen gráficos y vuelve a cargar la página."
    : "No se pudo completar la carga de ExplorAR. Vuelve a cargar la página para intentarlo de nuevo.";
  notice.hidden = false;
});
