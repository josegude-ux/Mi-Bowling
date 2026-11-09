# MI BOWLING · LAB I8 · Resistencia del WAL cifrado

**Orden:** BOWLING-INTEGRACION-CP020-I8-20261109
**Fecha:** 9 noviembre 2026
**Origen verificable:** PR #24, checkpoint I7 c46a6ccd205a45031e4e8c441d5de349f5c64c07, código probado 532daefe608636ecf7ec5c530bd014116af67a3b.
**Nueva rama:** feature/integracion-main-auth-i8-lab-20261109, apilada sobre I7 y aislada de main.
**Referencia main:** 566aafdc05be163baf8c7f82e60433b0f532d748.
**Estado de aceptación:** candidato, pendiente de evidencia GitHub Actions.

## Diseño y modificaciones implementadas

- **lab/i8-encrypted-store.js:** almacén exclusivamente de pruebas con nombre nuevo mi-bowling-i8-lab-encrypted-data-v2, versión de esquema 2, stores encrypted-operations y encrypted-confirmed; WAL por UUID jugador/pestaña/operación, AES-256-GCM y PBKDF2-SHA256, sal/IV aleatorios y frase ficticia no persistida. Abre IndexedDB únicamente en la ruta LAB I8. Los accesos nativos permanecen ocultos al motor CP-020 y al resto de módulos.
- Endurecimiento del **bloqueo real de esquema IndexedDB**: onblocked devuelve un error en vez de esperar indefinidamente, y si la actualización de esquema acaba llegando después de ese error, la conexión tardía se cierra sin reutilizarla. Ninguna escritura de puntuaciones puede proceder hasta abrir y verificar el almacén.
- **Fallo de cuota reproducible**, inyectado en una transacción real de IndexedDB: AbortReason=QuotaExceededError (LAB). El test NO llena realmente el disco del usuario ni demuestra el comportamiento de todas las cuotas reales del sistema operativo; verifica que un aborto antes de oncomplete impide el acuse de durabilidad, deja el cambio como volátil y no escribe en el backend confirmado ficticio. La excepción queda clasificada para facilitar diagnóstico.
- **Auditoría criptográfica de solo lectura**: enumera los WAL únicamente de la identidad ficticia actual, intenta verificarlos individualmente y comunica recuento de legibles, ilegibles y total. No revela datos en claro, no descarta una entrada corrupta y no distingue de manera engañosa entre contraseña incorrecta y bytes alterados. Una sola operación propia corrupta impide conciliar en modo normal; no se descarta silenciosamente para procesar las restantes.
- **lab/i8-persistence.js:** añade failureClass (quota, blocked, key-or-corruption, transaction-abort, storage-or-network), mantiene volatileCount separado de durableCount y prohíbe considerar guardado un cambio aún no confirmado en la transacción. Permite auditar y consultar borradores volátiles en la sesión, sin afirmar durabilidad de RAM.
- **lab/integracion-main-auth-i8.js y pantalla/guard propios:** rutas LAB aisladas, botón de auditoría no destructiva, modo de solo recuperación/error cuando falta la clave o se detecta corrupción; no carga el motor editable CP-020 ante ese fallo. La reanudación no se efectúa de forma silenciosa ni borra versiones ajenas.
- **tests/i8-storage-contract.test.cjs:** prueba determinista de abortos de cuota/transacción sin acuse falso ni escritura confirmada; reutiliza controles estrictos de I7 sin modificar PR anteriores.
- **tests/integracion-i8-browser.test.cjs y tests/i8-resilience-browser.test.cjs:** integración real en WebKit emulado y Chromium. La prueba de bloqueo usa una conexión IndexedDB versión 1 viva mientras la página I8 solicita versión 2; se verifica el desbloqueo al cerrar la conexión anterior. Las pruebas de corrupción alteran un ciphertext de laboratorio para exigir rechazo y conservar las demás operaciones. La clave perdida se simula introduciendo una frase equivocada y comprobando byte a byte que no se borra nada.
- **Reinicio de proceso**, no solo recarga: una prueba Chromium abre un perfil persistente desechable, deja dos WAL duraderos, cierra el contexto/proceso entero, vuelve a lanzar Chrome con el mismo perfil y exige recuperación seleccionada, fusión idempotente y puntuaciones ficticias confirmadas. Se destruye el directorio temporal al finalizar.

## Matriz de aceptación previa a CI

- [ ] SHA/contratos de seis activos de main CP-020, FGB 31 pruebas (10 gallegas y 21 nacionales).
- [ ] Solo datos sintéticos A/B/C; no se conectan servicios reales ni se importa un documento auténtico.
- [ ] QuotaExceededError **simulado dentro de la transacción IDB**: no ACK durable, backend intacto, otro jugador conserva sus WAL.
- [ ] Bloqueo **real** de actualización de esquema IDB: modo bloqueado y recuperación después de liberar el lock antiguo, sin sobrescrituras.
- [ ] AES-GCM adulterado: WAL ilegible causa bloqueo total del propietario, otras entradas quedan byte a byte intactas y B/C siguen independientes.
- [ ] Contraseña errónea/perdida: no lectura, no limpieza ni sustitución; clave correcta recupera operaciones válidas.
- [ ] Cierre y reinicio completos de navegador Chromium: N pendientes por pestaña/operación sobreviven y se concilian con CAS y confirmación explícita; sin duplicados.
- [ ] Sintaxis, contratos I7 y regresión de CP-020 en WebKit iPhone/tablet emulados y Chromium, CI con checkpoint verificable.

## Límites no resueltos (obligatorio)

I8 NO proporciona sincronización entre dispositivos ni servidor remoto: los confirmados y los WAL son dos almacenes **cifrados de IndexedDB del mismo origen ficticio**. La prueba de cuota usa un aborto controlado que representa QuotaExceededError; no se simula el agotamiento real del volumen o límites iOS. El bloqueo de versión es un mecanismo real de IndexedDB, pero no cubre todos los bloqueos del sistema. La prueba criptográfica es experimental, sin validación en Safari iPhone físico, modo privado, cuota real o ataque de scripts con acceso al mismo origen.

**Ningún sistema puede prometer guardar lo que aún está en RAM si el navegador se mata antes del acuse de transacción.** I8 garantiza únicamente que las operaciones que *sí* obtuvieron ACK conservan su identidad y cifrado en la simulación y que los fallos no inducen sustituciones/destrucción silenciosa.

En particular, **no ofrecer reseteo de clave ni borrado automático** de diarios ante contraseña perdida; no se pueden recuperar copias cifradas sin la frase correcta. Las operaciones corruptas se retienen y requieren investigación segura (no reparación especulativa).

**Prohibiciones:** no modificar main, app.js publicado, calendario FGB, datos auténticos ni PR #1/#8/#10/#12/#13/#18/#20/#21/#22/#23/#24. No fusionar, publicar, contactar servicios externos ni iniciar fases posteriores sin nueva orden.
