# BOWLING-CATALOG100-PHOTO-LAB-CP-007-PENDING-WRITES-20261111

**Fecha:** 11/11/2026. **Rama:** `lab/catalogo100-fotografias-permisos-20261111` · **HEAD de entrada:** `35f6e46e766df8bcc3fd6c899a3f501c7fa8d4b0`. Solo LAB.

## Defecto nuevo reproducible
Las escrituras CP-005/CP-006 esperaban Web Locks de forma asíncrona, pero el estado `arr` podía modificarse de nuevo **antes** de que la primera persistiera. Caso con dos selecciones ficticias rápidas: primera escritura guardaba ambas; la segunda fallaba por `QuotaExceededError`; el rollback de la segunda retiraba su selección de la interfaz pero permanecía en `localStorage`. Evidencia Node v22 extraída del algoritmo real: `persisted=[true,true]`, `visible=[true,false]`. No hay datos reales ni evidencia de afectación de usuario.

## Corrección
Indicador `localWritePending` en `catalogo-bolas/index.html`, bloquea una segunda operación de escritura de esta pestaña antes de abrir otra petición Web Locks; el llamante ya revierte cualquier mutación al recibir error. El indicador se libera ante éxito, cuota, excepción o rechazo del bloqueo. Nuevo mensaje «Guardado en curso»; se conserva la detección de pestaña obsoleta y el alcance Web Locks. Sin Web Locks sigue existiendo solo fallback optimista, no atomicidad entre pestañas.

## Evidencia ejecutada
- Reproducción anterior: Node 22 `/mnt/data/mi_bowling_lab_cp007/pending_write_race.cjs`, SHA256 `75fa8e51e75d94557578edf7c25793044108827e3d4ef49d1b64357a07953a4a`.
- Corrección sobre algoritmo extraído: Node 22 `/mnt/data/mi_bowling_lab_cp007/pending_guard_regression.cjs`, **13/13 PASS**, SHA256 `d205c4d663d78815dd365e33a5bab212546edecd4fcf212aae46137fb8f48d51`. Informe `pending_guard_regression_report.json` SHA256 `f74b1cb0d0c20a186c82548a89d3e86d0ee1917c81ff761e44ee97ab2614f7d2`.
- Código real completo del catálogo recuperado por GitHub y modificado en memoria V8: **6/6 nuevas comprobaciones PASS** (segunda selección inmediata, aviso, persistencia, selección posterior, quota y reintento). Compilación sintáctica JS validada.
- CP-002 a CP-006 conservados y no repetidos. No se ejecutó la suite Node del checkout completo por fallo DNS de GitHub; Chromium con origen local bloqueado; WebKit no instalado. No se atribuyen estos tests como superados.

## Alcance y protección
No se añaden imágenes, licencias, permisos ni cambios de datos reales. Se preservan 100 IDs originales, registro 100 imágenes (14 páginas oficiales, 1 candidata, 85 pendientes), histórico, 10 bolas personales, 12 sesiones, FGB CP-020, CP-010 y PWA. HEAD protegidos: main `699d877d5ec4f3891ac6c24504a57605105bfb2d`, PR53 `550b635cccf470edc5ee4fda3cba54b41ab02ead`, PR54 `160c19f2d7ef9a75de6bb3586913e389e7116f5b`. Sin CI remota, gastos, PR, merges o despliegues.

**Release gate: NO APTO.** Requiere checkout autorizado completo, suite Node integrada, Chromium/WebKit con Web Locks reales, PDF ficticio, histórico, cuota/cancelación, y pruebas en navegador sin API de bloqueo.
