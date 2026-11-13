# Recursos visuales de la referencia

La referencia es `ExplorAR_ Saturno en realidad aumentada.png`, facilitada por el usuario. Estos recursos se prepararon con la herramienta integrada **image_gen**, mediante la habilidad **imagegen**, y se copiaron al proyecto conservando el PNG original generado.

- `assets/explorador.png`: personaje con transparencia, decorativo y sin capturar eventos.
- `assets/aula.png`: escenario fotográfico decorativo de la vista 3D. Al activar la cámara, el vídeo del dispositivo ocupa ese fondo.

Las miniaturas de sensores se renderizan con Three.js a partir del modelo cargado; no son imágenes generadas.

## Prompt final de explorador.png

Use case: background-extraction. Asset type: transparent mascot cutout for this exact ExplorAR website. The supplied full UI image is the edit target. Extract ONLY the friendly cartoon schoolboy in the bottom left corner: navy tousled hair, bright cyan AR glasses, cheerful open smile, navy hoodie, backpack straps, right index finger pointing upward and slightly right, original thick white sticker outline. Preserve the character's identity, illustration style, pose, colors, clothes and expression as closely as possible. Remove the classroom photograph, wood table, purple corner shapes, all UI, Saturn, labels, symbols and yellow emphasis marks completely. Place only the boy on a truly transparent alpha background. Tight portrait framing around head, torso and raised hand. Keep all hair, finger and backpack details fully inside the image; extend only the cropped lower torso edge naturally if necessary. No text, no typography, no logos, no extra objects, no floor or background. This is a production transparent PNG asset, not a new interface mockup.

## Prompt final de aula.png

Use case: precise-object-edit. Asset type: realistic classroom background photograph for the ExplorAR educational 3D viewer, landscape 16:9. Edit target: the supplied interface reference. Reconstruct ONLY the underlying photographic environment. Keep the same warm wood tabletop with perspective grain covering the bottom 60 percent of the composition, softly out of focus green leafy houseplants in white ceramic pots in the upper left and mid-left, softly blurred blue-gray classroom or home-study shelving in the upper right, natural daylight, warm educational atmosphere, camera at tabletop viewing angle. Remove EVERY user-interface element, all text, badges, logo, buttons, cards, connector lines, the planet Saturn and rings, the printed rocket marker, all cyan light effects, the cartoon child and colored corner ribbons. Fill all removed areas naturally to reveal a continuous realistic table and softly blurred room. The central tabletop must be completely clear so actual interactive 3D models can be drawn over it. No lettering, no logos, no watermarks, no people, no drawn objects, no UI, no planet, no printed marker. Output a clean landscape photograph only, not a website screenshot. Match the photographic style, perspective, lighting and color balance of the reference as closely as possible.
