# BOWLING-CATALOG100-PHOTO-LAB-CP-006-ENV-NODE-20261111

Fecha: 2026-11-11 · Proyecto MI BOWLING · **solo evidencia LAB, sin cambios de código**.
Rama: `lab/catalogo100-fotografias-permisos-20261111` · HEAD de entrada: `4fd235ade5316625d96fd82ef0891c43c8eeec5b`.

## Recuperación y límites
Preflight GitHub verificado:
- main `699d877d5ec4f3891ac6c24504a57605105bfb2d`, sin cambios;
- PR #53 HEAD `550b635cccf470edc5ee4fda3cba54b41ab02ead`, borrador abierta;
- PR #54 HEAD `160c19f2d7ef9a75de6bb3586913e389e7116f5b`, borrador abierta.
- CP-002 hash evidencia `faa8df42ff968c296fd3db62fb807ea537c49dda` (19 V8 y 4 responsive, cerradas); CP-003 `a3c9dd4ad30fee68486120445b9daeea8919fc20` (26 checks), CP-004 `6fa801778754923d0d5824651c139cabf4a513cb` (10 V8), CP-005 `3efa106513f261e23e062a0365bdc97c2be2aa1b` (8 V8 y fixture aislado). **No repetir pruebas cerradas**.

## Nuevas pruebas ejecutadas localmente
Node v22.16.0, fixture independiente `edge_lock_tests.cjs` que reproduce el algoritmo de CP-005 con 100 entradas sintéticas y sin conexiones:
1. Sin API Web Locks, selección de pestaña aislada se guarda: **PASS**.
2. Error asíncrono `navigator.locks.request` (AbortError simulado): no se escribe y se revierte memoria: **PASS**.
3. Excepción síncrona del gestor de bloqueo: se revierte: **PASS**.
4. `QuotaExceededError` dentro del bloqueo simulado: no se altera el registro almacenado: **PASS**.
5. La pestaña con instantánea obsoleta no sobrescribe selección ya persistida (intercalación secuencial): **PASS**.

**5/5 nuevas pruebas PASS, 0 FAIL.** No prueban exclusión real entre pestañas del navegador. El fixture es código independiente extraído de CP-005, **no la suite Node del repositorio completo**.
Evidencias locales descargables en la conversación:
- `/mnt/data/bowling_lab_cp006/edge_lock_tests.cjs`, SHA-256 `d4526c341d3fe9ae839a6811c9b6db627e7d25276c396187f172cfa15d53b049`.
- `/mnt/data/bowling_lab_cp006/edge_lock_tests_report.json`, SHA-256 `bf4c0f1a7949be977784a10209ae841a70833bb15c37afccb96970bb331448b7`.

## Intentos de validación no completados
- `git ls-remote https://github.com/josegude-ux/Mi-Bowling.git HEAD`: DNS `Could not resolve host: github.com`. No se descargó checkout ni se ejecutaron `tests/catalogo100-photos-lab.cjs`, `tests/catalogo100-photo-import-history-lab.cjs`, `tests/catalogo100-photo-multitab-lab.cjs` o `tests/catalogo100-photo-atomic-lock-lab.cjs` desde repositorio completo.
- Chromium instalado en `/usr/bin/chromium`, pero Playwright recibió `ERR_BLOCKED_BY_ADMINISTRATOR` al navegar al origen HTTP local, HTTPS simulado interceptado, `file://` y `data:`. Un `about:blank` sin origen seguro no expone Web Locks ni localStorage. **No se ha ejecutado test con dos pestañas reales, importación PDF integrada en Chromium ni Web Locks nativos de navegador**.
- WebKit de Playwright no está instalado; sin descarga/instalación ni gastos. Safari iPhone físico no probado.
- La importación PDF sintética/archivo de CP-003 permanece evidencia previa, **no regresión integrada nueva ejecutada**.
- Web Locks de CP-005 sigue experimental y requiere validación real (incluida simultaneidad, cancelación, cuotas y fallback sin API).

## Decisión
**Ningún nuevo defecto reproducido en los cinco casos aislados; NO modificar código, fotos, permisos ni contratos.** Conservar los 100 IDs, 14 páginas de fabricante, 1 candidato, 85 pendientes, 0 fotografías y 0 licencias. Integración parcial NO APTA PARA MERGE/DESPLIEGUE. Próxima operación útil: entorno aislado con checkout completo y Chromium/WebKit navegables, sin datos personales, para ejecutar pruebas de repo y dos pestañas reales.

### Restricciones conservadas
CP-010, CP-001/002/003/004/005, main y PR existentes, 10 bolas personales, 12 sesiones, selecciones e historial real, FGB CP-020, PWA y producción; sin CI remota, PR nuevas, merge, despliegue, contactos, imágenes comerciales, datos reales ni gastos. Solo se añade este checkpoint documental.