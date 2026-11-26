# MI BOWLING · Campeonato de España Parejas 2026 · Preparador 6+6
**Checkpoint:** MI-BOWLING-PAREJAS-REGISTRO-LAB-CP001-20261126  
**Fecha:** 26 noviembre 2026 · **Únicamente LAB; no publicado**  
**Homologación:** MI-BOWLING-PAREJAS-REGISTRO-LAB-CP002-20261126 · Chromium + WebKit automatizados PASS

## Recuperación y continuidad
- Base exacta de producción antes del trabajo: `main ec9d63c69388c304682b7477250fcd859aec296c` (PR #83 Circular 6249 ya publicada).
- Rama creada desde ese commit: `lab/parejas-2026-registro-20261126`; no reconstruir PWA, no fusionar con otra rama desfasada.
- Fuente oficial: Circular FEB 6249 de 26/11/2026, pág. 6 (CELTA XUNTA, José Gude ES 0147 + Lázaro Galguera ES 1046, pista inicial 17, desplazamiento **2 pistas** tras cada partida, encabezado 09:00, columna TURNO=0 discordante).
- El calendario oficial preexistente y Circular FEB 6246 definen dos series de 12 partidas por pareja: **6 partidas por jugador en cada serie**, 28 y 29 de noviembre. No se extrapola automáticamente un par de pistas nuevo para el domingo.
- Patrón confirmado pág. 7: KEGEL IKON PAREJAS 2026, 41 pies, 26,5 ml (18,85 ida y 7,65 retorno).
- Ninguna edición en Supabase, main, Cachefix2, CP003/CP004, fotografías, partidas ni historial reales.

## Implementado en LAB
1. `integracion/parejas-2026-planificador.js`: módulo puro, sin I/O; marcador persistente en `notes` compatible con la versión v2. Fecha, id de jornada, pista, primer juego, límite de seis, +2, resumen y prevención de duplicados.
2. `releases/catalogo-local-f1-fotos1/app.js`: tarjeta de torneo integrada en «Empezar partida» para competiciones y botón en el evento FGB-2627-10 del calendario. Crea una sesión oficial por día únicamente al tocar «Preparar sábado/domingo» y guarda por el mecanismo existente `MiBowlingEscritura`; cada una cuenta en estadísticas oficiales. Si ya existe la jornada, la reabre.
3. `integracion/registro-compacto.js`: marcador compacto no desplazable durante anotación; al finalizar cada juego propone la siguiente pista +2, campo editable y botón de confirmación. Tras la sexta partida el botón lleva al resumen en lugar de crear otra.
4. Registro clásico: propone siguiente pista editable, bloquea la séptima y permite volver al resumen.
5. Sábado: pista inicial 17 según Circular 6249 (editable por cambio de organización). Domingo: pista inicial **no publicada**, obligatoria antes de crear su jornada. El paso +2 es una **propuesta**, no una pista real afirmada; no se inventa un módulo ni una vuelta al comienzo de la bolera.
6. `index.html` y `sw.js`: carga del módulo y nuevos hashes de integridad de recursos; antiguo caché y hash de contenidos no afectados se conservan.
7. No se crean puntuaciones de la pareja: el acumulado corresponde solo al usuario; no se modifica el arsenal. Brunswick Cutting Edge Solid en reparación; el sustituto no se preasigna.

## Verificaciones
- **PASS:** prueba de dominio `tests/parejas-2026-planificador.test.cjs` en workflow GitHub Actions (sintaxis y contratos).
- **PASS Chromium real (automatizado con datos ficticios):** [run 45804113096](https://github.com/josegude-ux/Mi-Bowling/actions/runs/45804113096), job `torneo-ficticio` SUCCESS. Confirmados: arranque sábado pista 17, avance +2 editable (19 corregida a 21), anotación de 6 partidas, bloqueo 7.ª, domingo pendiente de pista, domingo con pista 13 ficticia, 7/12 y recarga sin duplicados. Detectado y corregido previamente un defecto de comillas en el `onclick` de creación, seguido de ajuste del test para simular elección inicial de modo del registro compacto.
- **PASS WebKit / motor Safari (automatizado en runner Ubuntu, datos ficticios):** [run 45804376389](https://github.com/josegude-ux/Mi-Bowling/actions/runs/45804376389), job `torneo-ficticio` SUCCESS; recorrido completo equivalente 6+6, pistas confirmables, jornada domingo, reinicio y persistencia sin duplicados.
- **PASS integridad:** versión v2 y SHA-256 de los recursos del Service Worker, incluyendo el nuevo módulo, registro compacto e índice, en ambos workflows.
- **Límite de la prueba:** los resultados automatizados NO son homologación en Safari de un iPhone físico; esta queda pendiente.
- Workflow de LAB `.github/workflows/parejas-2026-registro-lab.yml`, sin secretos, sin publicación, sin acceso a la base remota.
- **NO EJECUTADA:** homologación Safari de iPhone físico, protección efectiva de las 12 partidas reales en dispositivo, comparación con backups reales.
- **GO de LAB:** pruebas automatizadas Chromium y WebKit aprobadas sobre registros exclusivamente ficticios.
- **NO GO publicación:** queda pendiente autorización específica para publicar esta función, plan de rollback del despliegue y, para homologación completa, validación con Safari en iPhone físico; jamás dar por probadas fotos y partidas reales en el runner.

## Límites funcionales
- El protocolo oficial no indica la pista inicial del domingo ni el límite/vuelta de los desplazamientos; el usuario debe confirmar al cambiar de pista.
- Se aprovecha el único registro existente; las 12 partidas no son ficticias hasta que el usuario las registra.
- La anotación de la puntuación del compañero y el total de pareja se podrán ampliar con contratos propios sin interferir con las estadísticas individuales.
