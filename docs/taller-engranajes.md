# Taller de engranajes

## Vista para la clase

La presentación mantiene la línea cómic del visor: botones independientes azules y violetas, temas diferenciados en amarillo, turquesa y violeta, tarjetas de cálculo amarillas y paneles de bordes redondeados. `styles/gear-comic.css` concentra esta coherencia visual sobre las reglas de densidad. Los iconos de reproducción, pausa, paso, ajustes y cierre son SVG con el mismo lienzo y alineación centrada; sus nombres accesibles se conservan. El botón flotante **Mi clase** usa el ancho de su texto, sin heredar el 100 % de los botones de panel.

El visor abre con el modelo despejado, sin panel lateral ni menú de herramientas desplegado. Un grupo de botones flotantes independientes, sin fondo de barra compartido, reúne el selector **Rectos · Cónicos · Helicoidales**, **Iniciar/Pausar**, **Paso** y **Ajustar** y **Mi taller** abren un grupo de botones independientes, organizado en **Manipular**, **Aprender** y **Escenas**. No hay una lista de controles con desplazamiento. En Manipular aparecen Iniciar/Pausar, Un paso, Velocidad, Dientes y **Más**. Más despliega Separar, Juntar, Invertir, Una pieza, Diseñar (solo rectos), Aspecto, Vista y Reiniciar. Cada ajuste abre una única tarjeta flotante; al tocar el fondo o el modelo se cierra y se recogen los botones adicionales. El visor sigue respondiendo en escritorio y celular. Escape cierra primero la tarjeta, después Más y por último el taller.

La distribución usa cinco columnas para los controles principales, que caben en una sola fila. Las acciones de Más tienen cuatro columnas en escritorio y móvil vertical; en horizontal con poca altura se distribuyen en seis columnas. La anchura, separación y tipografía se adaptan al espacio manteniendo objetivos táctiles de al menos 44 px. En móviles cortos el selector de modelos pasa a cuatro columnas para reducir filas.

`npm run test:gear-layout` verifica el inicio con flechas ocultas, filas reducidas, botones táctiles, textos sin recorte, ausencia de desbordamiento, tarjetas flotantes y accesibilidad automática a 1280×900, 390×780, 320×780, 320×568, 320×480 y 844×390.

Aprender reúne botones para Relación, Giro, Torque y Ficha. Escenas conserva guardar/abrir, importar y seleccionar objetos. Las tarjetas extensas usan páginas con flechas para conservar todas las opciones sin una barra de desplazamiento. El selector **Rectos · Cónicos · Helicoidales · Transmisión** permite cambiar directamente de modelo y reutiliza los mecanismos ya cargados.

## Transmisión compuesta

`transmision.obj` y `transmision.mtl` se conservan como fueron entregados. El OBJ actual contiene cuatro objetos móviles y cinco ruedas:

| Eje | Objeto OBJ | Dientes | Velocidad con entrada a 26 rpm |
| --- | --- | --- | --- |
| Entrada | Body | 26 | 26 rpm |
| Intermedio 1 | Body001 | 26 y 18, solidarios | 26 rpm, sentido contrario |
| Intermedio 2 | Body002 | 13 | 36 rpm, mismo sentido |
| Salida | Body003 | 18 | 26 rpm, sentido contrario |

Los conteos se comprobaron agrupando las crestas de los dientes de la geometría original. Los ejes permanecen en las coordenadas del OBJ: `(0, 0)`, `(65, 0)`, `(50.35, -36)` y `(12, -36)`. La pieza Body001 rota completa alrededor de su propio eje: sus dos ruedas son solidarias.

Las etapas son 26→26, 18→13 y 13→18. La relación total es `R = (26/26) × (13/18) × (18/13) = 1`; las velocidades de entrada y salida son iguales, pero tres contactos externos dejan sentidos contrarios. El segundo eje intermedio gira más rápido; sus 13 dientes no cambian la relación total porque aparece como rueda intermedia entre dos ruedas de 18 dientes.

