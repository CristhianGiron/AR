# ExplorAR

Laboratorio 3D con cámara opcional y colocación sobre superficies mediante WebXR, interacción directa, etiquetas conectadas y controles de giro precisos.

## Abrir el proyecto

Sirve esta carpeta con **Live Server** o ejecuta:

```bash
python3 -m http.server 8000
```

Abre `http://localhost:8000`. La carga del catálogo, los módulos JavaScript y los modelos necesita HTTP/HTTPS; abrir `index.html` con doble clic no permite cargarlos. La cámara requiere localhost o HTTPS.

## Experiencia educativa

ExplorAR está organizado como un recurso de exploración para estudiantes de 11 a 16 años:

- **Observar:** conocer la función del componente y localizar sus partes.
- **Ver solo este componente:** centrarlo y observarlo sin otros modelos alrededor.
- **Experimentar:** variar luz u obstáculos en los sensores compatibles y registrar observaciones.
- **Responder:** resolver una pregunta con pista y posibilidad de reintentar.
- **Para ir más allá:** comparar sensores o proponer una aplicación.

**Selecciona un componente** para ver cinco iconos flotantes: girar, mover, cambiar tamaño, **Ficha y reto** y **Más opciones**. El icono de libro abre la ficha directamente; Más opciones abre los ajustes completos, también en móvil. La composición recupera el escenario de aula, el personaje ilustrado, el logo destacado, los botones de colores, las fichas luminosas y la barra inferior de acciones de la referencia. La ficha principal reúne descripción, datos y exploración 3D en una sola vista. **Reto** y **Más datos** tienen accesos propios; sus paneles permiten volver directamente a la ficha. Los valores precisos y controles de respaldo quedan plegados. Solo se abre un panel a la vez. En escritorio amplio, Ficha, Más datos y Reto se integran a la derecha y permiten seguir manipulando la escena; en móvil se abren como paneles modales. Comparten una mayor altura disponible y espaciado compacto. Una eliminación se puede deshacer.

**Herramientas** aparece como una barra lateral integrada con botones de colores, visible de inicio en escritorio. El botón superior permite plegarla; en móvil empieza plegada y se despliega como una columna compacta sin bloquear la escena. Reúne modelos, carga local, Mi escena y ajustes. La cámara conserva un único acceso compacto en el pie. Los paneles extensos se recorren con flechas de página anterior y siguiente, sin barras verticales. El botón de despejar vista oculta las ayudas de exploración. Los conectores son líneas rectas en 3D: se ven delante de las etiquetas lejanas y se ocultan tras las etiquetas u objetos cercanos. Consulta las [decisiones y límites de accesibilidad](docs/accesibilidad.md).

Los retos se editan en `contenido/retos.json` y las partes de los seis sensores en `contenido/partes.json`. **Partes** abre puntos vinculados a piezas del modelo y una lista equivalente para teclado. **Experimentar**, disponible en la LDR, permite mover una luz virtual, comparar iluminación y resistencia relativas, anotar hasta 12 observaciones y explicar el resultado antes del reto. Es una simulación cualitativa, sin mediciones reales ni circuito eléctrico.

**Mi escena → Guardar o recuperar escenas** conserva componentes, modelos GLB importados, nombres, colores, posiciones, giros, tamaños, vista, respuestas y notas del experimento. **Guardar aquí** usa IndexedDB; **Guardar como otra escena** crea una copia. **Exportar archivo** descarga un `.explorar.json` portable con los GLB locales integrados; la importación sustituye la escena solo después de validar y preparar todos los modelos. Se admite hasta 128 MB, 64 componentes y 32 modelos locales. Una apertura fallida o cancelada conserva la escena anterior.

