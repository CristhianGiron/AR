# Validación presencial de dispositivos y accesibilidad

**Sin ejecutar en dispositivos físicos.** Las pruebas automatizadas de Chrome no deben marcar estas filas como aprobadas. Rellene una copia por equipo; use códigos de dispositivo, sin nombres de estudiantes.

Fecha: ___ · Responsable: ___ · Dispositivo/OS: ___ · Navegador/versión: ___ · Dirección HTTPS: ___ · Versión y huella del paquete: ___

| Comprobación | Resultado (pendiente / pasa / falla) | Evidencia e incidencia |
| --- | --- | --- |
| Primera carga de seis sensores con Wi-Fi del aula | Pendiente | |
| Cámara permitida, vídeo visible y sin audio solicitado | Pendiente | |
| Permiso rechazado: explicación y uso 3D disponible | Pendiente | |
| Cancelar cámara mientras se resuelve el permiso | Pendiente | |
| Apagar cámara y salir: indicador del dispositivo apagado | Pendiente | |
| Volver desde otra página o pestaña: estado comprensible | Pendiente | |
| Vertical/horizontal: ficha en una vista y acciones accesibles | Pendiente | |
| Giro, movimiento, tamaño y gestos con uno/dos dedos | Pendiente | |
| Mi escena y controles numéricos sin arrastrar | Pendiente | |
| Zoom/giro conjunto y restablecimiento sin alterar modelos | Pendiente | |
| Reto, pista, reintento, Más datos y regreso a la ficha | Pendiente | |
| Importación GLB, archivo inválido, eliminación y deshacer | Pendiente | |
| Diez minutos de uso: fluidez, temperatura y consumo percibidos | Pendiente | |
| VoiceOver/TalkBack/NVDA: nombres, orden y anuncios comprensibles | Pendiente | |
| Solo teclado: selección, foco visible, Escape y regreso | Pendiente | |
| Ampliación y espaciado de texto sin contenido inaccesible | Pendiente | |
| Contraste sobre aula, vídeo claro y vídeo oscuro | Pendiente | |

Pruebe al menos un Android y un iPhone usados por la institución, y una computadora. Registre también fallos: no se considera superada una prueba solo porque se completó con ayuda del evaluador.

Criterio de salida: corregir cualquier incidencia que impida una tarea principal, documentar las limitaciones restantes y repetir las tareas afectadas. Esta ficha recoge evidencia de uso; no es una certificación de conformidad.

## AR de superficies — pendiente de prueba física (1.4)

Registrar por equipo: teléfono/visor, versión de sistema y navegador, URL HTTPS, soporte immersive-ar/hit-test, anchors y superposición DOM, permiso aceptado/denegado, y condiciones de iluminación/textura.

1. Abrir controles de vista y entrar en AR con un componente seleccionado. Comprobar que el permiso se solicita solo al pulsar Entrar.
2. Apuntar despacio a mesa y suelo. Verificar guía horizontal; al apuntar a una pared no debe autorizarse colocación.
3. Colocar por botón y por toque. Observar desde distintos ángulos durante al menos un minuto y registrar deriva, temblores, escala y altura aparente.
4. Probar giro con uno y dos dedos, marcha/pausa y Otro lugar. Los botones de la superposición no deben recolocar accidentalmente.
5. Tapar la cámara temporalmente o provocar pérdida de seguimiento. Comprobar recuperación y ausencia de colocación con datos antiguos.
6. Salir desde × y desde el control del navegador; cancelar un permiso; repetir entrada y salida. Volver a 3D, comprobar modelos/transformaciones/notas y probar la cámara de fondo.
7. Repetir con el conjunto y un GLB local. Si no hay superposición DOM, comprobar toque de colocación y salida nativa.

Anotar resultados y evidencias reales. Estos pasos están preparados; no se han ejecutado en hardware físico durante la implementación.

### Estabilidad del escaneo y anclaje — pendiente

- Repetir en piso con textura, piso uniforme, mesa y cama, con buena luz y con poca luz. Registrar cuánto tarda en aparecer el aro y cuándo cambia de ámbar a azul; una cama deformable puede no ofrecer un plano estable.
- Medir con una referencia física el desplazamiento aparente a los 30 y 60 segundos, al caminar alrededor y al alejarse y regresar. Registrar centímetros observados, distancia de la cámara y si el mensaje indica anclaje activo o colocación sin ancla.
- Provocar una interrupción breve: el aro puede permanecer ámbar hasta 250 ms, pero no debe permitir colocar sin una lectura actual. Tras un salto de altura debe volver a comprobar la superficie.
- Perder y recuperar seguimiento: el modelo se oculta durante poses emuladas o anclas sin seguimiento y reaparece al recuperar el ancla. Comprobar Otro lugar y salida mientras se está fijando el modelo.
- Comparar un equipo con anchors y otro sin esta capacidad. No atribuir precisión centimétrica a las pruebas simuladas.

