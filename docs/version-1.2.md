# ExplorAR 1.2 — recorridos guiados

Extiende [escenas y laboratorio 1.1](version-1.1.md) con dos misiones que conectan exploración, experimentación y explicación:

- **¿Cuándo encenderías una luz?** Visitar partes de la LDR, anotar luz alta y baja, explicar el cambio y resolver el reto.
- **Dos sensores, distintas preguntas.** Explorar PIR y temperatura, responder ambos retos y justificar una elección.

Acceso: **Mi escena → Misiones de exploración**. Cada paso abre su componente y herramienta. La flecha de regreso y Escape recuperan el recorrido activo; la bandera del pie vuelve a él. Se puede retroceder, repetir acciones o continuar exploración libre. El progreso se deriva de las evidencias existentes, sin borrar trabajo anterior ni forzar una secuencia.

El guardado de escenas conserva misión, paso, notas y sus evidencias. Los archivos 1.1 siguen siendo compatibles. **Descargar evidencias** produce un TXT con pasos, observaciones simuladas, respuestas y explicaciones, sin solicitar identidad. El texto puede contener lo escrito por el usuario: evite datos personales.

Los indicadores verifican acciones y presencia de escritura; la longitud mínima de una frase no evalúa comprensión. La corrección y calidad de las explicaciones requieren revisión docente. No se afirma validación pedagógica ni certificación normativa.

Los recorridos se editan en `contenido/misiones.json`. Su validador comprueba estructura, actividades admitidas y referencias al catálogo. Si no se pueden cargar, permanece disponible la exploración libre.

Verificación: `npm run test:missions`, `npm run verify:release` y el informe actual de `reports/latest.json`. Continúan pendientes dispositivos físicos, revisión humana de accesibilidad, piloto educativo, AR espacial y alojamiento HTTPS; véanse los protocolos de validación y publicación.
