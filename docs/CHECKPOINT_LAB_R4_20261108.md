# MI BOWLING — Checkpoint LAB R4: compatibilidad 3.3.3 + ergonomía móvil

**Fecha:** 2026-11-08  
**Rama:** `feature/linea-visual-r1-20261108` · PR #1 borrador  
**Base funcional R3 recuperada:** `e19af0c966dc748b6af81389d012dff8b49c5ca3`  
**Código LAB R4 comprobado:** `2013160a169bad6944bdfb2e727aeb54af467973`  
**Pruebas automatizadas (success):** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42492420275

## Hechos verificados

1. La rama pública `main` avanzó independientemente hasta `3440d0133b2b500eb6f6a7bd3872c4479ddbe7bb`, con **MI BOWLING 3.3.3-prueba** y los menús inspirados en INVENTA. La PR #1 parte de una base anterior y aparece como **dirty/no mergeable**; no debe fusionarse aún.
2. En LAB se recuperó como código base de `app.js` la implementación 3.3.3-prueba, añadiendo solo la persistencia de `breakpointFt`, el editor 3D/cenital, corrección histórica sin borrar tiradas y estadísticas completas de línea. Se conservan todas las funciones de los menús 3.3.3 y del editor 2D anterior como código (aunque el registro presenta como opción cenital el editor SVG de R1).
3. En LAB se actualizó `styles.css` a la misma versión de `main` (3.3.3), preservando el diseño de inicio y sus módulos.
4. En el editor interactivo se añadieron botones táctiles **+ y − de 44 px de altura** para pies, flecha, breakpoint (media tabla) y distancia (1 pie); las dos vistas se actualizan al usarlos. Los controles de cámara y cambio de vistas también tienen dianas ampliadas.
5. La PWA en LAB ahora precarga las **URL exactas con versiones** de los 6 recursos CSS/JS usados por `index.html`. Evita que la instalación quede sin scripts o estilos durante una apertura sin red.
6. Las pruebas automáticas en Chrome/Chromium recorren 390, 768 y 1440 px, validan la portada 3.3.3 con los cuatro menús principales, registro ficticio de un tiro, almacenamiento efímero, 3D/cenital, cámara, distancia, corrección sin pérdida, botones táctiles y ausencia de desbordamiento horizontal.

## Resultado / límites

- **CI en verde:** validación automatizada de las funciones descritas; no equivale a pruebas manuales en Safari/iPhone o Android físico.
- **Producción intacta:** el commit de `main` permanece en `3440d0133b2b500eb6f6a7bd3872c4479ddbe7bb`; no se modificó en este trabajo.
- **Conflicto de historial pendiente:** la PR sigue divergiendo de `main` (23 commits detrás al comenzar la revisión); contenido adaptado, pero GitHub sigue rechazando la fusión automática. No ejecutar merge ni rebase sin nueva revisión/autorización.
- **Datos:** pruebas aisladas sin acceso a registros reales ni carga de PDF. No usar datos personales en las demos GitHack.

## Accesos experimentales (proveedor externo; solo datos ficticios)

- Pista 3D independiente: https://raw.githack.com/josegude-ux/Mi-Bowling/2013160a169bad6944bdfb2e727aeb54af467973/lab/demo.html
- MI BOWLING 3.3.3 + 3D en LAB: https://raw.githack.com/josegude-ux/Mi-Bowling/2013160a169bad6944bdfb2e727aeb54af467973/lab/app.html

**Importante:** se probó el código en GitHub Actions, pero no se ha certificado que GitHack sirva estos enlaces correctamente a todos los navegadores; no utilizar como alojamiento de producción.

## Siguientes pasos

1. Abrir el LAB en Safari/iPhone y comprobar los gestos sobre el canvas, botones +/- , scroll vertical y tamaño visual de marcadores.
2. Validar accesibilidad, VoiceOver, gestos y rendimiento de dispositivos reales.
3. Resolver de forma explícita el conflicto histórico con `main` en una operación de integración aislada, sin publicar ni afectar `main`, cuando se autorice.
4. Conservar copias recuperables y confirmar datos históricos con simulaciones, Liga Nacional y exportación/restauración antes de proponer publicación.

**Checkpoint:** `BOWLING-LAB-COMPAT-R4-20261108`. Estado: compatibilidad funcional automatizada validada; pruebas físicas e integración Git pendientes.
