# Taller de engranajes

## Vista para la clase

La presentación mantiene la línea cómic del visor: botones independientes azules y violetas, temas diferenciados en amarillo, turquesa y violeta, tarjetas de cálculo amarillas y paneles de bordes redondeados. `styles/gear-comic.css` concentra esta coherencia visual sobre las reglas de densidad. Los iconos de reproducción, pausa, paso, ajustes y cierre son SVG con el mismo lienzo y alineación centrada; sus nombres accesibles se conservan. El botón flotante **Mi clase** usa el ancho de su texto, sin heredar el 100 % de los botones de panel.

El visor abre con el modelo despejado, sin panel lateral ni menú de herramientas desplegado. Un grupo de botones flotantes independientes, sin fondo de barra compartido, reúne el selector **Rectos · Cónicos · Helicoidales**, **Iniciar/Pausar**, **Paso** y **Ajustar** y **Mi taller** abren el mismo panel, organizado en tres pestañas persistentes:

- **Manipular:** reproducción, pausa, paso, sentido de giro, velocidad, separación, montaje y aislamiento de piezas. **Dientes y relación** reúne los campos y ejemplos; **Diseño avanzado** permite ajustar dientes, módulo, ancho y agujero o recuperar el OBJ. **Aspecto y posición** conserva la edición del objeto y **Vista y cámara**, los controles de visualización.
- **Aprender:** explicaciones de dientes y relación, velocidad y sentido de giro, y un ejemplo de torque. Incluye la ficha del modelo. Las fórmulas se actualizan con los ajustes realizados en Manipular.
- **Escenas:** guardar, exportar, abrir y recuperar escenas; añadir o importar modelos; seleccionar los objetos de la escena.

El selector **Rectos · Cónicos · Helicoidales** permanece arriba al cambiar de sección. Las pestañas conservan los campos, el tema didáctico y la posición de desplazamiento; se pueden recorrer con las flechas del teclado, Inicio y Fin. Las opciones avanzadas son desplegables dentro del mismo panel. En escritorio el panel deja el modelo interactivo al lado; en celular funciona como una hoja con desplazamiento nativo, cabecera y pestañas siempre accesibles. Aplicar dientes, reproducir o abrir una escena mantiene el taller abierto. La cruz y Escape permiten despejar el modelo; el foco vuelve al botón que abrió el taller.

Cambiar únicamente las RPM conserva el OBJ original; cambiar dientes genera un par paramétrico. Los errores conservan el modelo y se muestran junto a sus campos. El diseño avanzado solo está disponible en los rectos: los cónicos y helicoidales conservan sus dientes originales. Las escenas guardan el diseño y los ajustes del mecanismo.

La relación usa la convención `R = Z₂/Z₁`; la velocidad de salida es `n₂ = n₁/R`. Con 20 y 40 dientes y una entrada de 100 rpm, la salida es de 50 rpm. Para los modelos recto y helicoidal se explica el sentido opuesto de ejes paralelos; los cónicos transmiten entre ejes perpendiculares. La conversión a rad/s queda desplegable. El ejemplo de torque usa `T = F × r`: 10 N y 0,5 m producen 5 N·m. Es un cálculo independiente; no aplica fuerzas al motor 3D ni se guarda con la escena.

`src/ui/gear-center.js` integra los controles existentes sin clonarlos, preservando los eventos y los identificadores. La integración solo se activa para la colección de engranajes; el laboratorio de sensores conserva sus superficies originales. `styles/gear-center.css` organiza el panel con la misma paleta y botones cómic.

`npm run test:gear-dock` comprueba inicio despejado, edición y validación, conservación del OBJ al cambiar velocidad, pestañas persistentes, guardado y restauración dentro del taller, foco al cerrar, teclado y accesibilidad automática a 320/390/844/1280 px, incluida orientación horizontal. Las pruebas de clase, diseñador, selector, motor, HUD y coherencia cómic cubren las capacidades desde la nueva organización.

## Datos sobre cada rueda

