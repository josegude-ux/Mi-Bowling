# MI BOWLING · 3.3.15-prueba · Registro nuevo con tres formas de anotar

**Fecha:** 22/11/2026 · **Base:** `main` 3.3.14-prueba (`36bb862`).

## Qué cambia
- El registro nuevo es el **registro normal** (se puede volver al clásico en *Ajustes → Registro de partidas*).
- Tres formas de anotar, elegibles por partida y con preferencia por defecto (se pregunta la primera vez): **Bolos** en pie, **Cantidad** (0–10, `/`, `X`, `F`) y **Solo puntuación**.
- **Bola de strike** y **bola de spare** (la de spare se usa en las bolas con bolos ya derribados; si no hay, la de strike).
- Marcador con **split** marcado con círculo, **máx. posible**, **tocar un frame para corregirlo**.
- Pantalla final: puntuación grande, **Compartir**, aviso «¿Te equivocaste?», **Siguiente: partida N** (mantiene par y alterna pista).
- Opciones (icono de ajustes): forma por defecto, incluir en estadísticas, registro clásico (par, línea, historial).

## Formato de datos (ampliación compatible)
- Tirada por cantidad: `{…, pins: [], count: n, pinDetail: 'count'}` — nunca se inventan bolos.
- Partida solo con resultado: `{…, rolls: [], finalOnly: 0–300}`.
- Sesión: `spareBallId` opcional (solo se guarda si se elige).
- `migrate` conserva estos campos; las partidas y sesiones anteriores no cambian ni un byte al volver a guardar (probado).
- Estadísticas: media, partidas, mejor partida, distribución y evolución incluyen las tres formas; análisis de bolos, pocket, splits, frames, pistas y bolas solo usan partidas anotadas por bolos.
- Aviso: una versión **anterior** de la app (3.3.14 o previas) descartaría estos campos si llegara a guardar; no reinstalar versiones antiguas.

## Pruebas (Chromium, historial v2 ficticio con forma real)
`tests/registro-compacto-real-browser.cjs` PASS · núcleo de puntuación (278, 266, 300, 0, spares, 10.º frame) · CP030 PASS (61 SHA-256) · 5 tamaños de iPhone sin scroll ni solapes en Bolos y Cantidad · service worker 61/61.
Pendiente: Safari en iPhone físico.
