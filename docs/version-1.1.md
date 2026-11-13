# ExplorAR 1.1 — escenas y experimentación

Esta versión añade continuidad al trabajo y una actividad interactiva sin cambiar el encuadre centrado ni el diseño inspirado en la referencia.

## Novedades

- Guardado manual en el navegador, copias, apertura, eliminación con deshacer y exportación/importación `.explorar.json` con GLB locales integrados. Conserva nombres, tintes, posición, giro, tamaño, etiquetas, vista, selección, aislamiento, respuestas y notas. Límite: 128 MB, 64 componentes y 32 recursos locales; el navegador puede disponer de menos espacio.
- Puntos de exploración vinculados a nodos de los seis sensores, con lista accesible y explicación breve por pieza. La oclusión utiliza profundidad de la escena; girar permite descubrir partes ocultas. Arduino y modelos propios importados mantienen exploración libre sin puntos predefinidos.
- Laboratorio LDR: predicción, luz virtual controlable por arrastre, teclado o botones, lecturas relativas, hasta 12 observaciones, explicación y regreso al reto. La actividad se conserva dentro de una escena guardada.
- Paneles integrados en escritorio amplio y paginados cuando hace falta; modos opcionales para evitar sobrecargar el lienzo.

## Conservar el trabajo

Desde **Mi escena → Guardar o recuperar escenas**, guardar actualiza la escena abierta; guardar como otra crea una copia. Exportar permite conservar un respaldo fuera del navegador o llevar la escena a otro equipo con el mismo catálogo. Abrir valida y prepara todos los modelos antes de sustituir la escena; si falla o se cancela, conserva los objetos anteriores.

Al recargar se muestran los modelos iniciales: hay que abrir lo guardado. No hay guardado automático. Borrar datos del sitio elimina IndexedDB. El archivo exportado incluye GLB locales y todo texto escrito; no introduzca datos personales. No hay cuentas, analítica ni envío de escenas a un servidor.

## Límites y validación

La luz es una representación cualitativa, sin unidades físicas: más iluminación implica menor resistencia. La relación simplificada no es una curva calibrada, una lectura real ni un simulador de circuito. Fuente: [Adafruit, Photocells](https://learn.adafruit.com/adafruit-arduino-lesson-9-sensing-light/photocells).

La cámara sigue siendo un fondo opcional. No se implementa detección de superficies, seguimiento espacial, colaboración ni backend. Continúan pendientes las pruebas en dispositivos físicos, la revisión humana de accesibilidad, el piloto con alumnado y la publicación HTTPS. No se declara certificación normativa ni validación pedagógica realizada.

`npm run verify:release` comprueba las fuentes actuales y genera evidencias en `reports/`; `npm run release:prepare` solo empaqueta una huella aprobada. No use una entrega antigua como evidencia de esta versión.
