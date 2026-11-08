# MI BOWLING · BOWLING-CP-2026-11-08-024 · ARSENAL ANÁLISIS Y ASISTENTE R1

**Fecha:** 2026-11-08 (Europe/Madrid).
**Estado:** LAB VERIFICADO EN CI · BORRADOR · NO FUSIONAR NI PUBLICAR.
**PR:** https://github.com/josegude-ux/Mi-Bowling/pull/19
**Rama LAB:** `feature/arsenal-analisis-asistente-lab-20261108`
**Código y pruebas exactos:** `5cb3982f56ba60d9fb55b0fd1c13c969c4c47b98`
**Pruebas CI:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42532173113 · `SUCCESS`

## Recuperación y respaldo
- `main` verificado al cerrar: `566aafdc05be163baf8c7f82e60433b0f532d748`, CP-020, sin escrituras.
- Base recuperada: PR #17 (Fase 1), `4708ba2c0a193db3d3d5709f7144f2a3287e21ac`, documentación CP-022 / código probado `bda41e854b00a50fc2439a32bc49e8bec53ef8fc`.
- Respaldo creado y comprobado: `backup/arsenal-f1-cp022-antes-analisis-20261108` → `4708ba2c0a193db3d3d5709f7144f2a3287e21ac`.
- PR #17 avanzó después a CP-023 (`49082879cbf0d2138fd3ada492eea141fa50bcca`) con **solo documentación** de retirada/reactivación, no altera el código base de esta PR.
- PR #19 se dirige a la rama de PR #17 (stacked PR), no a main. No duplicar o fusionar F1 de forma independiente.

## Implementación
- `arsenal-insights.js`: catálogo local consultivo de 10 modelos, datos de fábrica y límites explicados; identificación estricta marca+modelo; Rhino Gold y Bully señaladas con incertidumbre.
- `arsenal-view-lab.js`: fichas individuales, catálogo, comparación solo de bolas **marcadas** por sesión, equipos orientativos 3/4/6 y guía de cuatro síntomas; excluye retiradas y evita fichas inventadas.
- `app.js`: botones de acceso en MIS BOLAS y en registro de lanzamiento, consultas de `notes` para taladro, conserva selección F1.
- `index.html`, `styles.css`, `sw.js`: carga y diseño responsive de módulos puramente locales, precarga para offline en rama LAB. **No se publica nueva caché**.
- `tests/arsenal-analysis-lab.cjs`: fixtures 100% sintéticas, 390/1280 px en Chromium/WebKit, contenido de 10 modelos, checks, cuatro síntomas, selección, ficha desconocida, nota de taladro, no escritura en DB ni pérdida de historial, desbordamientos JS/HTML.
- CI ejecuta también `tests/ball-selection-lab.cjs` y regresiones de iconos/PWA, portada/calendario, 31 fechas FGB, marcador y registros.

## Resultado verificable
- GitHub Actions #42532173113: `SUCCESS` sobre el SHA exacto `5cb3982f56ba60d9fb55b0fd1c13c969c4c47b98`.
- `main`, copia de respaldo, PR #1/#8/#10/#12/#13 y PR #17 no modificadas por esta actuación.
- `db.version=2` y campos originales de `db.balls[]`, `db.sessions[]`, `rolls[].ballId` intactos.
- No se añaden bolas automáticamente, ni se transfieren los datos del chat al dispositivo real.
- Sin fusión, publicación, servicios reales, cuentas ni migración.

## Límites pendientes
1. Safari/iPhone físico pendiente (WebKit emulado no equivale).
2. Confirmar versión exacta de Rhino Pro Gold, datos definitivos de Bully.
3. Fotos de taladros, PAP, superficies actuales, velocidad/revoluciones: la app no deduce una geometría fiable de una foto y no se ha añadido servicio de visión externo.
4. Antes de eventual publicación: conciliar PR apiladas, respaldo de datos reales exportados por el usuario y autorización explícita.

## Punto de continuación
Conservar PR #19 aislada. Próxima actuación segura: auditoría manual y Safari/iPhone físico sobre instalación **privada de LAB**, con datos ficticios; no publicar GitHub Pages ni retocar producción.