### Recuperación tras giros y movimiento brusco — pendiente

1. Colocar junto a una referencia rígida y visible. Registrar si el anclaje está activo; la colocación de compatibilidad sin ancla no ofrece la misma recuperación.
2. Girar el teléfono 90°, 180° y 360° alrededor de su eje óptico; alternar vertical/horizontal sin mover la referencia. Medir deriva aparente en centímetros.
3. Separadamente, hacer un movimiento rápido y volver a mirar la referencia. Registrar pérdidas y tiempo de recuperación. El movimiento puede superar la capacidad de seguimiento del dispositivo; no se garantiza recuperación en todos los casos.
4. El modelo debe permanecer oculto durante pérdidas y lecturas incoherentes; al recuperarse, debe usar la misma ancla, sin recolocación automática. Esperar varias lecturas válidas antes de mostrarlo reduce reapariciones intermitentes, pero no corrige por sí solo la deriva del sistema.
5. Repetir con distintas luces y texturas; registrar navegador, dispositivo y versión del sitio. Las pruebas automatizadas de poses de cámara no comprueban la cámara/compositor XR ni la precisión física.

### Interacción y funcionamiento en AR — pendiente de dispositivo físico

- Con superposición DOM, probar giro con un dedo y torsión con dos dedos. El punto colocado y la escala deben conservarse; los botones no deben disparar gestos ni recolocar.
- Probar marcha y pausa en rectos, cónicos, helicoidales y transmisión. Cada rueda debe girar sobre su eje y respetar la relación del laboratorio. Comparar RPM, dientes y sentido con las etiquetas 3D normales.
- Verificar nombre y tarjetas conectadas en vertical y horizontal. No deben cubrir los controles ni permanecer visibles al perder seguimiento; al recuperarlo deben reaparecer con el modelo.
- Salir y comprobar que el giro, estado mecánico y datos de la escena original no cambiaron por manipular su copia AR. Repetir entradas y salidas para comprobar la eliminación de etiquetas temporales.
- Sin superposición DOM, comprobar colocación por toque y salida nativa; los gestos y las tarjetas de pantalla no están disponibles.

### Corrección de gestos y legibilidad AR — pendiente de prueba física

- Repetir arrastre sobre la zona central y sobre las etiquetas, manteniendo inmóvil el teléfono. Comparar Pointer Events, eventos táctiles y entrada XR de pantalla cuando esté disponible; los botones deben seguir respondiendo sin girar el objeto.
- Probar gestos prolongados y torsión con dos dedos; comprobar que ni el desplazamiento de la mano ni los giros cambian la posición del ancla.
- Comprobar nombre ampliado y conectores de color sobre fondos claros y oscuros. Tras pasar a horizontal o volver a vertical, los conectores deben llegar a sus ruedas y tarjetas sin atravesar el nombre.
- Registrar navegador, modelo y URL/versión probada. Las pruebas de Chrome simulan las rutas de entrada y aislamiento del overlay, pero no certifican el despacho de eventos de todos los compositores WebXR.

### Rastro de malla y sombra sobre el plano — pendiente de prueba física

- Escanear lentamente piso y mesa o cama a distinta altura. El rastro debe aparecer solo alrededor de hits detectados, mantener separados los niveles y desvanecerse si no se vuelven a observar.
- Colocar: la malla debe ocultarse y debe aparecer la sombra sobre el plano detectado, conservando transparencia fuera de la sombra.
- Girar el objeto con los dedos y poner en marcha los engranajes. El plano receptor debe permanecer alineado con el ancla mientras la silueta de la sombra se actualiza.
- Perder seguimiento y recuperarlo: el rastro se borra y la sombra se oculta junto al modelo hasta recuperar el ancla. Otro lugar debe iniciar un rastro nuevo.
- Repetir entradas/salidas y comprobar fluidez, temperatura y consumo, especialmente en teléfonos modestos. La prueba automatizada comprueba píxeles de sombra en Chrome con GPU por software, sin certificar rendimiento ni alineación de sensores físicos.

### Arranque y mapa básico opcional — pendiente de dispositivo físico

- Abrir 3D en un navegador sin WebXR y con consultas de AR rechazadas: los modelos y gestos normales deben funcionar. Si falla una descarga del módulo AR, el mensaje debe referirse solo a AR.
- Comprobar nombre como tarjeta de pantalla de tamaño constante, conectores finos y su ocultación/recuperación junto a las tarjetas de las ruedas. Probar distancia y orientación.
- En un equipo con plane-detection, mover el teléfono de lado a lado y comprobar la malla sobre planos reportados antes de apuntar el centro a una superficie que genere el aro. Un dispositivo sin esa función puede mostrar únicamente el rastro tras recibir hits.
- Registrar planos observados y condiciones reales; la visualización de un mapa básico no certifica mejora de precisión ni reconstrucción completa de la habitación.
