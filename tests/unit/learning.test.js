import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateLessons, evaluateAnswer } from "../../src/education/lessons.js";
import { wrapAngle, snapRotation } from "../../src/core/math.js";

const content = JSON.parse(readFileSync(new URL("../../contenido/retos.json", import.meta.url)));
const catalog = JSON.parse(readFileSync(new URL("../../modelos-3d/catalogo.json", import.meta.url)));

test("cada reto corresponde a un componente real y tiene una única respuesta definida", () => {
  const lessons = validateLessons(content);
  const ids = new Set(catalog.modelos.map((model) => model.id));
  for (const [id, lesson] of lessons) {
    assert.ok(ids.has(id), id);
    const results = lesson.opciones.map((_, index) => evaluateAnswer(lesson, index));
    assert.equal(results.filter((result) => result.correct).length, 1);
    assert.ok(results.every((result) => result.message.length > 20));
  }
});

test("una respuesta incorrecta ofrece una pista y permite evaluar un nuevo intento", () => {
  const lesson = content.retos[0];
  const wrong = (lesson.correcta + 1) % lesson.opciones.length;
  assert.equal(evaluateAnswer(lesson, wrong).correct, false);
  assert.ok(evaluateAnswer(lesson, wrong).message.includes(lesson.pista));
  assert.equal(evaluateAnswer(lesson, lesson.correcta).correct, true);
  assert.throws(() => evaluateAnswer(lesson, -1), RangeError);
});

test("rechaza preguntas duplicadas, vacías o con una respuesta fuera de las opciones", () => {
  assert.throws(() => validateLessons({ version: 2, retos: [] }));
  assert.throws(() => validateLessons({ version: 1, retos: [content.retos[0], content.retos[0]] }));
  assert.throws(() => validateLessons({ version: 1, retos: [{ ...content.retos[0], correcta: 100 }] }));
  assert.throws(() => validateLessons({ version: 1, retos: [{ ...content.retos[0], pregunta: "" }] }));
  assert.throws(() => validateLessons({ version: 1, retos: [{ ...content.retos[0], opciones: ["Luz", "luz"], correcta: 0 }] }));
  assert.throws(() => validateLessons({ version: 1, retos: [{ ...content.retos[0], resumen: 123 }] }));
});

test("mantiene precisión decimal y continuidad al dar vueltas completas", () => {
  assert.equal(wrapAngle(725.4), 5.4);
  assert.equal(wrapAngle(-360), 0);
  assert.equal(wrapAngle(180), -180);
  assert.equal(wrapAngle(12.3), 12.3);
  assert.equal(snapRotation(14, 5), 15);
});
