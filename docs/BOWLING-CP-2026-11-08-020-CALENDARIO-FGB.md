# BOWLING-CP-2026-11-08-020 · Calendario FGB temporada 2026-2027

Fecha de control: 08/11/2026
Estado: **LAB VERIFICADO; NO PUBLICADO NI FUSIONADO**.

## Fuente y clasificación
- Fuente: FEDERACION GALEGA DE BOLOS, CALENDARIO PROVISIONAL DE BOWLING 2026-2027, Vigo a 17 de Xullo 2026; PDF adjunto de 2 páginas.
- Criterio explícito confirmado por el usuario: **fondo verde = calendario gallego; fondo blanco = calendario nacional**.
- 31 entradas: **10 gallegas** (6 página 1 + 4 página 2) y **21 nacionales**.
- Los intervalos de dos días se conservan completos; pruebas diferentes celebradas el mismo fin de semana se mantienen como entradas diferentes, sin colapsarlas.
- El documento es provisional: puede haber modificaciones y no garantiza sede u horario.

## Particularidades transcritas literalmente
- XL LIGA NACIONAL 1ª JORNADA: **23–24 de enero de 2027**, sede no indicada.
- XL LIGA NACIONAL 2ª JORNADA: **13–14 de marzo de 2027**, sede no indicada.
- XL LIGA NACIONAL 3ª JORNADA: **29–30 de mayo de 2027**, sede no indicada.
- En enero de 2027 aparece un torneo llamado **CTO. ESPAÑA SUB-25 2026**; no corregir sin fuente nueva.
- El PDF escribe **MADRI** como sede de CTO. ESPAÑA INDIVIDUAL 2027 – MASCULINA (15–16 de mayo); no normalizar por suposición.
- Figuran VILLARGACIA y VILLAGARCIA como grafías distintas; se preserva la forma original de cada fila.
- No se han inventado horarios, equipos, inscripciones o pistas.

## Implementación aislada
- Rama `feature/calendario-fgb-2026-2027-lab-20261108`; PR #16: https://github.com/josegude-ux/Mi-Bowling/pull/16.
- Dataset en `data/calendario-fgb-2026-2027.json` y recurso estático offline `official-calendar-2026-2027.js`.
- Agenda existente ahora distingue: **verde Gallego**, **azul Nacional** y **turquesa Mis partidas**.
- Filtros: Todos, Gallego, Nacional, Mis partidas. Las fechas con varias pruebas muestran cada competición, sin duplicar IDs ni crear partidas nuevas.
- Fechas de inicio y fin inclusivas, sedes vacías explícitas y etiqueta Provisional.
- El calendario oficial es de solo lectura y está separado de `db.sessions`, no hay migraciones ni altas automáticas.
- APP_VERSION `3.3.8-prueba` y claves `mi-bowling-analitica-v2`/`mi-bowling-v1` permanecen iguales.
- Caché LAB: `mi-bowling-analitica-v3-3-8-prueba-fgbcalendar1`, scripts y estilos `338fgb1`.
- Mantener sin fusionar PR #1, #8, #9, #10, #12, #13 y demás trabajo no relacionado.

## Evidencia de verificación
- GitHub Actions **SUCCESS**: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42524147912.
- SHA exacto del código probado: `08f398ffcc77ae4a143b05e0e9fe37fa4d68d2a8`.
- 31 fechas/10 verdes/21 blancas, 3 jornadas sin sedes, 4 pruebas simultáneas de noviembre y octubre: comprobadas.
- Pruebas de filtros y visualización, iconos PWA, calendario histórico, datos locales ficticios y pruebas de regresión: correctas.
- Chromium y WebKit en 320, 390, 768 y 1280 px: aprobados; no implica prueba en iPhone físico.
- `main` antes/después de LAB: `bb4e055fec10ec802961e8d350d01404e90a6e2b` inalterado.

## Publicación
- **No** desplegar ni fusionar sin autorización explícita del usuario.
- Antes de hacerlo, verificar cambios posteriores al commit probado, respaldo de main, pruebas finales, caché y PRs independientes.
- El PDF es provisional, por lo que conviene permitir sustitución por versión oficial posterior conservando IDs estables y sin modificar partidas.