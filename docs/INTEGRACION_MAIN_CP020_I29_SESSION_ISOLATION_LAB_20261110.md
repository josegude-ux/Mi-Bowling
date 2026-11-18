# MI BOWLING · I29 LAB · Aislamiento de sesiones y verificación externa independiente

**Orden:** BOWLING-INTEGRACION-CP020-I29-20261110  
**Fecha:** 10/11/2026  
**Base exacta:** PR #55, checkpoint `BOWLING-I28-CP-001`, HEAD documental `c8fbdac7cd603faa3a903460af2c41595c49ff55`. CI funcional I28 [push 42790103380](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42790103380) y [PR 42790223057](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42790223057), documental [push 42793401904](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42793401904) y [PR 42793411551](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42793411551), todas completadas SUCCESS 2/2 en sus SHAs exactos.  
**main consultado al inicio:** `699d877d5ec4f3891ac6c24504a57605105bfb2d`. No es la base de I29 y no se modifica. I29 no tenía rama, PR ni commits antes de su creación; no duplicar trabajo.

## Alcance de I29

I28 mejora la construcción en memoria eliminando una inspección I25 redundante para expedientes NUEVOS, pero no puede conceder privilegios a originales importados. I29 preserva íntegramente I28/I25 y agrega **aislamiento de sesión por revisión** y verificación separada para sobres externos:

- `lab/i29-session-guard.js`: API `createSession()` con `run`, `verifyExternal`, `cancel`, `state`. Cada ejecución tiene un número de revisión privado; una llamada nueva invalida la anterior en la MISMA sesión. La cancelación no implica interrupción física de cálculos criptográficos ya iniciados: cuando concluyen, se comprueba revisión y se descartan resultados antiguos, incluso si I25 terminó su trabajo. No se comparten revisiones entre sesiones A/B/C independientes. Las transiciones de error no conservan el digest de un éxito anterior.
- Nueva construcción `run()`: llama una sola vez a `I28.run()`, sin añadir parsing nuevo al camino fresco. Conserva `I26` para la importación UTF-8 estricta y preflight I27 por perfil. `heapUsed` es observación OPCIONAL de la VM de Node, con el resumen O(1) de I28. El número de llamadas JSON.parse instrumentado en CI es un indicador de trabajo sobre idénticos fixtures, no una proporción universal de RAM ni de tiempo.
- `verifyExternal()`: **nunca usa el atajo `prepareCheckedOnce`**. Requiere un sobre I25, copia sus datos mediante serialización a un snapshot local y llama al `I25.verify` original completo, con digest esperado opcional y rechazo si la sesión fue cancelada/sustituida antes de dar un resultado. La copia protege de mutaciones posteriores del objeto del llamante. El preflight de longitudes y el límite del texto JSON serializado son controles prácticos, pero la serialización sí puede reservar memoria ANTES de aplicar el límite JSON; no se afirma presupuesto RAM máximo ni seguridad frente a objetos arbitrarios hostiles.
- `lab/integracion-main-auth-i29.html`, `lab/i29-ui.js`: pantalla LAB aislada, CSP sin solicitudes externas, sin IndexedDB, selección de perfiles, cancelación vinculada a la sesión, invalidación de resultados antiguos y exportación únicamente por pulsación. No activa una verificación de un servicio externo ni cuentas reales.
- `tests/i29-session-fixture.cjs`, `tests/i29-session-contract.test.cjs`: A/B/C ficticios, equivalencia bit a bit de I28 en salida fresca, conteo de parsing, verificación externa tradicional, falsificación/cambio de texto, mutaciones postllamada, cancelación mientras `I25.verify` está en curso, reanudación tras fallo, dos sesiones paralelas independientes, operación anterior retrasada y sobrescrita, presión observada, UTF-8 erróneo y recuperación conservadora.
- `tests/i29-session-browser.test.cjs`: WebKit Linux viewport móvil emulado y Chromium escritorio por HTTPS localhost. Sin tráfico de red exterior. **No se ha usado Safari en iPhone físico.**
- `.github/workflows/integracion-i29-lab.yml`: dos jobs Node (FGB CP-020 y regresiones I11–I29) y navegador (I28 e I29), lanzados en `push` y `pull_request`.

## Amenazas y afirmaciones que NO se hacen

No se demuestra custodia externa, identidad, independencia de fuentes, firma de originales reales, sello temporal, anterioridad, inmutabilidad/WORM ni autorización. Los alias A/B/C y cualquier SHA son representaciones ficticias no autenticadas. Sustitución coherente de documento y referencia no queda excluida. Un `PASS` solo acredita los contratos de laboratorio ejercitados por la prueba, nunca procedencia física. `heapUsed` muestreado no revela pico real de RAM, RSS o memoria en iOS, y un navegador WebKit emulado en Linux no equivale a Safari/iPhone físico. La cancelación de tareas asincrónicas no garantiza detener CPU ya ocupada: solo descartar resultados tardíos; el entorno continúa sujeto a sus límites. No se usan servidores externos, sesiones ni datos reales.

## Aislamiento y reglas del checkpoint

Cambios exclusivamente en archivos nuevos de I29; ningún archivo I18–I28 editado, `app.js`, `sw.js`, FGB CP-020, PWA y producción conservados. No fusionar ni publicar. Solo LAB ficticio.

**Gate funcional:** comprobar que `push` y `pull_request` en el MISMO SHA funcional terminan **SUCCESS 2/2** con contratos de equivalencia, concurrencia, seguridad y regresiones. Si falla, corregir únicamente I29 en la rama aislada, mantener los runs fallidos como evidencia y ejecutar de nuevo. Registrar a continuación SHA funcional y resultados en este documento bajo `BOWLING-I29-CP-001`.

**Gate documental:** tras escribir checkpoint funcional, verificar de nuevo `push` y `pull_request` **SUCCESS 2/2** sobre el nuevo HEAD documental exacto. Solo entonces cerrar `BOWLING-I29-CP-001` mediante descripción de PR I29, sin commits posteriores; conservar continuidad ejecutable. Si los runs quedan pendientes, el checkpoint es parcial, NO definitivo.

**Estado inicial:** implementación I29 LAB, CI aún no verificada. `BOWLING-I29-CP-001` abierto, sin cierre.
