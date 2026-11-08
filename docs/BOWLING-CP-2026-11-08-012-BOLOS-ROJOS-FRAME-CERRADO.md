# MI BOWLING — CP-012 · Bolos no derribados al cerrar un frame

Fecha: 2026-11-08
Estado: **VALIDADO EN LAB / NO PUBLICADO**

## Corrección del requisito confirmado
El usuario aclaró expresamente: no colorear de rojo los bolos que quedan en pie después de la primera tirada. **Solo cuando se termina la segunda tirada y se cambia al siguiente frame**, los bolos que no se derribaron deben permanecer identificados en rojo en la miniatura del frame que acabó.

## Implementación
- Nueva función de lectura `registryFrameMissedPins(g,frame)`: calcula `PINS - (pins_primera ∪ pins_segunda)` para frames con dos tiradas y primeros lanzamientos sin strike.
- `registryPinMini`: muestra un punto rojo (`.missed`) por cada bolo no derribado tras finalizar la segunda tirada; durante la primera tirada no aparecen puntos rojos.
- Si la segunda tirada completa un spare, no queda ningún punto rojo. Si hay strike en el primer lanzamiento, tampoco.
- Deshacer el segundo lanzamiento revierte automáticamente las marcas rojas, pues las miniaturas se calculan con los datos reales en cada render.
- 10º frame: solo un frame abierto cerrado en dos tiradas usa la señal roja; los bonus especiales no se infieren como fallos de un cuadro normal.
- Se añade leyenda explicativa debajo de las miniaturas. Los números de bolo se representan en su posición correspondiente mediante `data-pin`.
- No se escriben datos nuevos ni se alteran `recordRoll`, `undoRoll`, `score`, `frameScores`, claves de almacenamiento local ni Liga Nacional.
- La animación 3D permanece aplazada y separada.

## Continuidad y seguridad
- Base publicada: `main` commit `2ef1954fd6cdb154d883059473b962892f06fbb5`, versión `3.3.6-prueba`.
- Rama aislada: `fix/mini-bolos-rojos-fin-frame-20261108`.
- PR #6: https://github.com/josegude-ux/Mi-Bowling/pull/6, **draft**.
- Las versiones en producción y sus datos de iPhone no se han modificado.

## Pruebas
- CI validada: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42499844165
- Resultado: `completed / success`.
- Pruebas unitarias del comportamiento: frame sin tirar, tras primera tirada, segunda tirada abierta con un/dos bolos restantes, spare, strike y décimo frame abierto.
- Pruebas de navegador en Chromium/WebKit: registro desde interfaz con dos tiradas, identificación roja del bolo 10, deshacer y spare, además de las 8 combinaciones previas de móvil/tablet/escritorio y PWA offline.
- Capturas disponibles en artefactos de esa ejecución, con retención temporal.

## Siguiente paso
Si el usuario autoriza publicar esta mejora, versionar la candidata como `3.3.7-prueba` y actualizar `APP_VERSION`, recursos JS/CSS y clave precache del service worker; ejecutar nuevamente tests y publicar únicamente tras éxito. No reutilizar un nombre de caché de `3.3.6-prueba`, porque impediría detectar de forma fiable la nueva interfaz sin desinstalar la PWA.
