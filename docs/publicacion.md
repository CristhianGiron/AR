# Preparar y publicar una entrega

El proyecto es un sitio estático. No necesita Node ni un backend en producción. Node y Chrome se usan para comprobar y preparar el paquete.

## Preparación reproducible

```bash
npm ci
npm run verify:release
npm run release:prepare
```

`verify:release` ejecuta las pruebas en serie y guarda logs, capturas, manifiesto de fuentes y resultados en una carpeta fechada de `reports/`. La huella incluye aplicación, documentación, recursos, scripts y pruebas. Si algún archivo cambia durante las pruebas, el informe no se aprueba.

`release:prepare` exige un informe aprobado de las fuentes actuales. Copia solo la aplicación, los modelos del catálogo, dependencias locales, recursos y documentación; comprueba la copia en Chrome y genera un archivo comprimido y un manifiesto SHA-256. No publica ni envía archivos a un proveedor. El modelo ajeno al catálogo y los ZIP originales permanecen en el proyecto, pero no entran en la entrega.

El paquete es un **candidato de validación**. Un resultado automático aprobado no resuelve la revisión de procedencia de los recursos visuales ni sustituye el piloto, la revisión humana de accesibilidad o la prueba física de cámara.

## Alojamiento

1. Revisar `creditos-modelos.md`, `alcance-v1.md` y los pendientes de `cierre-v1.md`.
2. Elegir el alojamiento y una dirección HTTPS con el responsable del proyecto. No se ha configurado ni contratado ninguno desde este repositorio.
3. Subir el contenido del directorio del paquete, conservando todas las rutas y nombres con espacios. No subir `node_modules`, `reports`, archivos de pruebas o recursos originales fuera del paquete.
4. Servir HTML, JavaScript, CSS, JSON e imágenes con tipos MIME apropiados. Los módulos necesitan JavaScript; el JSON debe entregarse como JSON, sin redirecciones a una página HTML.
5. Evitar cachés prolongadas sin versionado de archivos. Al actualizar, sustituir el paquete completo para no mezclar código de distintas versiones.
6. Abrir la URL desde los equipos físicos del aula y completar `validacion/dispositivos.md`.

No se necesita clave API, base de datos ni credencial en el navegador. No se han incorporado analíticas, cuentas ni almacenamiento de calificaciones. El servidor de alojamiento puede conservar registros HTTP según su propia configuración; revísela con su responsable.

## Comprobar antes de cambiar de versión

Conservar el paquete anterior y su manifiesto. Publicar en una dirección de ensayo primero, verificar carga de modelos, permisos de cámara, navegación y retos, y después promover la versión. Para volver atrás, restaurar el directorio anterior completo.

## Entrega local

Para una revisión sin publicación se puede servir el directorio del paquete con `python3 -m http.server 8000`. La cámara puede funcionar en localhost del mismo equipo. Acceder desde otro teléfono a una IP HTTP no equivale a localhost del teléfono; usar HTTPS para la validación de cámara en red.

## Netlify y compatibilidad AR

Para una subida manual, descomprime el paquete y sube el directorio que contiene `index.html`, `src`, `vendor`, `modelos-3d` y `_headers`. El archivo `_headers` declara `camera=(self)` y `xr-spatial-tracking=(self)` mediante Permissions-Policy para documentos servidos por Netlify. No concede permisos del usuario ni añade soporte AR a un dispositivo. No convierte en compatible un navegador sin runtime AR.

Prueba la URL pública HTTPS directamente en una pestaña. Una previsualización dentro de un iframe puede depender también de los permisos del documento contenedor; el encabezado del sitio no puede anular una restricción impuesta por ese contenedor.

El mensaje de Chromium «No runtimes supported the requested configuration» corresponde a la ausencia de un runtime que admita la configuración de sesión pedida. No prueba un fallo del alojamiento. `isSessionSupported('immersive-ar')` comprueba el modo general; iniciar la sesión comprueba además las funciones requeridas, como hit test. ExplorAR bloquea la entrada si el modo no se admite y ofrece comprobarlo de nuevo. Si el runtime rechaza la configuración tras una comprobación positiva, muestra una explicación y no reintenta sin la detección de superficies requerida.

En Android, comprobar Chrome, compatibilidad del equipo con ARCore y Servicios de Google Play para RA. Actualizar esos componentes no garantiza que un modelo de teléfono no compatible pase a admitirlo. Para diagnosticar un despliegue concreto registrar URL, modelo, sistema, navegador, mensaje, estado HTTPS y Permissions-Policy. No declarar que el problema de un sitio se resolvió sin volver a probar su URL.

Fuentes: [requisitos WebXR de Google](https://developers.google.com/ar/develop/webxr/requirements), [código del error en Chromium](https://chromium.googlesource.com/chromium/src/+/ff0eefca65e40bdd57a3622357ba1399375d41f4/third_party/blink/renderer/modules/xr/xr_system.cc) y [encabezados personalizados de Netlify](https://docs.netlify.com/manage/routing/headers/).