El botón **HUD**, en la cabecera, activa u oculta dos etiquetas pequeñas conectadas al eje de cada rueda. Se actualizan al mover el modelo o cambiar su velocidad, sentido o estado:

- **rpm:** velocidad de la simulación mientras el motor funciona. En pausa indica 0; la última línea conserva la velocidad configurada.
- **Dientes:** cantidad de la rueda de entrada o salida.
- **ω:** velocidad angular en rad/s, calculada con `rpm × 2π/60`.
- **θ:** ángulo local de la rueda, normalizado a una vuelta (0–360°).
- **Sentido:** flecha de giro respecto a su eje local; depende del punto de vista, especialmente en los cónicos.

Son datos de la simulación, no mediciones de un sensor. No se muestran fuerzas ni torque reales porque el motor no los simula. Las etiquetas solo corresponden al mecanismo seleccionado; siguen sus ejes sin girar el texto, evitan controles, el nombre del modelo y otras etiquetas, y ocultan la pieza aislada o fuera de pantalla. Si no hay espacio libre, se oculta la etiqueta en lugar de tapar un control. El HUD no intercepta gestos del lienzo ni anuncia valores a lectores de pantalla a cada fotograma. Se oculta al abrir un panel modal, despejar la vista o entrar en AR espacial; el HUD actual corresponde al visor 3D.

`npm run test:gear-hud` verifica valores, pausa y ajustes, reversa, conexión al modelo, visibilidad, aislamiento, colisiones de etiquetas y accesibilidad automática a 320/390/1280 px.

## Taller completo

La colección activa es **engranajes**. Al abrir el visor aparece el par recto; en **Herramientas del docente → Abrir taller completo → Tipo de engranaje** se puede cambiar a cónicos o helicoidales. Explorar modelos muestra únicamente esta colección. Los modelos y contenidos de sensores se conservan en el repositorio, fuera de la colección activa.

En celular, iniciar el movimiento, girar un paso o separar y montar cierra el panel para ver el resultado. La barra compacta permite iniciar/pausar, avanzar un paso, separar/montar y volver a Ajustar. El motor solo arranca al pulsar su control; no se activa automáticamente al abrir la página.

- **Poner en marcha / Pausar:** mueve las ruedas sobre sus ejes locales, sin girar el conjunto como una sola pieza.
- **Velocidad de entrada:** de 1 a 120 rpm. La salida respeta `rpm de entrada × dientes de entrada / dientes de salida`.
- **Invertir sentido:** invierte el motor; **Girar un paso** avanza 15 grados del eje de entrada cuando las ruedas están montadas.
- **Separar piezas / Separación:** abre el conjunto y desconecta el motor. En Examinar una pieza, elige la rueda que girará por pasos. **Ver solo esta pieza** oculta la otra sin borrarla.
- **Volver a montar:** recupera posiciones y fases originales; conserva la velocidad y el sentido elegidos. **Restablecer mecanismo** recupera también 12 rpm y el sentido inicial.
- **Guardar o recuperar escenas:** conserva separación, fases, pieza aislada, velocidad y sentido. Las escenas se abren con el motor pausado.

## Modelos y configuración

### Diseñar la cantidad de dientes

En **Engranajes rectos → Cambiar cantidad de dientes** se abre el diseñador. Introduce los dientes de entrada y salida y pulsa **Generar y aplicar par**. Se construyen dos mallas nuevas con esa cantidad de dientes; el OBJ original permanece intacto y se puede recuperar desde el mismo diseñador.

| Parámetro | Valores admitidos | Inicial |
| --- | --- | --- |
| Dientes de cada rueda | Enteros de 18 a 120 | 20 / 40 |
| Módulo común | 0,5 a 5 mm | 2,5 mm |
| Ancho | 1 a 20 mm | 10 mm |
| Diámetro del agujero | 0 a 40 mm, limitado además por la raíz de la rueda menor | 4 mm |

El módulo, el ancho y el agujero están en **Dimensiones avanzadas**. Un agujero de 0 produce una rueda maciza. La vista muestra las proporciones del diseño ajustadas al visor; las dimensiones indicadas corresponden al diseño en milímetros, no a una calibración física de la pantalla o de AR.