El guardado es manual. Al recargar se muestran los modelos iniciales: abre una escena guardada para continuar. Borrar datos del navegador elimina sus escenas; conserva una exportación como respaldo. No hay cuentas, sincronización ni envío de escenas a un servidor. Los archivos exportados incluyen el texto que escribas: no introduzcas datos personales. Consulta las novedades de [escenas y laboratorio](docs/version-1.1.md) y [misiones guiadas 1.2](docs/version-1.2.md).

**Mi escena → Misiones de exploración** ofrece tres recorridos: luz con la LDR, comparación de sensores infrarrojos y un robot que evita obstáculos con ultrasonidos. Cada paso abre su componente y herramienta, registra evidencias de acciones y permite volver al recorrido. El indicador de bandera recupera la misión; **Continuar exploración libre** cierra el recorrido. El avance y las justificaciones se conservan al guardar la escena. **Descargar evidencias** genera un texto con pasos, observaciones, respuestas y explicaciones para revisión docente; no califica automáticamente la calidad de lo escrito.

El **sensor ultrasónico → Experimentar** abre el laboratorio del eco. Un obstáculo 3D se arrastra directamente o se ajusta con teclado y botones. Puedes comparar un obstáculo cercano, uno lejano y la ausencia de eco; anotar hasta 12 observaciones; escribir tu regla para un robot; y conservarlo con la escena o descargarlo como evidencia. La actividad utiliza distancias simuladas entre 20 y 200 cm y un reflector frontal ideal; el dibujo tiene escala ilustrativa. La distancia precisa y la explicación del cálculo quedan plegadas. Consulta [laboratorio ultrasónico 1.3](docs/version-1.3.md).

## Colocar sobre una superficie real

Abre **Controles de vista (pie) → Colocar sobre una superficie · AR**. Elige el componente seleccionado o el conjunto visible y pulsa **Entrar en AR**. Busca una mesa o el suelo moviendo el dispositivo despacio; cuando aparezca el aro, pulsa **Colocar aquí** o toca la pantalla. Puedes ajustar tamaño, girar en pasos de 15° o buscar otro lugar.

Requiere HTTPS (o localhost de desarrollo), un dispositivo y un navegador con WebXR `immersive-ar` y `hit-test`. Se comprueba disponibilidad y se explica cómo continuar en 3D si no se admite. La cámara de fondo conserva su funcionamiento independiente. La colocación dura la sesión: no se guardan mapas del entorno ni posiciones AR en los archivos de escena. La dimensión mayor inicial es aproximadamente 50 cm; no representa el tamaño físico del sensor.

Es detección por intersección con superficies horizontales, sin reconstrucción completa de la habitación, oclusión real ni anclajes persistentes. La integración está comprobada con sesiones simuladas; la calidad y estabilidad del seguimiento requieren validar un teléfono real. Consulta [AR de superficies 1.4](docs/version-1.4.md) y el [protocolo físico](docs/validacion/dispositivos.md).

## Código y pruebas

El HTML, los estilos y la lógica están separados. Consulta [la arquitectura](docs/arquitectura.md) para localizar cada responsabilidad. No hace falta instalar npm para utilizar el sitio.

Para desarrollar y ejecutar las comprobaciones (Node.js 22.17 o posterior):

```bash
npm ci
npm run check
npm test
npm run test:browser
npm run test:accessibility
npm run test:pagination
npm run test:reference
npm run test:camera
npm run test:startup
npm run test:projects
npm run test:lab
npm run test:missions
npm run test:echo
npm run test:surfaces
```

La última orden requiere Chrome/Chromium. Usa `BROWSER_PATH` si el ejecutable está en otra ubicación. `npm run test:browser -- --all-models` incluye la colección completa.

## Catálogo de modelos

Los archivos están en `modelos-3d/`. El catálogo es `modelos-3d/catalogo.json`; tanto la biblioteca como la escena inicial leen ese archivo. El catálogo incluye seis sensores configurados para aparecer al inicio:

