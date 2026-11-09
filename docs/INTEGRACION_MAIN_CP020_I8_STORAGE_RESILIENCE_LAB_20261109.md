# MI BOWLING · LAB I8 · Resistencia del WAL cifrado

**Orden:** BOWLING-INTEGRACION-CP020-I8-20261109
**Fecha:** 9 noviembre 2026
**Origen verificable:** PR #24, checkpoint I7 c46a6ccd205a45031e4e8c441d5de349f5c64c07, código probado 532daefe608636ecf7ec5c530bd014116af67a3b.
**Nueva rama:** feature/integracion-main-auth-i8-lab-20261109, apilada sobre I7 y aislada de main.
**Referencia main:** 566aafdc05be163baf8c7f82e60433b0f532d748.
**Estado de aceptación:** I8 VALIDADA EN LAB con datos ficticios; evidencia GitHub Actions 2/2 aprobada.

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

- [x] SHA/contratos de seis activos de main CP-020, FGB 31 pruebas (10 gallegas y 21 nacionales).
- [x] Solo datos sintéticos A/B/C; no se conectan servicios reales ni se importa un documento auténtico.
- [x] QuotaExceededError **simulado dentro de la transacción IDB**: no ACK durable, backend intacto, otro jugador conserva sus WAL.
- [x] Bloqueo **real** de actualización de esquema IDB: modo bloqueado y recuperación después de liberar el lock antiguo, sin sobrescrituras.
- [x] AES-GCM adulterado: WAL ilegible causa bloqueo total del propietario, otras entradas quedan byte a byte intactas y B/C siguen independientes.
- [x] Contraseña errónea/perdida: no lectura, no limpieza ni sustitución; clave correcta recupera operaciones válidas.
- [x] Cierre y reinicio completos de navegador Chromium: N pendientes por pestaña/operación sobreviven y se concilian con CAS y confirmación explícita; sin duplicados.
- [x] Sintaxis, contratos I7 y regresión de CP-020 en WebKit iPhone/tablet emulados y Chromium, CI con checkpoint verificable.

## Límites no resueltos (obligatorio)

I8 NO proporciona sincronización entre dispositivos ni servidor remoto: los confirmados y los WAL son dos almacenes **cifrados de IndexedDB del mismo origen ficticio**. La prueba de cuota usa un aborto controlado que representa QuotaExceededError; no se simula el agotamiento real del volumen o límites iOS. El bloqueo de versión es un mecanismo real de IndexedDB, pero no cubre todos los bloqueos del sistema. La prueba criptográfica es experimental, sin validación en Safari iPhone físico, modo privado, cuota real o ataque de scripts con acceso al mismo origen.

**Ningún sistema puede prometer guardar lo que aún está en RAM si el navegador se mata antes del acuse de transacción.** I8 garantiza únicamente que las operaciones que *sí* obtuvieron ACK conservan su identidad y cifrado en la simulación y que los fallos no inducen sustituciones/destrucción silenciosa.

En particular, **no ofrecer reseteo de clave ni borrado automático** de diarios ante contraseña perdida; no se pueden recuperar copias cifradas sin la frase correcta. Las operaciones corruptas se retienen y requieren investigación segura (no reparación especulativa).

**Prohibiciones:** no modificar main, app.js publicado, calendario FGB, datos auténticos ni PR #1/#8/#10/#12/#13/#18/#20/#21/#22/#23/#24. No fusionar, publicar, contactar servicios externos ni iniciar fases posteriores sin nueva orden.


## Checkpoint I8 · 9 noviembre 2026 · VALIDADO EN LAB (sin publicación)

**Código funcional exacto verificado:** 2a1eb32a57b42ff9e8768c57488261ec32966a62.
**CI push del código:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42545530413 — **SUCCESS, 2/2 jobs**.
**PR #25:** https://github.com/josegude-ux/Mi-Bowling/pull/25 (draft, base I7 PR #24).
**Rama:** feature/integracion-main-auth-i8-lab-20261109.
**Checkpoint anterior intacto:** I7 c46a6ccd205a45031e4e8c441d5de349f5c64c07.

### Evidencias independientes de GitHub Actions

- Node: seis activos publicados de CP-020 con hash idéntico; calendario oficial FGB 31 eventos (10 gallegos y 21 nacionales), sin duplicación ni cambios en otros módulos. Contratos I7 y prueba de abortos I8 pasan. Las pruebas de I8 distinguen WAL volátil (sin transacción confirmada) de WAL duradero y no permiten escribir confirmados después de una cuota simulada.
- WebKit en Linux emulando iPhone A y tablet B, y Chromium escritorio C: motor CP-020 verificado y conservado, guardado con datos ficticios, aislamiento sin acceder al localStorage real ni registrar PWA.
- WebKit: el fixture **QuotaExceededError** aborta la transacción real de IDB. No hay acuse ni escritura confirmada, la modificación sigue señalada como volátil, y el WAL cifrado preexistente de B queda intacto. No se llenó una cuota de disco real.
- WebKit: contraseña errónea/perdida bloquea el acceso y una auditoría solo lectura cuenta WAL ilegibles, sin alterar ciphertext. Al introducir la frase correcta, el WAL íntegro vuelve a ser legible.
- Chromium: se mantiene abierta una conexión genuina IndexedDB v1 mientras I8 solicita v2. La página se bloquea (sin cargar editor ni sobrescribir archivos), y funciona después de liberar la conexión antigua.
- Chromium: con **dos WAL cifrados de A**, se altera un ciphertext. La apertura de A se bloquea y el diagnóstico identifica exactamente 1 ilegible y 1 legible sin descartar ninguno; B y C siguen independientes. La auditoría no borra ni edita registros.
- Chromium: con el documento **confirmado** cifrado alterado, el sistema también bloquea la entrada al motor editable; no sustituye el registro inválido por la fixture y B permanece independiente.
- Chromium con **perfil persistente temporal**: se cierra completamente el proceso/contexto de navegador, se vuelve a lanzar Chrome en el mismo perfil, se desbloquean dos WAL, se recupera expresamente uno y se fusiona el otro de forma conservadora con CAS. Ambos IDs ficticios quedan confirmados sin duplicarse, también después de recargar.
- Los casos demostrados son cierres y reaperturas de **proceso con perfil persistente**, no una garantía de restauración tras un crash brutal o pérdida física de almacenamiento.

### Correcciones en esta fase

El primer test de diagnóstico externo intentó construir una URL relativa desde about:blank. Se corrigió usando el origen HTTPS efímero verificado de LAB. Se amplió después la matriz para probar también corrupción del documento confirmado y se reprodujo de nuevo CI con resultado SUCCESS.

**Limitaciones no superadas:** pérdida posible de cualquier operación sin ACK tras interrupción instantánea; cuota real no agotada en CI; no Safari iPhone físico, almacenamiento privado, cuotas iOS reales, sincronización entre dispositivos ni backend externo. Una frase perdida no puede restituirse automáticamente, y una copia corrupta se conserva sin reparación destructiva.

**Decisión de entrega:** Fase I8 aprobada **solo como laboratorio de datos ficticios**. Sin autorización de merge, publicación ni uso de partidas reales.
