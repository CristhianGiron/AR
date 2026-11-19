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
4. Probar giro, tamaño y Otro lugar. Los botones de la superposición no deben recolocar accidentalmente.
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
