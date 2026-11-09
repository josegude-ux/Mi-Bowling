# MI BOWLING · LAB I10 · Restauración interrumpible, comparación y auditoría cifrada

**Orden:** BOWLING-INTEGRACION-CP020-I10-20261109
**Fecha:** 9 noviembre 2026.
**Origen:** PR #28 · checkpoint I9 630928f7f8c60be68f46d377ebfba5f80188b434 · código I9 probado 1f0c26c20ddf66d11e15280f5b950f95a451fe95.
**Rama I10:** feature/integracion-main-auth-i10-lab-20261109, sobre I9 y aislada de producción.
**main al iniciar:** 6dd7d486268a4ba23302559bebf209d531cc4964, cambio ajeno a I10 respecto al checkpoint I8. No se modifica ni se revierte.

## Arquitectura implementada

1. Base aislada de LAB mi-bowling-i10-lab-encrypted-data-v4, con stores encrypted-confirmed, encrypted-operations (jugador/pestaña/operación) y encrypted-restore-audit. Todo payload sensible cifrado AES-256-GCM con clave PBKDF2 SHA-256, sal e IV independientes; frases ficticias en RAM. Motor CP-020 protegido del IndexedDB y localStorage nativos.
2. Archivos cifrados I10 versión 2, firma SHA-256, cabecera autenticada, UUID del jugador, revisión y operaciones individuales. Las versiones I9 anteriores sin migración expresa, futuras desconocidas, dañadas, de otro jugador o sin frase se **rechazan** sin reescribir ningún dato. No hay migración automática de versión.
3. Previsualización comparativa de solo lectura: detecta respaldo compatible, idéntico, copia obsoleta, confirmado adelantado incompatible, historial bifurcado, operación conflictiva y repetición. Clasifica mediante revisiones/hash/UUID, nunca por la fecha declarada. También permite comparar dos archivos cifrados de distintas fechas, indicando únicamente metadatos y recuentos.
4. Cada restauración aceptada introduce el confirmado, los WAL que faltan y **un recibo de auditoría cifrado** en una sola transacción readwrite de tres stores. No se crea un recibo adicional al importar de nuevo la misma copia sin cambios. El recibo contiene backupId, checksum, fecha informativa, revisión, WAL añadidos y hora del commit, nunca partidas en claro.
5. Fallos inyectados exclusivamente en laboratorio: aborto de una transacción IDB antes de encolar escrituras o después de encolar todas pero antes de oncomplete (rollback completo); pérdida simulada del acuse DESPUÉS del commit, reconocible por reimportación idempotente y recibo cifrado tras reinicio.
6. Pantalla nueva de LAB con controles de descarga, archivo y contraseña ficticios, previsualización contra vault, comparación entre dos archivos, historia de restauraciones sin puntuaciones y consentimiento obligatorio para importar. Los módulos I2–I9 permanecen independientes.

## Criterios de aceptación (verificar con CI)

- [ ] Seis activos CP-020 originales del LAB verificados y calendario FGB 2026-2027 conservado: 31 eventos, diez gallegos y veintiuno nacionales.
- [ ] Versiones incompatibles y cabeceras/cifrado adulterados rechazados sin escribir, identidad A/B/C vinculada al archivo.
- [ ] Comparación no destructiva de copias en fechas distintas: revisión mayor/menor, bifurcación al mismo nivel y diferencias en WAL.
- [ ] Aborto IDB antes/después de encolar: cero confirmados, cero WAL, cero auditorías; backend no declara éxito ficticio.
- [ ] Perdida de acuse tras commit lógico: exactamente una auditoría, confirmó y N WAL; retry detectado como already-present.
- [ ] Reinicio de proceso Chromium con perfil desechable: se conserva el cifrado confirmado, las operaciones y los recibos; WAL conciliados y archivo obsoleto rechazado.
- [ ] WebKit iPhone/tablet emulados, Chromium escritorio, cuentas ficticias A/B/C, sin servicios externos ni datos reales.
- [ ] Nueva PR draft; main y PR existentes sin modificaciones; checkpoint SHA y CI verificados.

## Limitaciones reales

El backend simulado es IndexedDB del **mismo origen LAB**, sin servicio remoto ni sincronización multi-dispositivo. El fallo IDB se fuerza dentro de una transacción real antes de su oncomplete, pero no emula una pérdida eléctrica ni garantiza durabilidad física ante un fallo abrupto del sistema. La prueba de reinicio cierra y relanza Chromium con perfil persistente temporal, no provoca una caída brutal. No Safari físico, ni cuota real, ni pérdida de frase/archivo. La fecha procede del cliente, aunque va autenticada: no sirve para resolver conflictos por sí misma. El recibo cifrado confirma el commit lógico del navegador en la prueba, no es un libro mayor externo inmutable.

**No usar con partidas auténticas, no fusionar ni publicar ni conectar servicios reales.**