| Modelo | Archivo |
| --- | --- |
| Sensor PIR | `PIR.glb` |
| Sensor ultrasónico | `ultrasonico.glb` |
| Sensor de temperatura | `temperatura.glb` |
| Fotorresistencia LDR | `FOTORESISTENCIA.glb` |
| Sensor de color RGB | `rgb sensor.glb` |
| Sensor de lluvia | `humedad lluvia.glb` |

**Arduino UNO** (`arduino_uno.glb`) también está disponible en la biblioteca, como placa de desarrollo y con carga inicial desactivada.

Los nombres de archivo con espacios se admiten directamente en el JSON. La ficha del sensor de lluvia describe la detección de agua sobre la placa de electrodos. Los datos del catálogo explican la función de cada sensor; no asignan tensiones, rangos ni referencias comerciales que no estén documentados.

Para añadir otro modelo:

1. Copia su archivo `.glb` a `modelos-3d/`.
2. Añade una entrada en la lista `modelos` del JSON, con un `id` único.
3. Recarga la página o usa **Ajustes → Recargar modelos iniciales**. Esta acción sustituye la escena actual por los modelos marcados para cargar al inicio.

Ejemplo de entrada:

```json
{
  "id": "otro-sensor",
  "nombre": "Otro sensor",
  "archivo": "otro-sensor.glb",
  "categoria": "Sensores",
  "descripcion": "Descripción del objeto que aparecerá en su ficha.",
  "cargarAlInicio": false,
  "visualizacion": {
    "tamano": 1.6,
    "rotacion": [0, 0, 0],
    "alturaEtiqueta": 1.85
  },
  "datos": [
    { "etiqueta": "Función", "valor": "Información del modelo" }
  ]
}
```

- `archivo`: ruta relativa al catálogo, dentro de `modelos-3d/`. Los `.gltf` también se admiten si sus recursos acompañantes conservan sus rutas relativas. Los modelos con compresión Draco/KTX2 necesitan configurar sus decodificadores; el PIR actual no usa esas extensiones.
- `cargarAlInicio`: solo `true` añade el modelo automáticamente. Todos los modelos del catálogo aparecen en **Explorar modelos**.
- `tamano`: longitud de la dimensión mayor en la escena, entre 0 y 3 (sin incluir 0). Se centra el modelo y se conserva su proporción. No representa una medida física del sensor.
- `rotacion`: ángulos iniciales X/Y/Z en grados; el restablecimiento recupera esa orientación.
- `alturaEtiqueta`: altura inicial de la etiqueta, entre 0.8 y 3.4.
- `datos`: pares etiqueta/valor que se muestran en la ficha. Añade especificaciones técnicas solo cuando estén verificadas para ese modelo concreto.

Los materiales originales se conservan al cargar. El selector de color aplica un tinte; **Restablecer objeto** recupera los colores originales. Se pueden añadir varias copias del mismo modelo y manipularlas por separado.

## Cargar un modelo desde tu equipo

Pulsa **Cargar modelo** para abrir directamente el formulario local. También puedes abrir **Cargar desde mi equipo** dentro de **Explorar modelos**:

1. Selecciona un archivo `.glb` con sus texturas y buffers integrados.
2. Ajusta el nombre y, si quieres, escribe una descripción.
3. Pulsa **Añadir a la escena**.

El archivo se lee en el navegador, sin subirlo al servidor ni modificar `catalogo.json`. El modelo admite los mismos controles de selección, giro, movimiento, tamaño y color que los del catálogo. Si el GLB trae datos de autor, fuente o licencia, se muestran en su ficha.

Guarda o exporta la escena para conservar los modelos importados antes de recargar la página o usar **Recargar modelos iniciales**. Para incorporarlos permanentemente a la biblioteca, copia el GLB a `modelos-3d/` y regístralo en el JSON como se explica arriba.

## Explorar todos los componentes en conjunto

Abre **Controles de vista y conjunto** desde el pie para controlar toda la colección:

