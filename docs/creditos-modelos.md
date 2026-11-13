# Créditos y procedencia de recursos

Se leyeron los metadatos de cada GLB del catálogo y se contrastaron con `catalogo.json`. El responsable del proyecto confirmó que los seis sensores son de creación propia. Esa declaración está registrada en `procedencia` y sus créditos son visibles en Más datos. No se ha inventado una licencia pública para esos modelos.

`inventario-modelos.json` registra tamaño, huella de archivo y fuente de la atribución. Regenerar con `npm run audit:models`.

| Recurso | Autoría y evidencia | Estado |
| --- | --- | --- |
| `PIR.glb` | Modelo propio del autor del proyecto ExplorAR; declaración del responsable | Autoría propia declarada |
| `ultrasonico.glb` | Modelo propio del autor del proyecto ExplorAR; declaración del responsable | Autoría propia declarada |
| `temperatura.glb` | Modelo propio del autor del proyecto ExplorAR; declaración del responsable | Autoría propia declarada |
| `FOTORESISTENCIA.glb` | Modelo propio del autor del proyecto ExplorAR; declaración del responsable | Autoría propia declarada |
| `rgb sensor.glb` | Modelo propio del autor del proyecto ExplorAR; declaración del responsable | Autoría propia declarada |
| `humedad lluvia.glb` | Modelo propio del autor del proyecto ExplorAR; declaración del responsable | Autoría propia declarada |
| `arduino_uno.glb` | `asset.extras`: Helindu, CC-BY-4.0 y enlace de origen; atribución conservada en catálogo | Documentado en archivo; sin nueva verificación del origen externo |
| Three.js y complementos | `vendor/three/LICENSE`, MIT | Texto conservado en entrega |
| Personaje y fondo de aula | Generados a partir de la referencia aportada por el usuario; prompts en `assets/README.md` | Procedimiento documentado; confirmar procedencia de la referencia para publicación |

La presencia del nombre Blender identifica la herramienta de exportación; la declaración de autoría procede del responsable, no del generador. No se reescribieron los GLB originales para inventar metadatos.

Arduino UNO: autor [Helindu](https://sketchfab.com/Helindu), [origen indicado por el GLB](https://sketchfab.com/3d-models/arduino-uno-51dd4e0cdfad4c4c95354bc5e29dcf1a), [licencia indicada](https://creativecommons.org/licenses/by/4.0/). La aplicación ajusta escala, encuadre y presentación y conserva los materiales originales; permite tintes temporales y otras transformaciones durante la sesión.

## Decisiones pendientes

La autoría de los seis sensores está confirmada. Su autor puede elegir posteriormente una licencia pública si desea permitir su reutilización fuera del proyecto. Hasta entonces se identifican como propios, sin declarar permiso general de reutilización ni atribuirles CC o MIT por inferencia.

Para cerrar la publicación, revisar la procedencia de la referencia visual y conservar las atribuciones. El código de la aplicación tampoco recibe automáticamente la licencia de Three.js por utilizar esa biblioteca.

`juego culebrita.glb` no pertenece al catálogo educativo y no forma parte de esta declaración de autoría de sensores. Se conserva en la carpeta de trabajo y no se copia al paquete. El ZIP original de Arduino y la imagen completa de referencia tampoco se necesitan para ejecutar el sitio.
