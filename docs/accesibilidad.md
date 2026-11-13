# Accesibilidad y uso educativo

ExplorAR está orientado a estudiantes de 11 a 16 años. El objetivo de implementación es **WCAG 2.2 nivel AA**, con controles táctiles de al menos 44 × 44 píxeles CSS como mejora adicional. Este documento registra decisiones y comprobaciones; no constituye una certificación de conformidad ni una evaluación jurídica. No se ha definido una jurisdicción ni un procedimiento institucional de acreditación.

## Referencias y decisiones

| Referencia | Aplicación en ExplorAR | Evidencia y límites |
| --- | --- | --- |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/), especialmente teclado, nombres, contraste, reflujo y foco | Controles HTML etiquetados, foco visible, paneles con título, alternativa textual de la escena y selección mediante Mi escena. | Auditoría axe y pruebas de teclado/reflujo. La exploración visual de la geometría necesita evaluación con usuarios y tecnologías de asistencia. |
| [2.5.7 Movimientos de arrastre, AA](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) | Posición X/Z mediante números y pulsaciones; tamaño, altura de etiqueta y ángulos mediante números; zoom conjunto mediante botones y giro conjunto mediante números. | Las pruebas funcionales comprueban los cambios sin arrastrar. Los gestos y sliders siguen disponibles. |
| [2.5.5 Tamaño del objetivo mejorado, AAA](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) | Objetivo adicional de 44 × 44 px para controles de interfaz. | Medición de controles en los estados auditados. Aplicar este criterio no equivale a conformidad AAA de toda la aplicación. Los enlaces en texto y los objetos 3D requieren consideración propia; Mi escena permite seleccionar mediante botones. |
| [Patrón de diálogo modal de WAI-ARIA](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Un único panel de contenido abierto; título enfocado al entrar, Tab contenido, Escape/cierre y retorno al activador visible. Al abrir una escena aparece temporalmente un diálogo de progreso cancelable sobre el gestor. | Pruebas de navegador. Es una guía de implementación, no una certificación. |
| [XR Accessibility User Requirements](https://www.w3.org/TR/xaur/) | Información por texto, ajustes alternativos, restablecimiento, visibilidad de ayudas y detalles bajo demanda. | Referencia de diseño. La cámara de fondo es opcional; el modo WebXR 1.4 incorpora colocación espacial en dispositivos compatibles y mantiene la exploración 3D como alternativa. |
| [Diseño Universal para el Aprendizaje, CAST](https://udlguidelines.cast.org/) | Observar y responder separados; fichas y retos voluntarios, pistas, reintentos y actividades de comparación. | Orientación pedagógica; aún requiere validar comprensión y facilidad de uso con estudiantes y docentes. |

## Interfaz progresiva

Al iniciar se muestra la escena sin selección. Al seleccionar un componente aparecen **girar, mover, tamaño, ficha y reto y más opciones** junto al objeto. Solo Más opciones abre el editor completo; sus ajustes de precisión, valores y controles de respaldo están plegados. El icono de libro abre Ficha y reto directamente, sin pasar por el editor.

Herramientas es una navegación lateral integrada (`aside` y `nav`), sin fondo modal ni captura de foco. Está visible de inicio en escritorio y plegada en móvil. El activador anuncia su estado; Escape permite plegarla desde la navegación y devuelve el foco. Reúne biblioteca, carga local, escena y ajustes. La cámara mantiene un único botón compacto en el pie. Los controles del conjunto se abren desde el pie. Los paneles secundarios se abren de uno en uno; el fondo queda inactivo mientras se usa un diálogo modal. En escritorio amplio Ficha, Más datos y Reto se integran como paneles laterales y permiten interactuar con la escena; el foco puede entrar y salir de ella, y Escape la cierra. En móvil esos paneles pasan a modalidad de diálogo. Cerrarlo devuelve la interacción a la escena. El botón de despejar vista permite ocultar las ayudas de exploración y recuperarlas.

La ficha principal del catálogo se muestra en una sola vista con descripción, datos y exploración 3D. Los botones Reto y Más datos abren contenidos independientes; su flecha de regreso y Escape vuelven a la ficha y enfocan el acceso utilizado. El contenido extenso de las superficies secundarias se divide en páginas con dos flechas de al menos 44 × 44 px, indicador de página y estados desactivados en los extremos. No hay barras de desplazamiento vertical en los paneles ni en la navegación. Los controles conservan su fila completa; el texto largo cambia de página entre líneas. Los elementos fuera de página quedan inertes y ocultos para tecnologías de asistencia. La validación revela y enfoca el campo requerido, aunque esté en otra página.

Los conectores son líneas rectas dentro de la escena 3D y no capturan pulsaciones. Su profundidad respeta las etiquetas y los modelos: una línea cercana pasa delante de una etiqueta lejana y una etiqueta cercana oculta una línea situada detrás. Las esquinas transparentes de las etiquetas no escriben profundidad. La ficha y Mi escena proporcionan los nombres en HTML accesible.

El aula es un fondo decorativo; la cámara real se activa por petición del usuario. El personaje tiene texto alternativo vacío y no captura eventos. Se omite en pantallas pequeñas y al despejar la vista. La ficha muestra una miniatura del modelo real y mantiene las descripciones textuales.

## Comprobaciones reproducibles

```bash
npm run check
npm test
npm run test:browser
npm run test:browser -- --all-models
npm run test:accessibility
npm run test:pagination
npm run test:reference
```

Las pruebas necesitan Chrome/Chromium (`BROWSER_PATH` permite cambiar su ruta). Los informes y capturas se guardan en `/tmp/explorar-qa` cuando esa es la carpeta temporal del sistema.

- Funcionalidad: selección, cinco acciones rápidas, exclusión de paneles, foco y Escape, alternativas sin arrastre, retos, importación/deshacer, vista conjunta y gestos táctiles.
- Conectores: comprobación de píxeles WebGL con etiquetas delante y detrás de una línea, esquinas transparentes, extremo sobre la superficie y retirada/recreación del conector.
- Auditoría axe: reglas A/AA de WCAG 2.0/2.1/2.2 y buenas prácticas, en estados inicial, selección, herramientas, biblioteca, importación, escena, ayuda, editor plegado/expandido, ficha, cuestionario, respuesta y controles conjuntos.
- Paginación: recorrido con flechas de biblioteca completa, listas extensas, formularios, ayuda, retos y ajustes; controles sin recortar, sin contenedores con desplazamiento vertical y foco de validación.
- Adaptación: 320, 390, 844 y 1280 px; paneles sin desbordamiento horizontal, fila contextual compacta y preferencia de movimiento reducido.

La auditoría realizada no detectó infracciones automáticas en los estados comprobados. El informe conserva también los resultados incompletos que requieren revisión humana, por ejemplo el contraste de texto sobre gradientes o la escena 3D. Los resultados cubren esos estados y el navegador probado, no todos los criterios WCAG ni todos los dispositivos.

Los protocolos presenciales están en [dispositivos](validacion/dispositivos.md) y [piloto educativo](validacion/piloto-educativo.md). La verificación de entrega guarda evidencia persistente en `reports/` mediante `npm run verify:release`.

## Evaluación pendiente antes de declarar conformidad

Realizar una revisión humana de todos los criterios WCAG aplicables, incluidos contraste sobre fondos cambiantes, foco durante desplazamientos, ampliación y espaciado de texto, lectura y orden de anuncios con NVDA/VoiceOver/TalkBack, y uso completo con teclado o control por voz. Probar cámara y rendimiento en dispositivos físicos; observar sesiones con estudiantes de las edades previstas, incluyendo necesidades visuales, motoras y cognitivas, y revisión docente del contenido.

El sitio no pide identidad. El guardado manual conserva respuestas y notas junto con la escena en IndexedDB o en el archivo exportado. La importación GLB se realiza en el navegador; las escenas no se envían a un servidor. Evite introducir información personal. Cualquier futura cuenta, analítica, evaluación persistente o publicación institucional requiere revisar los requisitos de privacidad y educación aplicables a ese contexto.

## Herramientas educativas 1.1

Los puntos de las partes tienen una lista de botones equivalente; las partes ocultas requieren girar el modelo o elegirlas en la lista. El laboratorio LDR admite arrastre, flechas, Inicio/Fin y botones para variar la luz. Las lecturas usan texto además de medidores. Observaciones, explicaciones y escenas se guardan solo por petición. Las nuevas superficies comparten la paginación, el retorno a la ficha y el comportamiento integrado en escritorio. `npm run test:lab` comprueba sus páginas y axe en cuatro tamaños; sigue pendiente la evaluación humana con alumnado y tecnologías de apoyo.

Las misiones 1.2 admiten navegación por pasos y salida a exploración libre. El retorno desde las herramientas recupera la misión activa. El indicador de progreso describe acciones con evidencia; no usa una calificación de escritura. `npm run test:missions` verifica las páginas de los dos recorridos a 320/390/844/1280 px, sus controles completos y axe. La revisión humana continúa pendiente.

## Laboratorio ultrasónico (1.3)

El obstáculo 3D dispone de un control HTML con nombre, valor, texto de resultado, flechas e Inicio/Fin; los botones Acercar/Alejar permiten completar la actividad sin arrastrar. La presencia del obstáculo usa un control etiquetado. Los datos del eco se expresan en texto, además del dibujo y sus colores. No hay animación automática ni sonido. El esquema se activa por petición y se cierra al cambiar a otro componente o despejar la vista. `test:echo` recorre las páginas y ejecuta axe en 320/390/844/1280 px; no sustituye la evaluación humana ni dispositivos físicos.

## Colocación sobre superficies (1.4)

El acceso y la explicación utilizan el panel paginado existente. En AR, la superposición DOM ofrece Colocar, Otro lugar, tamaño y giros por pulsación, mensajes textuales y salida. El resto de la interfaz queda inerte durante la sesión y se restaura al salir. El gesto de tocar puede colocar con la guía válida; los controles de la superposición bloquean ese gesto para evitar colocaciones accidentales. Si el navegador no admite superposición DOM, solo están disponibles la guía y el toque de colocación, con la salida del navegador.

La exploración 3D sigue disponible y no exige cámara ni seguimiento físico. El movimiento del dispositivo para buscar una superficie y la lectura de la guía requieren evaluación humana en equipos reales. `test:surfaces` usa sesiones XR simuladas para revisar estados, errores, permisos tardíos, conservación de la escena, controles táctiles y paginación; no certifica accesibilidad o estabilidad de un visor real.
