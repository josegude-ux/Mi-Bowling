# MI BOWLING · CP032 · Checkpoint 006 · Resistencia transaccional y arranque protegido

**ID:** MI-BOWLING-CP032-CHECKPOINT-RESILIENCIA-20261122-006  
**Fecha:** 22/11/2026 · **EXCLUSIVAMENTE LAB** · **NO GO producción**

## Identidad y continuidad
- Repositorio: `josegude-ux/Mi-Bowling`.
- Checkpoint de origen: `MI-BOWLING-CP032-CHECKPOINT-DURABLE-20261122-005`, HEAD `7242db80f010a80f8d1a1d1fb35d6416a0422ee7`, run `45033819426` SUCCESS.
- Misma rama `lab/cp032-registro-compacto-v3-20261122`. **Código CP032 validado en `a21b40c56d00f7fcdb54a14b84e09e3b73b0dabd`.**
- Producción `main` = `1fdef63467a980db9a596e3c2c102199ef686022` (`3.3.13-prueba`) verificada sin modificaciones. Ningún merge, despliegue, publicación o uso de datos reales.

## Auditoría / implementación nueva
1. `lab/cp032-boot-guard.js`: barrera de arranque **invocada explícitamente** en arnés de LAB. Bajo el Web Lock vigente, si hay journal coordinador pendiente, recupera antes de ejecutar `onReady`. Si el journal es ilegible/corrupto, no libera el escritor y conserva la evidencia. Con intención de CP004 huérfana y sin coordinación, se detiene. **No conectado al boot de producción.**
2. `lab/cp032-resilience-harness.html`, `tests/cp032-resilience-browser.cjs`, workflow de solo lectura `cp032-resilience-lab.yml`: ensayos nuevos de cuota sintética mediante `QuotaExceededError` en escritura del journal v3 y en PDF CP004; corrupción intencionada del cuerpo de un journal sin actualizar su SHA-256; arranque suspendido hasta recuperar; comprobación de PDF y foto ficticia, ausencia de escrituras en claves personales `mi-bowling-*`.
3. `tests/cp032-midtransaction-crash-browser.cjs` y workflow `cp032-midtransaction-crash-lab.yml`: nuevas pruebas forzadas en proceso real Chromium bajo un perfil persistente desechable. La base ficticia se consolida mediante cierre/reapertura normal previo para aislar el crash de IndexedDB. El proceso principal de Chromium es terminado con `SIGKILL` mientras permanecen **solicitudes readwrite IndexedDB activas**, usando una cola de peticiones de lectura en la misma transacción para mantenerla abierta. Se cubren guardado `v3` y rollback de PDF CP004, reabriendo el perfil y ejecutando recuperación en arranque.
4. Timeouts y cierre de conexiones acotados en el **test** SIGKILL. No se alteró el coordinador anterior, CP003/004, Cachefix2, `index.html`, `sw.js`, fotos ni suites históricas.

## Evidencias finales
- [Run 45035950388](https://github.com/josegude-ux/Mi-Bowling/actions/runs/45035950388) **SUCCESS** (HEAD `0b7b7457f8caf1ef4f7b1eea72c63427354d0e94`):
  - `CP032 QUOTA PASS`: fallo de cuota sintética del sidecar, journal de coordinación retenido y compensación en arranque antes de permitir escritor.
  - `CP032 CORRUPT HASH NO GO PASS`: SHA-256 incorrecto en journal, bloqueo de escritor sin eliminación del registro.
  - `CP032 PDF QUOTA PASS`: fallo de escritura PDF CP004 y recuperación segura al reiniciar.
  - `CP032 RESILIENCE LAB PASS`.
- [Run 45036738649](https://github.com/josegude-ux/Mi-Bowling/actions/runs/45036738649) **SUCCESS** (HEAD `a21b40c56d00f7fcdb54a14b84e09e3b73b0dabd`):
  - `CP032 FORCED SIGKILL MID-IDB PASS v3`: proceso de Chromium finalizado durante transacción readwrite del sidecar; reapertura y restauración exacta del estado anterior.
  - `CP032 FORCED SIGKILL MID-IDB PASS pdf`: proceso finalizado durante la reversión de PDF con solicitudes IDB pendientes; CP004 + coordinador + sidecar recuperan el estado ficticio anterior.
  - `CP032 REAL CRASH LAB PASS`: los metadatos de historial v2 y fotografías sintéticas permanecen intactos, y las claves personales no se modifican.
- Ensayos de diagnóstico anteriores: [45035850124](https://github.com/josegude-ux/Mi-Bowling/actions/runs/45035850124) falló por una llave `try` incorrecta en el script de prueba, corregida; [45036541383](https://github.com/josegude-ux/Mi-Bowling/actions/runs/45036541383) detectó que el almacén ficticio LocalStorage no había terminado de consolidarse antes del crash, corregido cerrando y abriendo el perfil antes de forzar SIGKILL. Ambos son ensayos previos **no homologados**.
- **Incidencia operativa:** run original [45036097682](https://github.com/josegude-ux/Mi-Bowling/actions/runs/45036097682) aún aparecía `in_progress` en la última consulta. Es la primera versión del ensayo de caída, no la ejecución válida; su prueba tenía limpieza no acotada. Solo `45036738649` es evidencia SIGKILL final; cancelar manualmente el run antiguo si sigue activo para evitar créditos innecesarios. Sin acción de cancelación disponible en el conector.

## Cobertura y limitaciones
- GO LAB para journal persistente CP032, compensación controlada, Web Locks, corrupción de sello, fallos de cuota **inyectados**, reinicio por cierre normal y SIGKILL de Chromium durante transacciones v3 y PDF.
- SIGKILL de proceso no demuestra corte eléctrico del dispositivo ni garantiza `fsync` / durabilidad del almacenamiento físico; esas condiciones continúan **NO GO**.
- Los fallos `QuotaExceededError` son inyectados en objetos IndexedDB de prueba; **no** se ha agotado la cuota real del dispositivo.
- El `boot guard` no está conectado al arranque publicado; se ejecuta solo en arnés de LAB. El protocolo sigue siendo **compensatorio, no atómico** entre LocalStorage e IndexedDB.
- Se usó una fotografía sintética en CacheStorage; el paquete privado de fotografías reales no fue abierto, convertido, importado ni exportado.
- Safari físico, recuperación integral de historial/fotos/PDF reales, esquema productivo v3, migración de datos personales y publicación continúan **NO GO**.

## GO / NO GO
| Área | Decisión |
|---|---|
| QuotaError simulado, journal corrupto y fail-closed antes de iniciar escritor | **GO LAB** |
| SIGKILL durante IDB v3 y rollback PDF con restauración en perfil persistente Chromium | **GO LAB** |
| Preservación de fixtures v2, PDF y CacheStorage sin claves personales | **GO LAB** |
| Corte eléctrico / durabilidad hardware / cuota realmente agotada | **NO GO** |
| Safari iPhone físico, integración del arranque real, migración personal y producción | **NO GO** |

**Próxima prioridad:** revisar el coordinador ante pérdida de energía / persistencia de IDB y hardware; preparar una homologación Safari iPhone físico en entorno LAB restringido con fixtures, y validar copia independiente de fotografías privadas sin usarlas hasta nueva autorización específica. No repetir suites históricas ni cinco resoluciones.
