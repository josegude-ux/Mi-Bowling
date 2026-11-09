# MI BOWLING · Fase I6 LAB · Backend ficticio cifrado y WAL inmediato

**Orden:** BOWLING-INTEGRACION-CP020-I6-20261109
**Fecha:** 9 noviembre 2026
**Origen:** PR #22 / checkpoint I5 7b70b4f63d3a66014ba4a4176386455a7a18abb9; código I5 ensayado 452a4ab03e89e38055ff739ef81802d420f177bb.
**Rama:** feature/integracion-main-auth-i6-lab-20261109 (solo LAB).
**Main previo:** 566aafdc05be163baf8c7f82e60433b0f532d748, sin editar.

## Implementación

- **lab/i6-encrypted-store.js:** origen HTTPS de laboratorio aislado y dos almacenes IndexedDB dedicados: encrypted-wal y encrypted-confirmed. El módulo captura el manejador nativo antes de que el guard oculte indexedDB al motor. Cada UUID se desbloquea con una frase ficticia introducida por el usuario, solo en RAM. PBKDF2-SHA-256 con 310.000 iteraciones, AES-GCM de 256 bits, sal e IV aleatorios nuevos por escritura, AAD ligada a propietario, revisión, versión, tipo y huella. Ninguna puntuación va en claro al disco. La revisión, UUID y huella visibles no constituyen anonimato.
- **lab/integracion-main-auth-i6.js:** conserva la autenticación simulada A/B/C y la verificación ficticia de RLS antes de acceder al backend local. Al entrar, inicializa un documento cifrado solo si no existía y nunca reemplaza puntuaciones confirmadas. Desbloqueo con la misma frase ficticia tras recargar, motor real CP-020 tras lectura validada.
- **lab/i6-persistence.js:** conserva el protocolo de I5: journal write-ahead antes de modificar el confirmado, revisión CAS, lectura de confirmación y conflicto no destructivo. Elimina la **espera programada de 80 ms antes de comenzar el WAL**: inicia la operación al recibir save() del motor. El backend confirmado no se modifica hasta que IndexedDB confirme la escritura del WAL.
- **lab/i6-guard.js / lab/integracion-main-auth-i6.html:** ruta aislada sin servicios reales, PWA ni lectura de otras bases.
- **lab/i4-engine-port.js:** transformación en RAM del motor CP-020 verificada por SHA Git, sin editar app.js.
- **tests/integracion-i6-browser.test.cjs / tests/i6-encrypted-backend-browser.test.cjs:** WebKit iPhone emulado y Chromium escritorio: guardar, recargar, cerrar pestaña, verificar cifrado, cuentas separadas, dos pestañas con revisión obsoleta y fusión conservadora.

## Garantías y límites

1. El **backend es ficticio**: los dos almacenes residen en IndexedDB del mismo origen LAB, no en un servidor externo. No existe sincronización entre móviles, navegadores ni dispositivos distintos. Al borrar los datos de sitio o cambiar el origen se pueden perder tanto puntuaciones confirmadas como pendientes.
2. Los confirmados se conservan tras cierre y recarga: el backend consulta el documento cifrado anterior y no lo reemplaza con el fixture inicial.
3. La escritura confirmada usa CAS transaccional readwrite de IndexedDB, que comprueba revisión y huella frente a otras pestañas del mismo origen. El rechazo no destruye confirmados; exige revisar el pendiente antes de conciliarlo.
4. **El journal no tiene debounce deliberado**, pero AES-GCM, PBKDF2 e IndexedDB son APIs asíncronas. Si el navegador se cierra en mitad del cifrado o de la transacción, un cambio que **todavía no se haya confirmado como durable** puede perderse. Por tanto, no se garantiza ausencia absoluta de ventana ante una caída instantánea del proceso. La fase elimina el retraso artificial, no las limitaciones físicas de una escritura asíncrona.
5. I6 conserva un solo journal por UUID. Dos pestañas con WAL distintos que compitan recibirán error sin sobrescritura ciega. El segundo borrador podría quedar solo en RAM, no duradero; una garantía estricta de cero pérdida bajo ediciones simultáneas exige journaling por pestaña/operación.
6. Las pruebas de WebKit se ejecutan en Linux con emulación de tamaño/dispositivo; no certifican Safari en un iPhone físico. Pendientes también cuota agotada, modo privado, bloqueo de DB y pruebas con dispositivos diferentes.
7. El cifrado es experimental y no protege frente a código malicioso que se ejecute en la misma página. No introducir frases de contraseña reales ni datos auténticos.

## Aceptación pendiente de evidencia CI

- [ ] SHA de seis activos publicados CP-020 intactos; 31 fechas FGB: 10 gallegas y 21 nacionales.
- [ ] Sintaxis, regresiones I3/I4, acceso A/B/C.
- [ ] WebKit y Chromium: puntuaciones confirmadas cifradas tras cierre y recarga real, sin escribir localStorage nativo.
- [ ] Contraseña errónea bloquea y los jugadores quedan aislados.
- [ ] WAL inmediato antes de backend confirmado y recuperable tras cierre.
- [ ] Dos pestañas del mismo propietario: CAS, conflicto explícito y fusión de sesiones nuevas no solapadas.
- [ ] Nueva PR draft; CI verificada y checkpoint documental.

**NO FUSIONAR · NO PUBLICAR · NO CONECTAR SERVICIOS REALES · NO PARTIDAS AUTÉNTICAS.**