Se puede iniciar/pausar, variar velocidad, invertir, separar los cuatro ejes, seleccionar y aislar cualquiera, avanzar un paso independiente y volver a montar. Las etiquetas muestran las RPM, los dientes y el sentido de cada eje. Los dientes originales se conservan; el generador paramétrico sigue disponible para los rectos.

`npm run test:transmission` verifica la carga real del OBJ, 26/26/36/26 rpm, estabilidad de cámara y ejes durante dos vueltas, aislamiento y paso independiente del cuarto eje, separación, montaje, inversión, guardado y recarga, cambio al par recto, controles flotantes, cierre al tocar fuera y accesibilidad automática en 320/390/844/1280 px. Las pruebas unitarias comprueban las tres etapas y la validación de estados de cuatro ejes.

## Color de cada engranaje

En **Manipular → Más → Color**, selecciona Todo el conjunto o una pieza concreta y elige su color. El cambio se ve inmediatamente. **Aspecto** conserva el color general y ofrece también el acceso a **Color por engranaje**.

El color de una pieza se aplica de forma independiente sin teñir las demás. Cada pieza tiene sus propios materiales, incluso cuando el OBJ original comparte materiales entre ruedas. En la transmisión, las ruedas solidarias de 26 y 18 dientes de Body001 comparten color porque forman una sola pieza; los otros tres ejes se pueden colorear por separado.

**Recuperar color original** actúa sobre la selección. El color general sigue siendo un tinte del modelo original; cambiarlo reemplaza los colores individuales, como indica la tarjeta. Cambiar posición, tamaño, velocidad o separación conserva los colores. El diseño paramétrico también conserva los colores individuales al regenerar los dientes. Guardar/abrir escenas incluye los colores de cada pieza y sigue admitiendo archivos anteriores sin esta configuración.

`npm run test:gear-colors` verifica independencia entre piezas, materiales compartidos, recuperación individual, color global, regeneración, colores de los cuatro ejes después de guardar/recargar y accesibilidad de la tarjeta en 320/390/1280 px.

## Sentido de giro visible

Las flechas están ocultas al iniciar. Al activarlas, el visor muestra dos flechas curvas grandes sobre cada engranaje, con contorno oscuro y el color de su eje. Las flechas siguen el plano real de la rueda; en los cónicos se proyectan sobre sus ejes perpendiculares. Su fase acompaña el giro de la simulación y se detiene al pausar. Invertir cambia las puntas de dirección. En pausa indican el sentido configurado, con menor intensidad; al separar o aislar, indican el sentido del paso independiente.

**Manipular → Más → Ver giro** permite mostrarlas u ocultarlas sin cambiar el estado del mecanismo. Su visibilidad es independiente de las etiquetas numéricas HUD y se apagan al despejar la vista o entrar en AR espacial. La preferencia de movimiento reducido mantiene las flechas estáticas sin eliminar la indicación de dirección. No representan torque ni fuerzas y no capturan gestos.

`npm run test:gear-directions` comprueba las direcciones de los cuatro mecanismos, fase, pausa, inversión, planos del par cónico, aislamiento, ocultación, independencia del HUD, movimiento reducido y accesibilidad a 320/390/1280 px.

## Nombre del modelo

El nombre mantiene una anchura estable en pantalla (224 px en escritorio y 184 px en celular), independientemente del zoom. El sistema lo sitúa fuera de las piezas y dentro del área visible, evitando controles y otros nombres. Las piezas no atraviesan ni tapan la tarjeta: el nombre se dibuja en primer plano, sin escribir profundidad. El conector conserva profundidad 3D y sale del borde más próximo al modelo.

La altura configurada se usa como preferencia; si coincide con geometría o controles, el acomodo busca otro lugar cercano. El giro del motor no cambia el contorno empleado para ubicar el nombre. Renombrar, separar o cambiar de modelo recalcula su posición. Si no hay espacio seguro, la tarjeta se oculta en vez de cubrir el mecanismo o salirse de pantalla. Despejar vista también oculta los nombres.

## Datos sobre cada rueda

