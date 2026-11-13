# ExplorAR 1.4 — colocación sobre superficies reales

Acceso: **Controles de vista → Colocar sobre una superficie · AR**. WebXR Hit Test permite localizar una superficie horizontal y situar una copia del componente seleccionado o del conjunto visible. La guía desaparece si deja de haber un hit válido; la colocación no acepta una pose antigua.

Tras colocar se puede girar en pasos de 15°, ajustar tamaño o buscar otro lugar. Las dimensiones iniciales se normalizan a unos 50 cm en su eje mayor y no representan la escala física de los sensores. La sesión usa el seguimiento del dispositivo; pérdida de pose oculta temporalmente el contenido y un reinicio del origen requiere recolocar.

## Compatibilidad y alcance

Requiere HTTPS o localhost, permiso del usuario y soporte de WebXR `immersive-ar`, `local` y `hit-test`. La superposición DOM es opcional: con ella aparecen controles de colocación, tamaño, giro y salida; sin ella se coloca tocando cuando aparece el aro y se sale con el control nativo del navegador. La cámara como fondo y la exploración 3D permanecen disponibles por separado.

Se detectan intersecciones sobre superficies horizontales; no se reconstruye una malla completa de la habitación, ni se simula oclusión por objetos reales. No se guardan mapas, anclajes persistentes ni poses AR. El trabajo original del laboratorio no cambia: el renderer muestra copias durante la sesión y restaura la interfaz al terminar. Los modelos locales pueden colocarse si ya están cargados.

## Verificación y pendientes

`test:surfaces` comprueba poses horizontales, solicitud de hit test, colocación, ausencia de hit, pérdida de seguimiento, toque nativo, protección de botones, giro/tamaño, permisos tardíos, cancelación, errores y salida nativa con sesiones simuladas. También revisa paginación y objetivos táctiles en tamaños móviles. `verify:release` incluye estas pruebas y las regresiones del laboratorio.

Las pruebas automáticas sustituyen el puente XR del renderer y no validan sensores, compositor WebXR o el seguimiento del mundo real. Sigue pendiente probar físicamente en un dispositivo compatible desde HTTPS. Registrar disponibilidad, deriva, estabilidad, recuperación y salida en `validacion/dispositivos.md`. No se afirma que se haya realizado esa prueba ni que todos los móviles sean compatibles.

Referencias de implementación: [WebXR Hit Test, W3C](https://www.w3.org/TR/webxr-hit-test-1/) y [ejemplo oficial Three.js r160](https://github.com/mrdoob/three.js/blob/r160/examples/webxr_ar_hittest.html). La API informa intersecciones estimadas por el dispositivo; no garantiza precisión de medición.

## Corrección 1.4.1 — disponibilidad y Netlify

La entrada se desactiva hasta comprobar que el navegador admite immersive-ar. Una respuesta negativa no intenta crear una sesión. Si el runtime rechaza las funciones requeridas tras una comprobación positiva, se explica que no hay una configuración AR compatible y se permite comprobar de nuevo. No se sustituye hit test por una cámara sin seguimiento. Los bloqueos de Permissions-Policy tienen un mensaje distinto.

El paquete incluye `_headers` para permitir cámara y seguimiento espacial al propio origen en Netlify. Los encabezados no instalan un runtime AR ni garantizan compatibilidad del teléfono. La comprobación del despliegue concreto requiere URL y dispositivo; consulte `publicacion.md`.
