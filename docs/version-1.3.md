# ExplorAR 1.3 — laboratorio del eco

Amplía [las misiones 1.2](version-1.2.md) con experimentación del sensor ultrasónico.

## Cómo utilizarlo

1. Selecciona **Sensor ultrasónico → Ficha → Experimentar**.
2. Predice qué ocurrirá al alejar el obstáculo. Pulsa **Mover el obstáculo en la escena** y arrastra el bloque violeta o su control. Los botones y el teclado permiten ajustar la misma distancia.
3. Anota situaciones cercanas, lejanas y sin obstáculo. Escribe una explicación y tu regla para un robot; continúa al reto.
4. Guarda la escena o descarga evidencias desde la misión **Un robot que evita obstáculos**, disponible en **Mi escena → Misiones de exploración**.

Hay hasta 12 observaciones por componente. Escena y evidencias conservan distancia elegida, presencia del obstáculo, resultados calculables y explicación. Los archivos de escenas anteriores siguen abriéndose; utiliza esta versión para conservar las notas nuevas al volver a guardarlas.

## Modelo y límites

La actividad admite distancias elegidas entre 20 y 200 cm, sin atribuir ese intervalo al sensor representado. Usa un reflector frontal ideal y una velocidad de sonido elegida de 343 m/s. El tiempo de ida y vuelta se obtiene con `t = 2d / c`. La relación inversa entre distancia y tiempo de eco está documentada en [MathWorks, readEchoTime](https://www.mathworks.com/help/matlab/supportpkg/readechotime.html).

El dibujo tiene escala ilustrativa; la lectura se calcula desde el valor seleccionado. No mide el entorno ni modela temperatura, absorción, orientación o todos los posibles fallos de un módulo. Sin obstáculo se informa **Sin eco / distancia no disponible**, sin convertirlo en una lectura de cero centímetros. No se reproduce sonido ni se anima un pulso a una velocidad aparente que pueda confundirse con la real.

La actividad nueva se implementa en módulos independientes, mantiene la escena centrada en el viewport completo, la apertura bajo demanda, el panel integrado en escritorio y las flechas de paginación. La calidad de las explicaciones requiere revisión docente.

## Validación

`npm test`, `npm run test:echo` y `npm run verify:release` incluyen física ideal, datos portables, arrastre del bloque y su control, teclado, misión completa, exportación, cambios de selección, paginación y axe. El informe y el paquete solo representan las fuentes de su huella. Continúan pendientes pruebas físicas, revisión humana de accesibilidad, piloto educativo, alojamiento HTTPS y AR espacial.

## Corrección 1.3.1 — banner y nombres

El banner de modo se oculta temporalmente cuando su área coincide con una etiqueta visible de la escena. Reaparece cuando queda libre. Se conserva su espacio para evitar oscilaciones, sin modificar la cámara, la altura de etiqueta ni los conectores. La comprobación considera todos los componentes visibles y se recalcula al girar, acercar, cambiar de tamaño de pantalla, despejar el HUD o eliminar/deshacer objetos.

`npm run test:banner` reproduce la superposición del sensor de temperatura en 1280 y 1672 px y compara el área renderizada con una captura sin el banner. Verifica también estabilidad entre fotogramas y retorno del banner. Esta corrección evita que ese banner cubra nombres; los controles de la interfaz y los modelos conservan su profundidad habitual.
