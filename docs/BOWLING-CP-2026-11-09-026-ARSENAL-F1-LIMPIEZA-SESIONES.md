# BOWLING-CP-2026-11-09-026 · ARSENAL F1 — Limpieza de selecciones al borrar sesiones y tolerancia a datos dañados

**Fecha local:** 9 de noviembre de 2026 (CET).  
**Estado:** **VALIDADO EN LAB, NO FUSIONADO NI PUBLICADO**.  
**Continuidad:** CP-025 → CP-026, manteniendo la misma PR #17 en borrador.  
**Repositorio:** `josegude-ux/Mi-Bowling`.  
**Rama de implementación:** `feature/catalogo-arsenal-f1-lab-20261108`.  
**Commit EXACTO de código + pruebas verificado:** `5c3fb12dfb12ca81433c1d064b3a31d82095eef0`.  
**Prueba automatizada:** [GitHub Actions #42534097074](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42534097074), **SUCCESS**, mismo commit.  
**Main verificado en el inicio del ciclo:** `566aafdc05be163baf8c7f82e60433b0f532d748`.  
**Rama de respaldo verificada:** `backup/main-antes-arsenal-f1-20261108`, mismo commit `566aafdc05be163baf8c7f82e60433b0f532d748`.

## Alcance ejecutado
- Verificado el checkpoint CP-025 y los estados de las PR independientes #1, #8, #10, #12 y #13 (abiertas, en borrador y no fusionadas).
- Se confirmó una deficiencia acotada a Fase 1: al borrar una sesión, el almacenamiento lateral `mi-bowling-ball-selection-v1` conservaba la lista de bolas vinculada a un ID de sesión inexistente. No alteraba los tiros ni los datos originales, pero creaba datos temporales huérfanos.
- Corrección puntual en `app.js`: **solo después de confirmar la eliminación** de una sesión, borra la entrada de selección de esa sesión y mantiene las demás entradas intactas. No modifica el contrato de las bolas, ni añade campos, migraciones, cuentas o catálogos externos. El resto de `deleteSession` mantiene su comportamiento anterior.
- Nuevo test aislado en `tests/ball-selection-lab.cjs` que verifica (1) cancelar el borrado conserva todo, (2) confirmarlo elimina únicamente la sesión ficticia elegida y su selección, (3) conserva las otras sesiones, bolas y selecciones, (4) tolera JSON malformado en selección, (5) filtra IDs duplicados, retirados, inexistentes o inválidos.
- Pruebas ejecutadas en Chromium y WebKit, con datos sintéticos y emulación móvil de 390px.

## Evidencias
- GitHub Actions #42534097074: `status=completed`, `conclusion=success`, `head_sha=5c3fb12dfb12ca81433c1d064b3a31d82095eef0`.
- Paso de Fase 1 Arsenal: **SUCCESS**. Registros explícitos:
  - `OK chromium 390px: cancelación/borrado de sesión, sidecar limpio y recuperación de selección corrupta`.
  - `OK webkit 390px: cancelación/borrado de sesión, sidecar limpio y recuperación de selección corrupta`.
- También **SUCCESS**: validaciones de marcadores y lógica de registros, iconos y PWA offline, calendario FGB con 31 eventos, regresión Chromium/WebKit en móvil/tablet/escritorio, importación/exportación con datos ficticios y tests anteriores de Fase 1.
- Primera ejecución ampliada falló por un test que comparaba un fixture antiguo con los datos ya normalizados por `migrate()`, no por pérdida de partidas. Se corrigió la comparación frente a `migrate(fixture)` y se reejecutó el conjunto completo con éxito. No se ocultó el fallo previo ni se atribuyó al usuario.

## Límites y checkpoint siguiente
- No se ha fusionado ni publicado la PR #17, ni modificado `main`, respaldo, PWA publicada, partidas reales, cuentas o las PR independientes.
- Fase 2 expresamente excluida. Se mantienen los atributos existentes de `db.balls`, sin añadir otros.
- La selección operativa sigue siendo local y separada del JSON de exportación, no un campo de bola.
- Validación pendiente en Safari/iPhone real: WebKit emulado no sustituye al dispositivo.
- Continuar pruebas de Fase 1 en LAB solo ante escenarios de riesgo concretos y verificables; alternativamente preparar protocolo de prueba física privada (sin despliegue).
