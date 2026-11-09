# BOWLING-CP-2026-11-09-028 — ARSENAL F1 · Selección en pestañas concurrentes

**Fecha local:** 9 de noviembre de 2026 (CET).  
**Estado:** VALIDADO EN LAB, NO FUSIONADO, NO PUBLICADO.  
**Continuidad:** CP-027 → CP-028 (PR #17, sin nueva orden ni PR).  
**Rama existente:** `feature/catalogo-arsenal-f1-lab-20261108`.  
**Commit EXACTO validado (código y pruebas):** `664e9865ebc95de1fe8c4df929bb1c32670d581f`.  
**CI:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42535565671 — **completed / success**, mismo SHA.  
**Base publicada / main, sin cambios:** `566aafdc05be163baf8c7f82e60433b0f532d748`.  
**Respaldo:** `backup/main-antes-arsenal-f1-20261108`, `566aafdc05be163baf8c7f82e60433b0f532d748`.

## Incidencia comprobada antes de corregir
En dos pestañas del **mismo navegador/origen**, se ejecutó secuencialmente:
1. La pestaña A marcó la bola ficticia Alpha para la próxima sesión.
2. La pestaña B, abierta previamente, marcó Beta.
3. Como B tenía una copia obsoleta de `ballSelections` en memoria, sobrescribió la selección de A: quedó solo Beta.

**Evidencia de fallo reproducible:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42535376688, commit de test `24bd85836175a2326fbeab3d3c1784df7a033cc1`, AssertionError en `parallelTabsSelectionScenario`, resultado real `['lab-b']` frente a esperado `['lab-a','lab-b']`. No fue un fallo de pruebas antiguas ni pérdida de partidas originales.

## Corrección acotada (Fase 1)
Se modificó solo `app.js` en LAB:
- Se incorpora `latestBallSelections()` para leer la última selección local almacenada antes de mutarla. Si hubo error de escritura/cuota, se preserva el estado en memoria para no perder la selección operativa.
- `toggleSelectedBall`, `transferBallSelectionToSession`, retiro de una bola y borrado confirmado de sesión usan la copia vigente antes de actualizar, evitando sobrescribir selecciones ajenas en operaciones secuenciales.
- Un evento `storage` actualiza el estado de selección en otras pestañas y refresca la pantalla «Mis bolas» si no está abierto el formulario de edición. No se re-renderizan borradores de nueva sesión ni tiradas en curso.
- No se ha cambiado el esquema de `db.balls`, `db.sessions` ni de `rolls`, ni añadido campos, datos reales, cuentas, APIs o sincronización entre dispositivos.

## Nuevas pruebas y regresión
- `tests/ball-selection-lab.cjs`: `parallelTabsSelectionScenario()`, con un contexto compartido y **dos pestañas** a 390 × 844, en Chromium y WebKit. Se verifica:
  - A marca Alpha, B marca Beta → quedan ambas.
  - La recarga de A muestra ambas.
  - A desmarca Alpha → Beta permanece.
  - La recarga de B confirma Beta.
  - Sin cambios en bolas, sesiones o lanzamientos y sin errores JS.
- **CI SUCCESS:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42535565671, exactamente SHA `664e9865ebc95de1fe8c4df929bb1c32670d581f`.
- Mensajes del log:
  - `OK chromium 390px: dos pestañas conservan selecciones del mismo arsenal y evitan sobreescritura`.
  - `OK webkit 390px: dos pestañas conservan selecciones del mismo arsenal y evitan sobreescritura`.
- También superadas las pruebas previas: selección por sesión, borrado seguro, tolerancia a datos de selección corruptos, multijuego, competición oficial, historial, registro, importación/exportación JSON ficticia, calendario FGB (31 competiciones) y PWA offline; Chromium/WebKit en móvil, tablet y escritorio.

## Protección y límites
- PR #17 abierta en borrador, no fusionada. Main y respaldo en `566aafdc05be163baf8c7f82e60433b0f532d748`.
- PR #1, #8, #10, #12 y #13 permanecen independientes, no fusionadas.
- **No** se publicó, fusionó ni modificó código de producción, ni se accedió a partidas reales.
- La prueba verifica **interacciones secuenciales** entre dos pestañas que comparten localStorage; no implica transacciones atómicas ni sincronización entre dispositivos o usuarios.
- Sigue pendiente validar Safari/iPhone físico. WebKit emulado no sustituye esa prueba.
- Fase 2 fuera de alcance; no ampliar el modelo de fichas de bolas.

## Continuación
Recuperar CP-028 y PR #17 antes de actuar. Hacer solo pruebas nuevas justificadas en LAB o preparar validación privada en iPhone sin publicación; no repetir operaciones ni pruebas exitosas sin necesidad técnica. Dejar botones ejecutables al detenerse.
