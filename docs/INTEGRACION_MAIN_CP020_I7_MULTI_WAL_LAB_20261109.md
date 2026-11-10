# MI BOWLING · LAB I7 · WAL cifrado por pestaña y operación

**Orden:** BOWLING-INTEGRACION-CP020-I7-20261109
**Fecha:** 9 noviembre 2026
**Origen I6:** PR #23, checkpoint 8a343b71fb03fd2ec214f0fedb80242d85b5ad10; código I6 ensayado f9dc401e28b569d6d79afbe0588df4bb5a1f2fe3.
**Rama nueva:** feature/integracion-main-auth-i7-lab-20261109 (LAB).
**Main al comenzar:** 566aafdc05be163baf8c7f82e60433b0f532d748, intacto.

## Alcance implementado

- lab/i7-encrypted-store.js: nueva IndexedDB exclusiva de laboratorio denominada mi-bowling-i7-lab-encrypted-data-v1, con almacenes encrypted-operations y encrypted-confirmed. WAL con clave primaria compuesta propietario:pestaña:operación; varias pestañas y operaciones de un propietario no se reemplazan. Las puntuaciones quedan cifradas con AES-256-GCM, sal/IV aleatorios, PBKDF2-SHA-256 y metadatos autenticados. Frase de desbloqueo ficticia no persistida, manejador de IndexedDB inaccesible al motor y scripts normales.
- lab/i7-persistence.js: firma SHA-256 de cada operación, evento de guardado inmediato sin debounce, cola por pestaña; append retorna acuse duradero exclusivamente tras oncomplete de una transacción de IndexedDB. El confirmado fake nunca se escribe antes de ese acuse. Reconciliación por operación y UUID verificando propiedad, revisión, hash y CAS. Se reconoce un acuse perdido después del commit sin duplicar. Fusión conservadora de altas no solapadas requiere confirmación explícita, crea una nueva operación cifrada antes de escribir y solo borra la original después de verificar confirmado y checksum.
- lab/integracion-main-auth-i7.html, lab/i7-guard.js y lab/integracion-main-auth-i7.js: acceso A/B/C ficticio, selector de WAL independiente, botones de inspección, recuperación manual, SHA y fusión, motor CP-020 bloqueado si quedan WAL al reabrir. No se accede a servicios externos, PWA ni almacenamiento real del visitante.
- tests/integracion-i7-browser.test.cjs: compatibilidad con app.js CP-020 verificado por SHA, WebKit iPhone/tablet emulado y Chromium.
- tests/i7-multi-wal-browser.test.cjs: pestañas A concurrentes, cierre/reapertura real, WAL individual cifrado, aislamiento A/B/C, error previo a escribir confirmado, acuse perdido después del commit, IDB abortado antes del acuse, CAS y fusión explícita, rechazo de ediciones solapadas.

## Matriz de aceptación

- [x] CP-020 seis SHA intactos y calendario FGB 31 eventos (10 gallegos, 21 nacionales).
- [x] Dos pestañas crean WAL distintos; ambas operaciones permanecen cifradas y duraderas tras cerrar y reabrir.
- [x] Solo la operación seleccionada se recupera o se fusiona; otros WAL y datos confirmados quedan intactos.
- [x] CAS impide sobrescribir una revisión ganadora, y fusión segura solo permite altas no solapadas. Los solapamientos conservan ambas copias.
- [x] Un fallo antes de commit deja WAL durable y confirmados sin cambio; pérdida del ACK tras commit se reconoce sin reenvío.
- [x] Un aborto de IndexedDB anterior a oncomplete no concede el estado DURABLE ni inicia escritura de backend.
- [x] A/B/C separados, error de contraseña bloqueado, recarga y cierres reales verificados en WebKit/Chromium.
- [x] Regresiones I3/I4 e integridad FGB; checkpoint SHA, PR draft y GitHub Actions SUCCESS.

## Límites (NO OMITIR)

El backend cifrado y los WAL existen solo en IndexedDB del mismo origen LAB, nunca en un servidor real. Una operación cifrada duradera no equivale a una puntuación remota confirmada. Si el proceso se cierra antes del acuse de durabilidad, el cambio aún volátil podría perderse: **no existe garantía de pérdida cero instantánea usando estas APIs asíncronas**. Tampoco se prueba Safari de iPhone físico, almacenamiento lleno, modo privado o sincronización entre dispositivos. La frase de prueba no se guarda y una clave perdida impide abrir el diario.