El botón **HUD**, en la cabecera, activa u oculta etiquetas pequeñas conectadas a cada eje (dos en los pares y cuatro en la transmisión compuesta). Se actualizan al mover el modelo o cambiar su velocidad, sentido o estado:

- **rpm:** velocidad de la simulación mientras el motor funciona. En pausa indica 0; la última línea conserva la velocidad configurada.
- **Dientes:** cantidad de la rueda de entrada o salida.
- **ω:** velocidad angular en rad/s, calculada con `rpm × 2π/60`.
- **θ:** ángulo local de la rueda, normalizado a una vuelta (0–360°).
- **Sentido:** flecha de giro respecto a su eje local; depende del punto de vista, especialmente en los cónicos.

Son datos de la simulación, no mediciones de un sensor. No se muestran fuerzas ni torque reales porque el motor no los simula.

Las tarjetas se colocan **fuera de la silueta proyectada de las ruedas**, con un margen de seguridad. El acomodo de `src/scene/gear-label-layout.js` evalúa todas las tarjetas juntas: evita cubrir el modelo 3D, el nombre del mecanismo, las herramientas y otras tarjetas. La proximidad se mide desde el borde del engranaje, no desde el centro del eje. Busca primero el hueco libre más cercano y limita el alejamiento; no usa esquinas remotas de la pantalla como alternativa.

Los conectores tienen codos y colores correspondientes a cada eje. El recorrido favorece trayectos cortos, evita otras tarjetas y reduce cruces con otras líneas y ruedas. Las tarjetas conservan su ubicación relativa al mover un poco la vista para evitar saltos. Las envolventes se calculan con los límites originales de cada pieza y su separación actual: girar el motor no hace oscilar el acomodo.

Si falta espacio, el HUD compacta las tarjetas conservando RPM, dientes, velocidad angular, ángulo y ajuste. En celular se reserva un pequeño espacio adicional entre el mecanismo y los controles rápidos. Si no existe un hueco cercano fuera del modelo, una tarjeta se oculta antes que cubrir una rueda o enviarse lejos. Los datos completos siguen disponibles al examinar un eje de forma aislada. El HUD no intercepta gestos del lienzo ni anuncia valores a lectores de pantalla a cada fotograma; se oculta al despejar la vista o entrar en AR espacial.

`npm run test:gear-hud` comprueba el espacio libre sobre todas las ruedas, distancia respecto al borde de cada pieza, conectores con ángulos reales, separación entre tarjetas y controles, compactación de los cuatro ejes, estabilidad del motor, cambios de vista/zoom/separación y accesibilidad a 320/390/844/1280 px. Las pruebas unitarias cubren la distribución exterior, obstáculos y memoria de posición.

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

Es una simulación cinemática educativa, sin cálculo de contacto, fricción, par, fuerzas o deformaciones. La animación no constituye una validación del diseño para fabricación. Solo estos cuatro modelos preparados incluyen controles mecánicos; importar un OBJ arbitrario no determina automáticamente sus ejes ni sus relaciones de transmisión.

`modelos-3d/catalogo.json` conserva los modelos disponibles y declara `coleccionActiva: "engranajes"`. `src/education/gear-model.js` define relaciones, centros y ejes; `src/education/gears.js` prepara los pivotes, el movimiento y los controles. El movimiento también se actualiza durante el modo AR espacial; la interacción en dispositivos físicos requiere comprobación.

## Verificación

- `npm run check`
- `npm test`
- `npm run test:gears`
- `npm run test:gear-design`

La prueba de navegador usa la colección activa real y comprueba los pares OBJ, el giro, la relación, separación, montaje, aislamiento, guardado y controles a 320/390/1280 px. Las pruebas históricas de sensores conservan su catálogo de prueba mediante el arnés; no representan la colección visible actual.

El diseñador se verifica con conteo de dientes sobre el contorno real de las mallas, cálculos de dimensiones, muestreo del engrane durante un paso, combinaciones límite, agujeros, recuperación del OBJ, rechazo sin pérdida de escena, regeneración después de recargar y accesibilidad automática a 320/390/1280 px. Estas comprobaciones no sustituyen una validación mecánica para fabricación.
