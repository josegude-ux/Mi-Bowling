# MI BOWLING · CP-025 — Cierre de análisis y asistente de Arsenal R1 (LAB)

**Fecha:** 08/11/2026 · Europe/Madrid
**Estado:** LAB VALIDADO; PR EN BORRADOR; SIN FUSIONAR NI PUBLICAR.
**PR:** https://github.com/josegude-ux/Mi-Bowling/pull/19
**Rama:** `feature/arsenal-analisis-asistente-lab-20261108`
**Código EXACTO validado:** `65c45788e28e91057a07210959c85e08a403012b`
**CI:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42532808992 — `SUCCESS`.
**Base dependiente:** PR #17 (`feature/catalogo-arsenal-f1-lab-20261108`), HEAD `ec6cbd509484573cbdf9a1cff61f802bedec2d61` (F1 CP-024).
**Main publicado verificado:** `566aafdc05be163baf8c7f82e60433b0f532d748` (CP-020).
**Respaldo previo a R1:** `backup/arsenal-f1-cp022-antes-analisis-20261108` → `4708ba2c0a193db3d3d5709f7144f2a3287e21ac`.

## Trabajo completado
- Integración en LAB de un catálogo local consultivo para los diez modelos identificados, sin insertar ni duplicar bolas reales.
- Análisis individual (núcleo, RG, diferencial, cubierta, papel en arsenal, volumen/longitud orientativos, reacción y límites). Datos de origen son fichas orientativas de fábrica: se distinguen de las medidas del taladro y de la superficie actuales.
- Comparación de bolas marcadas mediante el selector F1 existente y alternativas de equipo 3/4/6, siempre limitadas a bolas seleccionadas y activas. No inventa recomendaciones para modelos sin ficha.
- Asistente interactivo de 4 síntomas: falta de recuperación, agarre prematuro, reacción brusca y pocket sin derribo; propone observaciones, ajustes y bolas de la selección activa, sin cambios automáticos ni registrar tiros.
- Botón de acceso desde el marcador y regreso directo a la partida con preservación de los bolos pendientes.
- Reutilización exclusivamente del campo libre `notes` para observaciones de taladro. Ningún campo obligatorio nuevo; sin análisis geométrico automático de fotografía no validado.
- Reconciliación explícita con F1: retirada/reactivación limpia selecciones temporales y respeta lanzamientos antiguos, pruebas de competición oficial, restauración JSON asíncrona, y documentación CP-023/CP-024.

## Pruebas verificadas
Ejecución CI final sobre el código exacto `65c45788e28e91057a07210959c85e08a403012b`: **SUCCESS**.
- Regresión de iconos, portada, calendario FGB de 31 entradas y lógica de puntuación.
- Chromium/WebKit emulados en móvil/tablet/escritorio y PWA offline con datos ficticios.
- F1: selección por sesión y lanzamiento, cambios, retiro/reactivación, histórico, restauración JSON, competición oficial con patrón ficticio y regresión de 430×932.
- R1: diez perfiles consultivos, notas antiguas, sin ficha para bola desconocida, 4 decisiones, equipos 3/4/6, acceso desde registro y regreso conservando bolos sin registrar tiro.
- Sin nuevos campos de bola, sin cambios en `db.version=2`, sesiones, historial de PDF ni exportación; no hay llamadas a cuentas reales.
- PR #1, #8, #10, #12, #13, #17 y #19 verificadas abiertas como borradores, sin fusión.

## Límites de entrega
- Solo CI de Chromium y WebKit emulados. **No** se ha probado Safari en un iPhone físico ni se ha accedido a las partidas reales.
- Los 10 modelos están en catálogo de consulta, pero no se han cargado automáticamente en el dispositivo: MI BOWLING no conoce sus fichas locales sin que el usuario las incorpore.
- Rhino Pro Gold (original/reedición) y clasificación histórica del núcleo Bully por verificar. Layout, PAP, superficie, velocidad y revoluciones del jugador pendientes.
- No crear cuentas ni servicios; no fusionar, publicar o modificar main sin autorización distinta.

## Continuidad
El trabajo solicitado está completado **en LAB**. Tomar como base CP-025 y PR #19 para cualquier prueba en iPhone físico o eventual decisión posterior sobre publicación. No repetir pruebas aprobadas a menos que cambie el código o el entorno.