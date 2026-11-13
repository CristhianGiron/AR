/** Content validation and answer evaluation stay independent of the DOM and 3D engine. */
export function validateLessons(data) {
  if (data?.version !== 1 || !Array.isArray(data.retos)) throw new Error("Formato de retos no compatible.");
  const lessons = new Map();
  for (const lesson of data.retos) {
    const fields = ["modelo", "objetivo", "observa", "pregunta", "explicacion", "pista", "profundiza"];
    if (!fields.every((key) => typeof lesson?.[key] === "string" && lesson[key].trim()) ||
      (lesson.resumen !== undefined && typeof lesson.resumen !== "string") ||
      lessons.has(lesson.modelo) || !Array.isArray(lesson.opciones) || lesson.opciones.length < 2 ||
      !lesson.opciones.every((option) => typeof option === "string" && option.trim()) ||
      new Set(lesson.opciones.map((option) => option.trim().toLocaleLowerCase("es"))).size !== lesson.opciones.length ||
      !Number.isInteger(lesson.correcta) || lesson.correcta < 0 || lesson.correcta >= lesson.opciones.length) {
      throw new Error("Hay un reto incompleto o con una respuesta no válida.");
    }
    lessons.set(lesson.modelo, lesson);
  }
  return lessons;
}

export function evaluateAnswer(lesson, index) {
  if (!Number.isInteger(index) || index < 0 || index >= lesson.opciones.length) throw new RangeError("Opción no válida.");
  const correct = index === lesson.correcta;
  return { correct, message: correct ? "Correcto. " + lesson.explicacion : "Revisa esta pista: " + lesson.pista };
}
