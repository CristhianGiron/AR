# Guía docente de ExplorAR

Destinatarios: estudiantes de 11 a 16 años. Propósito: reconocer componentes, relacionar su forma y función y proponer aplicaciones. La aplicación no sustituye una práctica de medición o montaje eléctrico.

## Preparar la sesión

Compruebe que los archivos, el sitio y la cámara funcionan en los equipos del aula. La cámara es opcional; para usarla desde un teléfono la dirección debe proporcionar un contexto seguro, normalmente HTTPS. Valide el contenido de los sensores para su grupo antes de impartir la actividad. No use la superposición de cámara como demostración de detección de superficies.

Explique el guardado manual desde **Mi escena → Guardar o recuperar escenas**. Recargar descarta los cambios sin guardar; después hay que abrir la escena guardada. El guardado en navegador utiliza el almacenamiento local del sitio. Una exportación incluye modelos importados, respuestas y notas escritas; permita guardarla en la ubicación acordada por el centro. No hay cuentas ni envío de resultados a un servidor. No solicite nombres ni otros datos personales dentro de los campos.

Para la LDR, pida una predicción, dos observaciones con distinta iluminación y una explicación antes de responder el reto. La resistencia disminuye al aumentar la iluminación, pero los valores de la actividad son relativos: no representan lux, ohmios ni una curva calibrada. El movimiento horizontal de la luz controla una relación cualitativa; no calcula óptica ni iluminación del entorno. Puede utilizarse sin cámara. Fuente del principio: [Adafruit, Photocells](https://learn.adafruit.com/adafruit-arduino-lesson-9-sensing-light/photocells).

## Propuesta de sesión de 20 a 30 minutos

| Etapa | Actividad | Evidencia observable |
| --- | --- | --- |
| Inicio, 3 minutos | Elegir un sensor y explicar qué se espera descubrir | El estudiante localiza el objeto y su ficha |
| Exploración, 7 minutos | Girar, acercar y observar las partes; aislar el componente | Describe dos partes visibles con sus palabras |
| Comprensión, 7 minutos | Resolver Reto, leer una pista y justificar la elección | Relaciona función y característica observable |
| Transferencia, 5 minutos | Comparar dos sensores o plantear una aplicación | Explica qué sensor elegiría y por qué |
| Cierre, 3 minutos | Compartir hallazgos y dudas | Distingue observación del modelo de medición real |

Para el grupo de 11 a 13 años, trabaje primero con luz y lluvia y dé instrucciones breves de una acción. Para 14 a 16 años, proponga comparar principios de detección y justificar límites de una aplicación. Son propuestas de actividad que requieren ajuste y validación docente, no resultados de una evaluación pedagógica realizada.

## Criterios orientativos

- **Inicial:** reconoce el componente con ayuda y describe una parte.
- **En desarrollo:** usa la ficha y relaciona la función con dos partes.
- **Consolidado:** compara componentes y justifica una aplicación y una limitación.

Permita responder oralmente, por escrito o con un esquema. No vincule el desempeño a la rapidez para arrastrar o usar gestos. Existen controles numéricos y selección mediante Mi escena.

Edite contenidos en `contenido/retos.json` y datos de modelos en `modelos-3d/catalogo.json`. Conserve ids coincidentes y una explicación útil por pregunta. Ejecute las comprobaciones después de modificar el material. Registre observaciones del piloto en `validacion/piloto-educativo.md`.

## Recorridos guiados

**Mi escena → Misiones de exploración** incluye «¿Cuándo encenderías una luz?» (LDR) y «Dos sensores, distintas preguntas» (PIR y temperatura). Los pasos abren la pieza y la herramienta; al volver se actualizan las evidencias. La comparación de luz requiere una observación alta y otra baja. Las explicaciones y justificaciones se registran a partir de 20 caracteres, como comprobación de escritura: este indicador no evalúa su corrección, coherencia ni comprensión. Revise el contenido con los criterios orientativos de esta guía.

**Descargar evidencias** exporta un TXT con acciones, observaciones simuladas, respuestas y explicaciones. No añade nombres ni identidades; contiene lo que se haya escrito. **Guardar avance** conserva el recorrido, el paso y la justificación junto a la escena. Los contenidos se editan en `contenido/misiones.json`; los modelos referidos deben existir en el catálogo. Puede regresar a exploración libre en cualquier momento.

## Laboratorio del eco (1.3)

La tercera misión, **Un robot que evita obstáculos**, pide visitar emisor y receptor, anotar un caso cercano (20–60 cm), otro lejano (140–200 cm) y uno sin obstáculo, explicar una regla y resolver el reto. Los intervalos son decisiones didácticas de la actividad, no especificaciones del módulo representado.

El modelo usa un reflector frontal ideal y una velocidad elegida de 343 m/s: `t = 2d / c`, con distancia en metros y tiempo en segundos. No representa temperatura, directividad, geometría o absorción de materiales. La posición dibujada ilustra el recorrido sin guardar una escala física proporcional; las lecturas se calculan a partir de la distancia elegida. Fuente de la relación entre eco y distancia: [MathWorks, readEchoTime](https://www.mathworks.com/help/matlab/supportpkg/readechotime.html).

Primero solicite una predicción, después las tres observaciones y una explicación del doble recorrido. Distinga una distancia de cero de la ausencia de eco. El texto y las observaciones se incluyen al guardar la escena y en el TXT de evidencias; el docente revisa la calidad de la explicación. Esta actividad es simulada, sin conexión a sensores ni medición de la cámara.

## Detección de superficies (1.4)

La entrada AR está en los controles de vista, separada del botón de cámara de fondo. Usa WebXR Hit Test para buscar superficies horizontales y colocar copias de los modelos. Prepare una dirección HTTPS y pruebe el dispositivo concreto antes de la clase; la disponibilidad de WebXR AR y del hit test depende del navegador y el hardware. No se declara compatibilidad universal.

Una guía aparece al detectar una superficie válida. Tras colocar se puede girar en pasos o ajustar tamaño, y «Otro lugar» vuelve a buscar. Pérdida de seguimiento oculta temporalmente el modelo; un cambio del origen de seguimiento exige recolocar. Los mapas y poses del entorno no se exportan ni se conservan al terminar. El conjunto inicia en unos 50 cm como representación didáctica ampliada. No use esa visualización para enseñar dimensiones físicas reales.

La verificación automática cubre sesiones simuladas, no estabilidad del seguimiento real. Registre el modelo de teléfono, navegador, condiciones de mesa/suelo, permisos, precisión, deriva, recolocación y salida en el protocolo de dispositivos. Mantenga la alternativa 3D para las actividades.
