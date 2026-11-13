# Alcance de ExplorAR 1.0

> Documento histórico del alcance 1.0. El guardado, los puntos de partes y el laboratorio se incorporan en [1.1](version-1.1.md).

Estado previsto: candidato para validación educativa. Este alcance describe lo implementado; no registra una aceptación docente o institucional que aún no existe.

## Incluido

- Laboratorio 3D educativo para estudiantes de 11 a 16 años, con seis sensores iniciales y Arduino UNO opcional.
- Selección, movimiento, giro preciso X/Y/Z, tamaño, tinte, etiquetas conectadas, eliminación y recuperación de la última eliminación.
- Zoom y giro conjunto de la cámara sin alterar las transformaciones de cada modelo.
- Catálogo JSON y carga temporal de archivos GLB con recursos integrados.
- Ficha principal compacta; reto y datos técnicos por separado; observación, preguntas, pistas y reintentos.
- Cámara opcional que muestra los objetos sobre el vídeo. Su permiso se solicita solo al activarla, sin audio.
- Navegación integrada, presentación de referencia, adaptación móvil y contenido extenso paginado.
- Aplicación estática con Three.js local, sin cuentas, base de datos ni envío de calificaciones.

## Límites explícitos

La cámara **superpone** la escena al vídeo: no reconoce marcadores, no detecta mesas y no mantiene anclajes espaciales al mover el teléfono. La imagen del aula es un fondo decorativo de la exploración 3D. No se presenta como vídeo de una cámara activa.

Los modelos no simulan circuitos, lecturas de sensores ni medidas físicas. Tamaño y coordenadas son ajustes de visualización. Los retos no certifican conocimientos ni generan calificaciones persistentes.

Recargar la página descarta la escena, los modelos importados y las respuestas de la sesión. No hay guardado, sincronización, acceso de estudiantes ni analítica. Tampoco hay instalación PWA ni un modo offline garantizado; puede servirse todo el sitio desde una red local.

## Criterios de cierre

| Criterio | Evidencia exigida | Estado |
| --- | --- | --- |
| Implementación funcional | Pruebas de escena, contenido, interacción y recuperación | Ejecutar `npm run verify:release`; consultar informe |
| Integridad de entrega | Huellas SHA-256 y prueba del directorio empaquetado | `npm run release:prepare` |
| Uso con cámara real | Sesión en Android/iOS y comprobación de permisos y apagado | Pendiente de dispositivo físico |
| Facilidad de uso educativa | Sesión con estudiantes y revisión docente | Pendiente; formulario en `validacion/piloto-educativo.md` |
| Accesibilidad | Auditoría automática y revisión humana aplicable | Automática reproducible; revisión humana pendiente |
| Procedencia de recursos | Autor, fuente y permiso/licencia de cada recurso | Seis sensores propios confirmados; Arduino atribuido; ver créditos |
| Publicación | Dirección HTTPS y comprobación desde equipos del aula | Pendiente de alojamiento y responsables |

Guardar escenas, seguimiento AR espacial, cuentas y evaluación persistente son ampliaciones del alcance, no requisitos implementados de esta versión.
