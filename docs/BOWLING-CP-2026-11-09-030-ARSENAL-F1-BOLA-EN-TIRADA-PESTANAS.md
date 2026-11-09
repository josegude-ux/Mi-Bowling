# BOWLING-CP-2026-11-09-030 — ARSENAL F1 · Bola retirada de la selección durante una tirada

**Fecha local:** 9 de noviembre de 2026 (CET).  
**Estado:** FASE 1 LAB VALIDADA; SIN FUSIONAR NI PUBLICAR.  
**Continuidad:** CP-029 → CP-030. La orden y la PR #17 originales se mantienen; no se crean nuevas PR ni órdenes.  
**Rama:** `feature/catalogo-arsenal-f1-lab-20261108`.  
**Commit exacto de código y pruebas validado:** `59452d03562bf3f8464be7357644593986f92e40`.  
**Evidencia CI:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42536807833, `completed / success`, mismo SHA.  
**Main y respaldo leídos/verificados:** `566aafdc05be163baf8c7f82e60433b0f532d748`.  
**Rama de respaldo:** `backup/main-antes-arsenal-f1-20261108` (`566aafdc05be163baf8c7f82e60433b0f532d748`).

## Recuperación y auditoría de continuidad
- Se recuperó directamente CP-029 y se verificaron los archivos actuales de `app.js` y `tests/ball-selection-lab.cjs` en la misma PR #17.
- Al inicio, `main` y respaldo coincidían en `566aafdc05be163baf8c7f82e60433b0f532d748`.
- Las PR #1, #8, #10, #12 y #13 estaban abiertas, en borrador, no fusionadas y conservaban sus SHA anteriores.
- No hubo operaciones en `main`, respaldo, datos deportivos reales, calendario publicado ni otros proyectos.

## Nuevo caso de riesgo probado
Una pestaña A deja abierto el registro de una sesión ficticia; su bola actual es Beta y ha marcado el bolo 1 como **en pie**. En otra pestaña B, abierta en el mismo navegador, el jugador desmarca Beta de la selección operativa de esa sesión. A conserva intencionalmente la pantalla y los bolos marcados para no perder el lanzamiento.

**Defecto reproducido (antes de corregir):** `recordRoll()` leyó directamente el selector HTML desactualizado de A y anotó el tiro siguiente con `ballId='lab-b'` pese a que la selección vigente ya era `[]`. El primer lanzamiento histórico con Beta permanecía correcto.

**Evidencia reproducible:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42536647424, `failure` sobre SHA de test `0a93c57f1ed51522ad51497cad74acf1bc5de603`: comparación real `['lab-b','lab-b']` frente a esperada `['lab-b','']`. Datos totalmente ficticios, sin afectar a partidas reales.

## Corrección aplicada exclusivamente en LAB
En `app.js`, dentro de `recordRoll()`:
- Se obtiene la bola solicitada a partir de `#roll-ball`.
- Se consulta `selectedBallsFor(s.id)` **justo antes** de registrar el lanzamiento.
- Solo si existe una selección explícita y la bola solicitada ya no está incluida, se usa el valor vacío («Sin asignar») para ese tiro y la bola actual.
- Si no existe filtro de selección (`null`), se conserva el comportamiento de sesiones anteriores; la comprobación existente de existencia de bola permanece.
- Los bolos en pie y los derribados, la línea de juego y las tiradas históricas siguen preservándose.
- No se alteraron `db.version`, atributos de bolas, estructura de `sessions` / `rolls`, autenticación, APIs o dependencias.

## Pruebas y resultado
- Nueva función `concurrentRollDeselectionScenario()` en `tests/ball-selection-lab.cjs`: dos pestañas del mismo contexto, sesión histórica ficticia, selección de bolos antes del cambio, desmarcado en B y tiro en A, comprobación de `ballId`, nueve bolos derribados, bola actual en blanco, ficha de bolas y primer tiro histórico inalterados. Ejecutada en Chromium y WebKit con viewport móvil de 390 × 844.
- **CI final:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42536807833 — **SUCCESS**, `head_sha=59452d03562bf3f8464be7357644593986f92e40`.
- Líneas explícitas del log:
  - `OK chromium 390px: desmarcar bola desde otra pestaña no contamina lanzamiento abierto`.
  - `OK webkit 390px: desmarcar bola desde otra pestaña no contamina lanzamiento abierto`.
- Los pasos del workflow también acreditan éxito en pruebas previas de Fase 1, cambios entre sesiones, multijuego, copias JSON ficticias, marcador, PWA offline, calendario FGB 31 eventos y responsive con Chromium y WebKit.

## Limitaciones y siguiente paso
- La corrección cubre cambios **secuenciales** de selección local entre pestañas del **mismo origen**; no garantiza transacciones atómicas ni sincronización remota entre dispositivos.
- No se ha validado físicamente Safari en iPhone; WebKit emulado no sustituye esa prueba.
- PR #17 sigue abierta en borrador, sin merge ni publicación. Fase 2 excluida, sin campos nuevos en las fichas de bolas. No usar datos reales para pruebas.
- Próxima acción segura: otras pruebas F1 justificadas en LAB, o plan de validación privada en un iPhone físico sin desplegar producción. Mantener botones ejecutables al detenerse.
