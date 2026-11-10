# BOWLING — Checkpoint 006 · 2026-11-08

## Problema confirmado
En 3.3.4-prueba, «Cambiar par» dejó de aparecer en el marcador de una sesión sin par asignado. El render introducido en el cambio anterior condicionaba el botón a `lane.pair`. Esta condición afecta especialmente a sesiones con una sola pista o sin pista/par definidos.

## Corrección aplicada
- «Cambiar par» se muestra **siempre** junto a «Deshacer último lanzamiento» bajo el marcador.
- La información de alternancia de pistas sigue mostrándose solo cuando hay un par; el botón no depende de `lane.pair`.
- «Deshacer» se mantiene desactivado cuando aún no existen lanzamientos.
- El editor existente permite configurar un par también desde una partida sin par.
- Se conservan las funciones `changePair`, `undoRoll`, la lógica de puntuación y todas las claves de almacenamiento local.
- Sin cambios 3D ni eliminación de datos.

## Versión y respaldos
- Versión de prueba corregida: `3.3.5-prueba`.
- Rama de corrección: `fix/cambiar-par-siempre-visible-20261108`.
- Base: `main` commit `ce11c5520c315b637c877407391752239606be20`.
- Respaldo exacto previo: `backup/main-3.3.4-prueba-before-pair-fix-20261108`.

## Pruebas verificadas
- Sintaxis de `app.js` válida.
- Suite de pruebas anterior `tests/visual-lab-smoke.cjs` superada con regresión actualizada.
- Render del registro verificado con 4 combinaciones: con/sin par, con/sin lanzamiento.
- El botón «Cambiar par» se muestra en las 4; «Deshacer» queda activado solo al existir tiradas.
- Archivos `index.html`, `sw.js`, `app.js` versionados para actualización PWA.
- Pendiente verificación táctil en iPhone físico.

## Continuidad
Comprobar 3.3.5-prueba en la app instalada. Si aparece un problema, corregir en nueva rama y mantener las animaciones 3D aplazadas.