**Conservar main, los seis activos CP-020, todos los datos y calendario FGB, PR #1/#8/#10/#12/#13/#18/#20/#21/#22/#23. Sin merge, publicación, cuentas reales ni servicios externos.**

Estado I7: validado exclusivamente en LAB con datos ficticios; código SHA 532daefe608636ecf7ec5c530bd014116af67a3b.


## Checkpoint verificable I7 · 9 noviembre 2026

- **Código exacto probado y aprobado:** 532daefe608636ecf7ec5c530bd014116af67a3b.
- **PR de desarrollo:** https://github.com/josegude-ux/Mi-Bowling/pull/24 (draft, apilada sobre PR #23).
- **Evidencia CI de código:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42543856213 — SUCCESS 2/2 jobs; contratos Node y WebKit/Chromium en GitHub Actions.
- **Rama:** feature/integracion-main-auth-i7-lab-20261109. Main y PR anteriores intactas.

Evidencias observadas directamente en logs CI:

1. Los seis blobs CP-020 publicados permanecen idénticos. Calendario: **31 eventos (10 gallegos y 21 nacionales)**, filtros, sin duplicados, partidas y datos intactos.
2. Test Node I7: comprobación de WAL único por operación, acumulación de instantáneas, rechazo de Liga en el documento personal, colisiones sobre IDs modificados y bloqueo de backend en caso de abortar la transacción sin ACK.
3. Playwright I7: motor CP-020 original en WebKit iPhone ficticio A/tablet B y Chromium escritorio C, sin tocar localStorage real ni registrar PWA; único origen HTTPS efímero.
4. WebKit: **dos WAL independientes de dos pestañas** cifrados, supervivencia a cierre de pestañas reales, vuelta a abrir en modo solo recuperación, conciliación del primer WAL y fusión conservadora del segundo. Ambas sesiones quedan en el confirmado cifrado.
5. WebKit: **dos guardados rápidos acumulativos en una misma pestaña**, ambos WAL sobreviven independientemente y se reconcilian sin duplicar la sesión idéntica del primer snapshot.
6. WebKit: UUID A/B/C aislados; el fixture de B no aparece en C ni el de A en B. No se usa ningún proveedor real.
7. WebKit: respuesta perdida **después de commit confirmado** se reconoce por revisión y hash sin repetir el guardado; aborto de IndexedDB **antes de ACK** no publica estado de durabilidad ni envía una escritura al fake backend.
8. Chromium: dos pestañas escriben contra revisión obsoleta; CAS preserva al ganador y el WAL perdedor; fusión explícita y sin solapamiento conserva ambos. Modificaciones opuestas a una sesión preexistente **no se fusionan**, permaneciendo WAL y confirmado intactos.

Correcciones verificadas durante I7:
- Los fixtures antiguos del CP-020 se normalizan previamente para que el comparador de tres vías no interprete campos faltantes como cambios del usuario.
- La prueba de CAS usa la revisión del servidor como evidencia y no presume que la pestaña ganadora vaya a mostrar estado "saved" cuando detecta otro WAL pendiente.
- Dos snapshots acumulados de la misma pestaña pueden compartir una sesión con el mismo ID **solo si sus bytes son idénticos**. Una versión distinta es un conflicto y se conserva.
- El contrato personal I7 rechaza también leagueRosters y valores de documento malformados.
- Se añadió Node test propio para evitar un éxito engañoso de durabilidad antes de oncomplete.

**No certificamos pérdida cero si el proceso muere antes del acuse IDB.** Durabilidad de journal y confirmación remota son estados distintos; el "backend" es solo otro almacén cifrado del mismo navegador de LAB. Sin conexión a cuentas, bases o dispositivos reales, sin SQL ni Storage, sin Safari de iPhone físico, sin merge ni despliegue.

**Checkpoint funcional: I7 VALIDADA EN LAB · PR #24 DRAFT · PRODUCCIÓN SIN CAMBIOS.**
