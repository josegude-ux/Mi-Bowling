# MI BOWLING — CP-014 · Miniaturas negro/rojo según tirada
Fecha: 2026-11-08
Estado: **CÓDIGO CORREGIDO Y CANDIDATA 3.3.8-prueba VALIDADA EN LAB / NO PUBLICADA**

## Incidencia detectada en iPhone
Captura del usuario y aclaración:
1. Tras la primera tirada, todos los bolos que quedan en pie se señalan en NEGRO; los que ya cayeron se ven grises.
2. Tras la segunda tirada, se mantienen NEGROS los bolos derribados en esa segunda tirada y aparecen ROJOS solo los que siguen en pie.
3. Los derribados en la primera continúan grises.
4. Spare: no quedan rojos; los derribados en segunda quedan negros.
5. Deshacer: elimina los rojos de la segunda y vuelve a los negros de los bolos que quedaban después de la primera.

## Código y alcance
- Rama: `fix/mini-pins-black-red-after-second-20261108`.
- PR #7: https://github.com/josegude-ux/Mi-Bowling/pull/7 (borrador).
- Base publicada anterior: `main` SHA `3e2e93e055c8bb7c3375a6dfe2f0ce2820830445`, versión `3.3.7-prueba`.
- Respaldo exacto del código de main: `backup/main-3.3.7-before-black-red-20261108`.
- Commit de candidata **3.3.8-prueba** probado: `62dfb37af136098440b7248505f3543f6425be93`.
- Refresco de PWA: `APP_VERSION`, URLs JS/CSS y nombre de caché `v3-3-8-prueba` versionados.
- Función modificada: `registryPinMini(g)`. Solo lectura de `rollsIn`, sin persistir nuevos campos ni modificar `recordRoll`, `undoRoll`, puntuación, datos, backups o perfiles.
- Las animaciones 3D siguen aplazadas. No se ha incluido la PR #1.

## Pruebas verificadas
- CI final: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42501765069 — **SUCCESS** en el commit de código indicado.
- Unitarios: colores de bolos por número exacto tras 1.ª y 2.ª, spare, strike, fallo abierto, deshacer.
- Chromium y WebKit: 8/8 combinaciones 320×640, 390×844, 768×1024 y 1280×900.
- En ambos motores: ejemplo primera tirada deja 9 y 10 negros; segunda derriba 9 (negro) y deja 10 rojo; deshacer recupera negros; spare deja negros sin rojos.
- PWA offline y exportar/restaurar JSON con datos ficticios: pruebas correctas.

## Antes de publicar
- La versión **3.3.7-prueba** continúa en main sin cambios.
- La PR #7 permanece en borrador y no fusionada.
- Una publicación exige autorización expresa del usuario para 3.3.8-prueba y comprobación final del SHA, CI y respaldo. No combinar esta corrección con trabajos paralelos de perfiles locales ni con 3D.
- Tras publicar, probar la pantalla y la conservación de datos en iPhone real sin desinstalar la PWA.