El perfil usa flancos de evolvente con ángulo de presión de 20°, sin corrección de perfil: `d = m·z`, `db = d·cos(20°)`, `da = d + 2m`, `df = d − 2,5m`, y distancia entre ejes `a = m·(z₁ + z₂)/2`. Las proporciones se contrastaron con la [tabla 4.1 de KHK, Calculation of Gear Dimensions](https://khkgears.net/new/gear_knowledge/gear_technical_reference/calculation_gear_dimensions.html). El mínimo de 18 dientes evita modelar el socavado necesario en ruedas pequeñas de este perfil. Se utiliza una holgura tangencial total de `0,04m`, repartida entre ambos dientes.

La raíz conecta con segmentos radiales; no se reproduce el filete trocoidal de una herramienta de tallado. No se calculan tensiones, resistencia, tolerancias ni aptitud para fabricación. Los modelos helicoidal y cónico mantienen la geometría de sus OBJ; el diseñador paramétrico corresponde a los rectos.

El cálculo se previsualiza al editar, pero la geometría cambia únicamente al aplicar. Los errores conservan el mecanismo anterior. Al generar se pausa el motor, se recupera el montaje y se preservan el nombre, el tinte, la posición, el giro del conjunto, su escala, la velocidad elegida y el sentido. Las escenas almacenan los parámetros y regeneran la geometría al abrir; no necesitan guardar un GLB adicional. Las escenas anteriores sin parámetros siguen usando los OBJ.

### Modelos originales

| Archivo original | Piezas | Dientes | Ejes | Relación entrada:salida |
| --- | --- | --- | --- | --- |
| GearRect.obj + GearRect.mtl | pinion y gear | 15 / 30 | Paralelos | 2:1 |
| GearConic.obj + GearConic.mtl | pinion001 y gear004 | 15 / 15 | Perpendiculares | 1:1 |
| GearHelix.obj + GearHelix.mtl | pinion y gear originales | 15 / 30 | Paralelos | 2:1 |

Los nombres, centros y ejes proceden de la geometría de los OBJ aportados. Los dientes se contaron en los contornos de sus caras. El OBJ helicoidal actualizado contiene las dos ruedas originales: `pinion` y `gear`. Se conservan sus posiciones de montaje, sus fases y los colores definidos en su MTL, sin generar una tercera rueda. No se alteran los OBJ originales ni se infiere una licencia a partir del nombre FreeCAD.

Es una simulación cinemática educativa, sin cálculo de contacto, fricción, par, fuerzas o deformaciones. La animación no constituye una validación del diseño para fabricación. Solo estos tres modelos preparados incluyen controles mecánicos; importar un OBJ arbitrario no determina automáticamente sus ejes ni sus relaciones de transmisión.

`modelos-3d/catalogo.json` conserva los modelos disponibles y declara `coleccionActiva: "engranajes"`. `src/education/gear-model.js` define relaciones, centros y ejes; `src/education/gears.js` prepara los pivotes, el movimiento y los controles. El movimiento también se actualiza durante el modo AR espacial; la interacción en dispositivos físicos requiere comprobación.

## Verificación

- `npm run check`
- `npm test`
- `npm run test:gears`
- `npm run test:gear-design`

La prueba de navegador usa la colección activa real y comprueba los tres OBJ, el giro, la relación, separación, montaje, aislamiento, guardado y controles a 320/390/1280 px. Las pruebas históricas de sensores conservan su catálogo de prueba mediante el arnés; no representan la colección visible actual.

El diseñador se verifica con conteo de dientes sobre el contorno real de las mallas, cálculos de dimensiones, muestreo del engrane durante un paso, combinaciones límite, agujeros, recuperación del OBJ, rechazo sin pérdida de escena, regeneración después de recargar y accesibilidad automática a 320/390/1280 px. Estas comprobaciones no sustituyen una validación mecánica para fabricación.
