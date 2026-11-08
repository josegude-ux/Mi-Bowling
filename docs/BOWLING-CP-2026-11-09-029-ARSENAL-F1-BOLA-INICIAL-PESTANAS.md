# BOWLING-CP-2026-11-09-029 — ARSENAL F1 · Validación de bola inicial ante cambios en otra pestaña

**Fecha local:** 9 de noviembre de 2026 (CET).  
**Estado:** VALIDADO EN LAB; PR #17 EN BORRADOR, SIN FUSIONAR NI PUBLICAR.  
**Continuidad:** CP-028 → CP-029, sin crear nuevas PR ni órdenes.  
**Repositorio:** `josegude-ux/Mi-Bowling`.  
**Rama:** `feature/catalogo-arsenal-f1-lab-20261108`.  
**Commit exacto de código y pruebas validado:** `72d853974dc5401fdee4e163265b33099448b259`.  
**CI:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42536302020 — **completed/success**, misma SHA.  
**Main y respaldo verificados sin cambios:** `566aafdc05be163baf8c7f82e60433b0f532d748`.  
**Respaldo:** `backup/main-antes-arsenal-f1-20261108`, misma SHA.

## Recuperación
- Recuperado CP-028 directamente de la PR #17, y revisados `app.js` y pruebas originales.
- Estado de PR #17 verificado: abierta, draft, no fusionada; base `566aafdc05be163baf8c7f82e60433b0f532d748`.
- PR #1, #8, #10, #12 y #13 verificadas separadas y no fusionadas.

## Incidencia nueva reproducida antes de corregir
La selección de la próxima sesión se sincroniza entre pestañas desde CP-028, pero un formulario de nueva sesión puede permanecer abierto sin re-render (intencionado para preservar su borrador). Por eso quedaba un valor de bola inicial obsoleto:
1. Pestaña A marca Alpha y Beta en «Mis bolas».
2. A abre Nueva sesión, selecciona Alpha como bola inicial y escribe bolera/título.
3. Pestaña B desmarca Alpha, dejando solo Beta en el selector vigente de próxima sesión.
4. A guarda el formulario todavía visible.
5. Sin validación adicional, `createSession` guardaba `currentBallId:'lab-a'` mientras transfería a la sesión el filtro de bolas `['lab-b']`.

**Evidencia de fallo antes de corregir:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42536137701, commit `e8b9f216b7b382957159362da175d92b17e9c608`, `AssertionError: 'lab-a' !== ''` en `parallelTabsSelectionScenario()`. Son exclusivamente datos ficticios.

## Corrección de Fase 1 en LAB
- En `app.js`, `createSession` ahora consulta `selectedBallsFor('__next__')` inmediatamente antes de guardar.
- Si la lista de bolas está explícitamente limitada y el valor inicial solicitado ya no pertenece a la selección vigente, asigna **cadena vacía** («Sin asignar») en vez de registrar una bola fuera del filtro.
- Se mantiene la semántica histórica: cuando no existe lista de selección (`null`), el comportamiento anterior no se restringe. Los datos del resto del formulario permanecen intactos.
- No se han añadido campos a `balls`, `sessions` ni `rolls`, ni cambios de versión de DB. No hay servicios externos ni sincronización entre dispositivos.

## Prueba y evidencia de ejecución
- Extendida `parallelTabsSelectionScenario()` en `tests/ball-selection-lab.cjs`, ejecutada con dos pestañas y selección modificada durante el borrador de nueva sesión.
- Comprueba que el borrador no se re-renderiza, el guardado conserva bolera/título, el nuevo `session.currentBallId` queda vacío al desmarcar la bola en otra pestaña, el filtro transferido corresponde al vigente, y el histórico ficticio mantiene su antiguo `ballId`.
- **CI validada sobre SHA exacta `72d853974dc5401fdee4e163265b33099448b259`**: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42536302020, `completed / success`.
- Chromium y WebKit pasaron el escenario y toda la suite Arsenal F1; también PWA, iconos, marcador, calendario FGB 31 fechas, importación JSON ficticia y responsive.
- Los registros explícitos indican `OK chromium 390px: dos pestañas conservan selecciones del mismo arsenal y evitan sobreescritura` y el equivalente para WebKit.

## Restricciones, incertidumbre y siguientes pasos
- El escenario verifica actualizaciones **secuenciales** de dos pestañas de un navegador compartido. No supone atomicidad para escrituras simultáneas ni sincronización remota.
- `main` y respaldo intactos en `566aafdc05be163baf8c7f82e60433b0f532d748`; PR #17 sigue abierta en borrador. Las PR independientes se conservan.
- No se ha publicado, fusionado, iniciado Fase 2 ni tocado partidas reales.
- **Pendiente**: Safari físico en iPhone; WebKit emulado no equivale a la prueba real.
- Próxima continuación: elegir pruebas nuevas justificadas y acotadas a F1 LAB, o preparar validación privada en iPhone; registrar checkpoint y botones ejecutables al detenerse.
