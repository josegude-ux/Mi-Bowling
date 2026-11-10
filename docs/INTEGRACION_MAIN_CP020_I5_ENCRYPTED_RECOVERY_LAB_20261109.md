# MI BOWLING · LAB I5 · Recuperación de pendientes cifrados tras recarga real

**Orden:** BOWLING-INTEGRACION-CP020-I5-20261109
**Fecha:** 9 de noviembre de 2026
**Origen I4:** PR #21, checkpoint 5fc439d246ef1619476b8ea2a96602559662c949 y código validado 5d9a9d238f3156b336c7970d8557508d6107bfc6.
**Rama I5:** feature/integracion-main-auth-i5-lab-20261109, derivada del último checkpoint I4; PR #22 independiente en borrador.
**Checkpoint funcional de código:** 452a4ab03e89e38055ff739ef81802d420f177bb (validado en GitHub Actions, antes de añadir esta evidencia).
**Main preservado:** 566aafdc05be163baf8c7f82e60433b0f532d748 (VISURA y FGB CP-020).

## Objetivo y implementación

I4 guardaba pendientes en un Map de memoria; cerrar la página destruía el diario. I5 implementa un **journal write-ahead verdaderamente persistente entre cierres y recargas de pestaña dentro de un mismo origen de laboratorio**.

- lab/i5-encrypted-journal.js: captura un manejador nativo de IndexedDB **antes** del aislamiento. Únicamente el módulo de journal puede acceder a él; el motor, perfiles, Auth de demostración y resto de la página siguen viendo window.indexedDB como undefined. Base dedicada: mi-bowling-i5-lab-encrypted-pending-v1, store encrypted-wal. No accede a bases de datos preexistentes del usuario.
- Cifrado AES-256-GCM con IV aleatorio por escritura, sal aleatoria de 128 bits, PBKDF2-SHA-256 con 310 000 iteraciones y AAD vinculada a versión/UUID/checksum. Quedan visibles UUID, versión, huella, sal e IV; el contenido del pendiente queda cifrado, sin guardar puntuaciones ni frases de desbloqueo en claro.
- La frase de desbloqueo es introducida expresamente y permite importar la clave PBKDF2 no extraíble **en RAM**. El formulario borra su valor tras crear el journal. **No se guarda la frase ni una clave de descifrado**; si se pierde la frase, el pendiente no puede recuperarse.
- lab/i5-guard.js y lab/integracion-main-auth-i5.html: nueva ruta LAB aislada sin PWA, IndexedDB accesible al motor, tokens reales, credenciales personales o servicios externos.
- lab/i5-persistence.js: mantiene revisión CAS, SHA-256 y resolución explícita de I4. El replace del journal durante una fusión segura se realiza con comprobación atómica del checksum anterior; evita descartar un borrador por una escritura simultánea en el journal.
- lab/integracion-main-auth-i5.js: tras acceso ficticio A/B/C desbloquea su journal. Si hay una copia pendiente, **no ejecuta la parte editable del motor CP-020**; presenta primero inspección de hash, recuperación explícita o fusión conservadora, y solo abre el motor tras confirmar los datos en el repositorio ficticio.
- Se utiliza el mismo cargador de CP-020 con verificación de SHA Git de I4, sin modificar app.js. La fachada del motor es RAM; la persistencia privada y su journal son asíncronos.

## Garantías probables y límites

1. Cada UUID puede consultar y limpiar exclusivamente su propio journal; un intento de acceso cruzado se rechaza antes de iniciar una transacción.
2. La entrada WAL se cifra y confirma en IndexedDB antes de comenzar la escritura remota simulada. Un error remoto deja un borrador cifrado recuperable.
3. Tras **cerrar realmente la pestaña, abrir otra y recargar de nuevo dentro del mismo contexto de navegador**, el journal sobrevive; nuevo desbloqueo y relectura de versión/hash deciden si procede recuperar. La clave de la sesión cerrada no persiste.
4. Una contraseña incorrecta, un ciphertext adulterado o un journal inconsistente **no se borra** ni se utiliza para sobrescribir datos.
5. No se afirma recuperar cambios anteriores al primer commit del journal: **permanece una ventana de debounce de 80 ms** previa a persistir el WAL. No es aún un autosave a prueba de cortes instantáneos.
6. El repositorio remoto de demostración es exclusivamente un Map simulado: **sus cambios confirmados no sobreviven a una recarga real**. I5 valida durabilidad del **pendiente cifrado**, no durabilidad remota ni sincronización de puntuaciones reales. Una demo recargada tras recuperar y limpiar el journal volverá a datos de fixture iniciales.
7. No se prueban IndexedDB o bloqueo de almacenamiento en Safari físico, modo privado, cuota agotada o iOS PWA real. WebKit de CI es una emulación Linux.
8. Esta protección criptográfica es **solo un prototipo**. Un script malicioso ejecutado en el mismo origen o un atacante que conozca la frase durante la sesión puede acceder a la RAM. La demostración utiliza cuentas ficticias y NO se deben introducir contraseñas personales.
9. La disponibilidad de la recuperación depende del origen: borrar datos del sitio, cambiar origen o desinstalar la aplicación puede eliminar el journal. No hay sincronización entre dispositivos.

