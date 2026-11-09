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

- [x] Seis activos CP-020 originales del LAB verificados y calendario FGB 2026-2027 conservado: 31 eventos, diez gallegos y veintiuno nacionales.
- [x] Versiones incompatibles y cabeceras/cifrado adulterados rechazados sin escribir, identidad A/B/C vinculada al archivo.
- [x] Comparación no destructiva de copias en fechas distintas: revisión mayor/menor, bifurcación al mismo nivel y diferencias en WAL.
- [x] Aborto IDB antes/después de encolar: cero confirmados, cero WAL, cero auditorías; backend no declara éxito ficticio.
- [x] Perdida de acuse tras commit lógico: exactamente una auditoría, confirmó y N WAL; retry detectado como already-present.
- [x] Reinicio de proceso Chromium con perfil desechable: se conserva el cifrado confirmado, las operaciones y los recibos; WAL conciliados y archivo obsoleto rechazado.
- [x] WebKit iPhone/tablet emulados, Chromium escritorio, cuentas ficticias A/B/C, sin servicios externos ni datos reales.
- [x] Nueva PR draft; main y PR existentes sin modificaciones; checkpoint SHA y CI verificados.

## Limitaciones reales

El backend simulado es IndexedDB del **mismo origen LAB**, sin servicio remoto ni sincronización multi-dispositivo. El fallo IDB se fuerza dentro de una transacción real antes de su oncomplete, pero no emula una pérdida eléctrica ni garantiza durabilidad física ante un fallo abrupto del sistema. La prueba de reinicio cierra y relanza Chromium con perfil persistente temporal, no provoca una caída brutal. No Safari físico, ni cuota real, ni pérdida de frase/archivo. La fecha procede del cliente, aunque va autenticada: no sirve para resolver conflictos por sí misma. El recibo cifrado confirma el commit lógico del navegador en la prueba, no es un libro mayor externo inmutable.

**No usar con partidas auténticas, no fusionar ni publicar ni conectar servicios reales.**


## I10 · CHECKPOINT FUNCIONAL VERIFICADO · 9 NOV 2026

**Código I10 funcional probado:** 38f2e1d40657bd5a6e4ed2767e68edb51033e0ff.
**CI GitHub Actions (push del código):** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42588221036 — **SUCCESS · 2 de 2 jobs**.
**PR LAB nueva:** https://github.com/josegude-ux/Mi-Bowling/pull/30 — borrador, base PR #28; no fusionada.
**Rama:** feature/integracion-main-auth-i10-lab-20261109.

Evidencia real de las ejecuciones de contratos y navegadores:

- Motor de la rama LAB CP-020 con seis activos verificados por hash; FGB 2026-2027 31 eventos oficiales: **10 gallegos y 21 nacionales**. Tests CP-020, I9/I8 y propietario A/B/C en Node aprobados.
- Node: AES-GCM del formato cifrado I10 versión 2, contraseña incorrecta y adulteración rechazadas; versiones I9 antiguas sin migración y futuras desconocidas rechazadas; comparación autenticada de dos copias de fechas distintas identifica mayor revisión, bifurcación y diferencias de WAL, conservando fecha solo como información.
- WebKit Linux simulando iPhone A y tablet B, Chromium escritorio C: carga del motor CP-020 verificado sin localStorage real, servicios externos, PWA ni datos auténticos.
- WebKit: exportación cifrada de revisión confirmada 1 y dos WAL independientes; no aparece puntuación en texto plano en el archivo. Contraseña/UUID B no abre archivo de A.
- Chromium: restauración de vault nuevo con frase local diferente, segunda importación idempotente, rechazo de confirmado divergente a igual revisión, operación replay y respaldo obsoleto. Dos pestañas que importan la misma copia dejan un confirmado y exactamente dos WAL.
- Chromium: prueba de aborto IndexedDB **antes de encolar** y **después de encolar** operaciones, siempre antes del commit: no queda confirmado, WAL ni recibo cifrado parcial.
- Chromium: acuse de restauración perdido **después** del commit; al volver a abrir el proceso con un perfil persistente de LAB se encuentran el confirmado, dos WAL y **un recibo de auditoría cifrado**. Repetir importación es already-present y no crea otro recibo.
- Chromium: la previsualización comparativa contra vault es read-only; el botón para comparar dos archivos de fechas diferentes se ejercita con archivo cifrado adicional, identifica second-newer y verifica que **no cambia** revisión ni dos operaciones pendientes.
- Chromium: el botón de auditoría presenta el recibo tras reinicio; la recuperación seleccionada y fusión conservadora de dos WAL produce revisión confirmada 3. El archivo anterior se clasifica stale y se rechaza sin revertir puntuaciones. B y C permanecen aislados.

### Correcciones en el proceso de validación

1. Se ajustó el texto de aceptación de la previsualización I10 respecto de I9.
2. El test inicial sobre perfil virgen intentó inspeccionar stores sin haberlos inicializado con el módulo real; se corrigió la inicialización del test sin debilitar la aplicación.
3. Se conectó exclusivamente el segundo input de archivos cifrados al guard LAB, manteniendo bloqueado cualquier otro upload.
4. Se pasó la contraseña ficticia explícitamente al contexto de Playwright, sin guardarla ni exponerla a servicios.

**Límites sin resolver:** no se prueba Safari en un iPhone físico, cuota de almacenamiento real, corte eléctrico, servicios remotos, sincronización entre dispositivos ni recuperación si se pierde el archivo o la frase. Los abortos se inyectan sobre una transacción IndexedDB real y el reinicio se verifica cerrando y volviendo a abrir Chromium con perfil temporal, no matando la energía. El recibo cifrado pertenece al mismo origen y no es una auditoría externa inmutable.

**Decisión técnica:** I10 aceptada SOLO COMO BASE LAB CON DATOS FICTICIOS. Sin autorización para fusionar, publicar o utilizar puntuaciones reales; main y PR antiguas no forman parte de la intervención.
