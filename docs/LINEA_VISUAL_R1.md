# MI BOWLING — Línea visual R1 (laboratorio)

## Alcance

Editor interactivo para registrar **posición inicial de los pies**, **tabla de paso por las flechas**, **tabla del breakpoint** y **distancia del breakpoint en pies**. Inspiración funcional: Angles & Targeting de Tenpin Toolkit, con diseño e implementación propios.

- Vista cenital de pista de 39 tablas; tabla 1 a la derecha mirando los bolos.
- Punto de flechas representado a 15 pies de la línea de falta.
- Breakpoint configurado entre 25 y 55 pies; ejemplo visual en 43 pies.
- Posiciones ajustables mediante arrastre táctil, teclado o controles numéricos (medias tablas).
- Los puntos de salida corresponden a los **pies**; no se deben interpretar como lugar de suelta de la bola. Línea discontinua = referencia visual, no trayectoria física estimada.
- Marcadores vacíos muestran valores ilustrativos en el dibujo, sin inventar datos en la sesión ni en los lanzamientos.
- Mantiene la última línea editada para la siguiente tirada. Al registrar una tirada se guarda instantánea en `roll.line`; el historial incluye break y distancia.
- Retroceder a una tirada recupera su línea; entrenamientos y competiciones mantienen su separación.

## Datos y compatibilidad

Extensión aditiva de `currentLine` / `roll.line` con `breakpointFt`. Conserva los campos legados `approach`, `arrow` y `breakpoint`. `migrate()` y el JSON de exportación siguen preservando la estructura previa. No se modifica el almacenamiento de patrones PDF. No hay sincronización ni cambios de producción.

## Verificación

- Sintaxis de `app.js`, `line-editor.js` y `sw.js`: revisada.
- Editor: creación de SVG, tres marcadores, datos iniciales y protección de atributos HTML: verificado con mocks.
- Arrastre de pies y breakpoint (incluida distancia), teclado, repintado, persistencia y migración: verificado con mocks.
- Prueba reproducible: `node tests/line-editor.test.cjs` (Node 18+).
- **Pendiente antes de fusionar**: inspección visual y táctil en Safari/iPhone, Chrome/Android, escritorio; pruebas con partidas reales y copia/restauración de datos sobre una copia de prueba, nunca en los datos de producción.

## Para validar en móvil

1. Abrir una partida de laboratorio y localizar «Línea de juego».
2. Arrastrar punto naranja (pies), turquesa (flecha), morado (break) en el dibujo.
3. Comprobar que los controles numéricos se actualizan y que el breakpoint cambia de altura al editar distancia.
4. Registrar dos lanzamientos con líneas distintas. Confirmar que el historial conserva ambos y que el siguiente tiro recuerda el último.
5. Exportar JSON y verificar que los tiros incluyen `line.breakpointFt`. Restaurar **solo en entorno de prueba**.

## No incluido en R1

Predicción física del movimiento de bola, selección de laydown distinta del pie, superposición de PDF de aceite, vídeo, recomendaciones automáticas o edición posterior sin rewind del lanzamiento.