- **Acercar / alejar:** usa las lupas. También puedes usar la rueda sobre el fondo o pellizcar con dos dedos comenzando sobre el fondo.
- **Giro X/Y:** arrastra el fondo en horizontal y vertical. El botón de giro abre los ángulos exactos y permite limitar el arrastre a X o Y. Mantén Mayús al arrastrar con ratón para un giro más fino.
- **Conjunto activo:** los gestos controlan la colección incluso si comienzan sobre un componente. Dos dedos permiten girar mediante el desplazamiento y cambiar el zoom mediante el pellizco.
- **Control individual:** desactiva Conjunto o selecciona un modelo desde Mi escena. Los gestos sobre el objeto vuelven a modificar solo ese componente; la rueda sobre él cambia su tamaño.
- **Restablecer vista:** recupera el encuadre inicial, sin restablecer las posiciones, tamaños o giros individuales.

Estos controles actúan sobre la cámara, así que los componentes conservan su configuración y su disposición relativa. Las etiquetas siguen mirando hacia el usuario. El botón de controles de vista permanece accesible con la vista despejada.

## Presentación visual

El banner de modo se oculta temporalmente cuando se cruza con una etiqueta y reaparece al quedar libre. Mantiene su espacio para evitar saltos; no modifica la posición de los nombres ni el encuadre. `npm run test:banner` reproduce el solapamiento del sensor de temperatura y compara los píxeles visibles.

La escena 3D se centra siempre respecto a toda la pantalla. Los paneles se superponen sin desplazar ni modificar el encuadre. La tipografía usa Comic Sans MS o Comic Sans si están instaladas, con respaldo cursivo del sistema; las etiquetas 3D usan la misma familia. No se distribuyen archivos de esa fuente.

El fondo de aula es una imagen decorativa de la vista **Exploración 3D**. Al activar la cámara se muestra el vídeo del dispositivo y el indicador cambia a **Realidad Aumentada**. El personaje y las formas decorativas no capturan pulsaciones; el botón de despejar vista permite ocultarlos. En pantallas pequeñas se omite el personaje para dejar espacio a los componentes. Los [recursos y prompts](assets/README.md) documentan las imágenes preparadas a partir de la referencia.

## Cierre y entrega

- [AR de superficies 1.4](docs/version-1.4.md); [novedades 1.3](docs/version-1.3.md); [misiones 1.2](docs/version-1.2.md) y [escenas/laboratorio 1.1](docs/version-1.1.md); [alcance histórico 1.0](docs/alcance-v1.md) y [procedimiento de cierre](docs/cierre-v1.md).
- [Guía para estudiantes](docs/guia-estudiantes.md) y [guía docente](docs/guia-docentes.md).
- [Créditos y procedencia de modelos](docs/creditos-modelos.md).
- [Publicación y empaquetado](docs/publicacion.md).
- Protocolos pendientes de [dispositivos físicos](docs/validacion/dispositivos.md) y [piloto educativo](docs/validacion/piloto-educativo.md).

Para generar una evidencia de cierre y preparar el candidato local:

```bash
npm run audit:models
npm run verify:release
npm run release:prepare
```

El informe queda en `reports/` y el paquete en `dist/`. La preparación no publica el sitio ni declara resueltos los pendientes humanos o de autoría.

## Dependencias

Three.js 0.160.1 y su GLTFLoader se incluyen en `vendor/three/` para funcionar sin una CDN. Su licencia MIT está en `vendor/three/LICENSE`. No se requieren paquetes npm para ejecutar el proyecto.

## Créditos de modelos

**Arduino UNO**, de [Helindu](https://sketchfab.com/Helindu), procede de [Sketchfab](https://sketchfab.com/3d-models/arduino-uno-51dd4e0cdfad4c4c95354bc5e29dcf1a) y se distribuye bajo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), según los metadatos del propio GLB. La aplicación ajusta su escala y presentación para visualizarlo; conserva sus materiales. El archivo `arduino-uno.zip` se conserva como recurso original y no se necesita para cargar el GLB.
