# Estado de cierre de ExplorAR 1.0

> Documento histórico. Las ampliaciones posteriores se describen en README y en las versiones 1.1 a 1.4; la validación física continúa pendiente.

**Candidato para validación educativa, no aceptación final de producción.** El alcance y los límites están en [alcance-v1.md](alcance-v1.md).

## Trabajo preparado

- Código dividido en módulos; presentación de referencia y fichas compactas conservadas.
- Tipografía/composición final de tarjetas concentrada en `styles/cards.css`; navegación, paginación e identidad mantienen responsabilidades separadas.
- Cámara con cancelación de solicitudes pendientes, liberación de pistas ante fallos/salida y estado 3D recuperable. Pruebas con medios simulados.
- Mensaje de recuperación ante un arranque sin gráficos 3D; pausa del bucle al ocultar la página.
- Inventario de siete GLB con tamaño, huella y evidencia de procedencia.
- Guías de uso y docencia, protocolos presenciales y procedimiento de publicación.
- Ejecución de cierre reproducible con logs/capturas persistentes y huella de las fuentes. Paquete mínimo con manifiesto y prueba HTTP independiente de la copia.

## Cómo leer la evidencia

`reports/latest.json` apunta al último informe y especifica el resultado real de cada comando. Solo un código de salida cero, sin señal ni timeout, cuenta como prueba aprobada. Si las fuentes cambian durante las comprobaciones, se invalida el resultado global. La prueba de paquete se guarda junto al informe después de `release:prepare`.

`dist/latest.json` identifica el directorio y archivo comprimido del candidato, su huella, el tamaño y los pendientes. Estas carpetas se generan localmente y no se incluyen en el sitio publicado. No use informes previos para afirmar que una modificación posterior está verificada.

## Pendientes que requieren evidencia externa

| Pendiente | Responsable/evidencia necesaria |
| --- | --- |
| Android/iPhone y cámara física | Responsable de pruebas: completar `validacion/dispositivos.md` |
| Fluidez, batería y uso prolongado en equipos del aula | Medición física y registro de incidencias; no inferirlo del renderizado por software |
| Revisión humana de accesibilidad | Teclado y tecnología de asistencia, zoom/espaciado y contraste sobre vídeo real |
| Contenido y comprensión educativa | Docente y estudiantes; completar `validacion/piloto-educativo.md` |
| Licencia pública de recursos propios, si se desea ofrecer reutilización | Elección del autor; la autoría propia ya está confirmada en catálogo e inventario |
| Procedencia de referencia visual | Confirmación del titular de la referencia aportada |
| Alojamiento HTTPS | Dirección, acceso del responsable y verificación física desde esa dirección |

No se han inventado resultados de usuarios, autorización de recursos, certificaciones ni pruebas con hardware. El paquete conserva los modelos para revisión y queda identificado como candidato mientras se resuelven estos puntos.

## Ampliaciones fuera de este cierre

Guardar escenas, cuentas, notas persistentes, simulación eléctrica y seguimiento espacial de AR requieren trabajo y definición de alcance adicionales. Actualmente la cámara superpone objetos al vídeo; no reconoce marcadores ni superficies. La entrega actual puede validarse como laboratorio 3D educativo con cámara opcional.