## Seguridad / arquitectura

- Sin cuentas reales, correo, Supabase Auth, RLS real, SQL, Storage remoto ni envío de información a proveedores externos.
- Todos los artefactos main: app.js, index.html, styles.css, sw.js, official-calendar-2026-2027.js y data/calendario-fgb-2026-2027.json deben permanecer idénticos (Git SHA en contrato I2).
- FGB CP-020: 31 fechas oficiales, 10 gallegas y 21 nacionales.
- Las PR #1, #8, #10, #12, #13, #18, #20 y #21 siguen independientes y sin fusionar. I5 en PR apilada sobre la rama I4.

## Matriz de aceptación antes de cerrar checkpoint

- [x] Verificar los seis SHA CP-020 y calendario FGB 31 fechas.
- [x] Node sintaxis + regresión I4/I3 y RLS ficticio A/B/C.
- [x] Playwright WebKit emulado y Chromium: motor CP-020 y guard aislado.
- [x] Cierre real de pestaña/reapertura: pendiente A cifrado sobrevive, con IV/sal/ciphertext pero sin puntuaciones en texto claro.
- [x] Tras reabrir: contraseña errónea no borra WAL; B no accede a A; A necesita confirmación y CAS antes de reanudar.
- [x] Corrupción del ciphertext AES-GCM bloquea recuperación, no hace escrituras ni elimina copia.
- [x] Registrar código/checkpoint y ejecuciones CI SUCCESS, sin fusionar ni publicar.

**NO UTILIZAR CON PARTIDAS REALES · NO FUSIONAR · NO PUBLICAR.**


## Checkpoint I5 verificado · 9 de noviembre de 2026

**Código exacto validado:** 452a4ab03e89e38055ff739ef81802d420f177bb.
**Evidencia CI I5 sobre el código final:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42537369307 · SUCCESS, **2/2 jobs**.
**Evidencia CI complementaria de la PR (código anterior, con prueba de cierre y reapertura):** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42537359854 · SUCCESS, 2/2 jobs.
**PR:** https://github.com/josegude-ux/Mi-Bowling/pull/22 (abierta, draft, base de PR #21).

Pruebas específicas realizadas y observadas:
- WebKit emulando iPhone: escritura WAL con error de servidor ficticio, **cierre verdadero de pestaña**, apertura de pestaña nueva y **recarga verdadera** de la página antes de desbloquear. La entrada sobrevive y se comprueba que IndexedDB solo contiene el sobre cifrado, sin nombres de partidas ni puntuaciones en claro.
- Contraseña errónea: bloquea lectura sin borrar ni modificar ciphertext. La clave de una pestaña cerrada no persiste.
- Jugador B: inicio independiente sin abrir pendientes del jugador A; intento de leer A con journal de B denegado. Al volver a A, la app inicia en modo **solo recuperación**, con el motor editable bloqueado hasta resolver.
- Inspección de versión SHA-256, recuperación explícita con CAS, lectura posterior y borrado del journal únicamente tras confirmación. El motor CP-020 muestra la sesión ficticia recuperada.
- Chromium escritorio: alteración deliberada de bytes AES-GCM detectada; la app se bloquea y mantiene la copia alterada para investigación, sin escribir en el remoto ficticio.
- WebKit iPhone A y tablet B y Chromium escritorio C: integración normal con guarda asíncrona del CP-020, sin PWA ni modificación del localStorage real.
- Regresiones Node I4/I3, aislamiento A/B/C, contratos de SHA de seis ficheros CP-020 y calendario FGB 31 eventos (10 gallegos y 21 nacionales): todas aprobadas.

**Estado:** I5 VALIDADA EN LAB con cuentas y partidas ficticias y un origen HTTPS efímero de Playwright. Cifrado/IndexedDB probado en los navegadores de CI; no ha sido comprobado en Safari físico ni con cuentas/servidores/productos reales. No se considera apto para utilizar, migrar o sincronizar partidas auténticas.

**Advertencias de continuidad:** el backend de demostración desaparece al recargar; en la demo solo se conserva el WAL. Tampoco se evita la ventana previa de 80 ms antes del journal. Para una fase posterior, preparar persistencia del servidor simulado y pruebas multi-pestaña/quota/privado. Sin cambiar estas limitaciones, no aprobar producción.

**Prohibiciones:** no fusionar ni publicar, no conectar servicios reales, no tocar main ni las PR #1/#8/#10/#12/#13/#18/#20/#21.
