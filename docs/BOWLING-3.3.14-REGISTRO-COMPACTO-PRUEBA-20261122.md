# MI BOWLING · 3.3.14-prueba · Registro compacto en la PWA real

**Fecha:** 22/11/2026 · **Base:** `main` 3.3.13-prueba (`1fdef63`) · **Origen del diseño:** LAB CP021/CP032 (`lab/cp032-registro-compacto-v3-20261122`).

## Qué cambia
- Nueva pantalla de **registro compacto** (una sola vista, bolos grandes, tema oscuro), **opcional** y **desactivada por defecto**. Se activa en *Ajustes → Registro compacto*.
- Solo modo **Bolos**. «Cantidad» y «Solo puntuación» se muestran deshabilitados: requieren el formato v3, que la app actual (`migrate` v2) descartaría al leer. Siguen en LAB (NO GO CP032).
- «⋯» abre la **vista clásica** de esa partida (cambiar par, línea de juego, historial y corrección de tiradas, incluir en estadísticas) con un botón para volver al compacto.

## Por qué es seguro para datos reales
- `integracion/registro-compacto.js` **no tiene almacenamiento propio**: cada botón llama a las funciones existentes (`togglePin`, `recordRoll`, `fastRoll`, `foulRoll`, `undoRoll`, `changeBall`, `addGame`), que guardan en `mi-bowling-analitica-v2` mediante `MiBowlingEscritura` (Web Lock + journal). Mismo formato v2, mismos campos (`ballId`, `line`, `lane`, `pair`, `foul`, `createdAt`).
- La preferencia se guarda en `mibowling.pref.registro-compacto`, **fuera** del prefijo `mi-bowling-`: no entra en las 8 claves protegidas, ni en respaldos ni restauraciones.
- No se toca ningún módulo CP032 ni el boot LAB; no hay migración de datos.

## Cambios de archivos
- Nuevo: `integracion/registro-compacto.js`, `tests/registro-compacto-real-browser.cjs`.
- `releases/catalogo-local-f1-fotos1/app.js`: `APP_VERSION` 3.3.14-prueba; `registry()` delega en el compacto si está activo (el registro anterior queda como `registryClassic()` sin cambios); tarjeta en Ajustes; `render()` limpia la clase `rc-open`.
- `index.html`: carga del módulo antes de `arranque-fotos.js`.
- `sw.js`: RELEASE `…-v3314-registro-compacto-prueba`; 61 recursos con SHA-256 (cambian `./`, `./index.html`, `app.js` de la release y el módulo nuevo).

## Pruebas (Chromium, historial v2 ficticio con forma real)
`tests/registro-compacto-real-browser.cjs` — PASS:
desactivado por defecto con registro clásico; activación en Ajustes; frame abierto, spare, deshacer, falta y canal; strikes hasta 229 verificado; partidas y tiradas anteriores idénticas byte a byte; bola, línea, par y alternancia de pista iguales al clásico; recarga sin cambios; siguiente partida; vista clásica y vuelta; 375×667, 390×844, 393×852, 428×926, 430×932 sin scroll ni solapes y bolos ≥ 44 px; desactivar devuelve el clásico; sin errores JS; service worker 61/61 SHA-256.

## Pendiente / riesgos
- No probado en Safari de iPhone físico: comprobar al recibir la actualización (activar en Ajustes, anotar una partida de prueba de entrenamiento y revisar Partidas/Estadísticas).
- Vuelta atrás: desactivar el interruptor (efecto inmediato) o revertir este merge; los datos no cambian de formato.
