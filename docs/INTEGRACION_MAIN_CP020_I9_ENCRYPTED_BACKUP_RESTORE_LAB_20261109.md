# MI BOWLING · LAB I9 · Copias cifradas portátiles y restauración atómica

**Orden:** BOWLING-INTEGRACION-CP020-I9-20261109
**Fecha:** 9 de noviembre de 2026
**Origen recuperado:** PR #25, checkpoint I8 5a59723b6cda4e91a3337f68c415242282bbf88f; código I8 probado 2a1eb32a57b42ff9e8768c57488261ec32966a62.
**Rama nueva:** feature/integracion-main-auth-i9-lab-20261109; PR en borrador, apilada sobre I8.
**Main observado al iniciar I9:** 6dd7d486268a4ba23302559bebf209d531cc4964, **distinto** del main 566aafdc05be163baf8c7f82e60433b0f532d748 consignado en I8. Un commit de otra línea de trabajo cambió main antes de iniciar I9. No se ha modificado, revertido ni fusionado main en esta orden. Los seis activos CP-020 del checkpoint de laboratorio se mantienen idénticos a su origen I8; esto no equivale a afirmar que el main actual sigue en CP-020.

## Implementación de LAB (solo A/B/C y partidas ficticias)

- lab/i9-encrypted-store.js: **nuevo** IndexedDB exclusivamente de laboratorio, mi-bowling-i9-lab-encrypted-data-v3, con almacenes cifrados de puntuaciones confirmadas y de WAL individuales por UUID jugador/pestaña/operación. Cifrado original de las operaciones mediante AES-GCM/PBKDF2; jamás accede a tablas de producción.
- **snapshot():** lee el confirmado y todos los WAL del propietario **en una sola transacción readonly**, verifica que cada fila se descifra con la clave activa, rechaza duplicaciones del UUID de operación y devuelve una instantánea consistente. Cualquier ciphertext del propietario corrupto hace fallar el respaldo en vez de ignorarlo.
- **restoreSnapshot():** valida criptográficamente el contenido del archivo, la identidad propietaria, los hashes de confirmado y las firmas SHA-256 de cada WAL. No modifica datos si falla una comprobación. Solo importa el confirmado cuando la base destino está realmente vacía; si hay un confirmado, exige que su revisión y digest coincidan exactamente. Una versión inferior se clasifica **obsoleta**; una versión diferente al mismo nivel se clasifica **conflicto**. No se sobrescribe ningún confirmado. Las operaciones ya existentes son idempotentes únicamente si comparten ID y SHA idénticos.
- Antes de escribir, cifra todas las entradas nuevas con la **clave del almacén destino**, que puede ser distinta de la frase de respaldo. Luego comprueba que ambas tablas no han cambiado desde la prevalidación y realiza una única transacción **readwrite conjunta**. Si otro proceso introduce cambios, aborta sin confirmar nada parcialmente. Nunca borra otros diarios ni cuentas, y no usa "last write wins".
- lab/i9-backup.js: archivo **portátil**, con AES-256-GCM y PBKDF2-SHA256 (310 000 iteraciones), sal e IV nuevos por exportación, AAD ligada a versión, UUID, revisión, recuento, hash y backupId. Contenido confirmado y N operaciones están dentro de un único ciphertext, protegido por una **frase de respaldo separada** de la clave del journal. Metadatos de cabecera, incluidos UUID/revisión/recuento, no son secretos; el payload sí se cifra. Máximo 18 MiB de texto cifrado, 512 operaciones, solo formato I9. La clave/frase no se guarda.
- lab/integracion-main-auth-i9.js, lab/integracion-main-auth-i9.html y lab/i9-backup-ui.js: interfaz LAB con exportación mediante descarga local Blob, selección de archivo, verificación previa y consentimiento explícito. Para restaurar un backup con puntuaciones confirmadas en una base nueva, se selecciona el archivo **antes** del login ficticio. Así se restaura antes del seeding de fixtures, sin sobrescribir a posteriori. Un import posterior a una sesión abierta impide seguir editando sobre memoria desactualizada y requiere recarga para revisar las operaciones.
- Mantiene lab/i4-engine-port.js y app.js CP-020 de la rama I8 sin cambios de código publicado. La protección del guard impide consultar storage real o conectar servicios externos.

## Matriz de aceptación antes de CI

- [x] Copia cifrada contiene confirmados y dos o más WAL; no hay puntuaciones ni contraseña en texto claro.
- [x] Exportación en WebKit emulando iPhone A, restauración en Chromium de una base *nueva* del mismo LAB con contraseña del vault diferente; el contenido se vuelve a cifrar usando la clave local nueva.
- [x] Identidad A/B/C estricta: backup A no puede abrir ni modificarse bajo B.
- [x] Contraseña de backup incorrecta, AES-GCM alterado, metadatos AAD alterados o SHA de WAL incorrecto se rechazan sin escritura.
- [x] Restauración del mismo archivo y mismos IDs contra un confirmado idéntico: idempotencia, ningún duplicado.
- [x] Restauración más antigua que el confirmado actual: rechazar como OBSOLETO, sin degradar revisiones ni borrar WAL.
- [x] Respaldo con mismo número de revisión pero contenido divergente: conflicto, sin sustituciones.
- [x] Una restauración iniciada desde dos pestañas contra la misma base vacía: CAS transaccional, ningún doble insertado; una puede abortar y otra aplicarse.
- [x] Recuperación explícita y fusión no destructiva de varias operaciones tras importar; revisión incrementada y hash comprobado.
- [x] Main ajeno preservado sin modificaciones en I9, PR anteriores abiertas y no fusionadas; seis activos CP-020 originales de LAB y calendario FGB 31 eventos sin cambios.

## Límites y seguridad no negociables

No se hace copia de partidas reales, ni se accede a Gmail/Drive/SQL/Auth, ni se sube archivo a ningún servicio externo. No se propone publicación. El respaldo exportado se guarda **solo mediante descarga iniciada por el navegador** y una frase ficticia explícita. El backend del ejemplo es IndexedDB del mismo origen, no hay sincronización remota ni recuperación multi-dispositivo real. Abrir un archivo sin su frase correcta es criptográficamente imposible con este diseño; no ofrecer "reset" ni destrucción automática.

El cifrado está sujeto a la seguridad del propio origen web y sus scripts. La operación previa al acuse de durabilidad de IndexedDB no puede protegerse ante un cierre instantáneo. La restauración de una instantánea antigua se rechaza cuando ya existen confirmados de revisión diferente, en vez de hacer sobrescritura destructiva. La semántica de conflicto se limita a documentos de laboratorio y puntuaciones ficticias.

**NO FUSIONAR, NO PUBLICAR, NO DATOS REALES.**


## Checkpoint I9 verificable · 9 noviembre 2026

**Código funcional exacto probado:** 1f0c26c20ddf66d11e15280f5b950f95a451fe95
**Evidencia GitHub Actions:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42585082515 — **SUCCESS · 2/2 jobs**, Node + WebKit/Chromium, sobre el código indicado.
**PR draft:** https://github.com/josegude-ux/Mi-Bowling/pull/28, apilada sobre PR #25.

### Evidencias verificadas

1. Node: seis activos CP-020 de la rama LAB idénticos a su referencia contractual; calendario FGB 31 eventos (10 gallegos, 21 nacionales). Contratos A/B/C, AES-GCM, firma SHA-256, claves incorrectas, cabeceras AAD alteradas, duplicados en archivo, identidad ajena, separación de Liga Nacional y consentimiento explícito.
2. WebKit emulando iPhone A y tablet B, Chromium escritorio C: motor original CP-020 verificado por SHA, sin leer localStorage auténtico, sin PWA y sin servicios remotos.
3. WebKit A: exportación cifrada con un confirmado revisión 1 y dos WAL independientes, sin identificadores de partidas en claro. **Botón real de descarga** en archivo .mbi9 y **botón real de previsualización** verifican el respaldo descargado, sin modificar el almacén.
4. WebKit: clave de respaldo incorrecta y UUID del jugador B rechazan el respaldo de A antes de escribir.
5. Chromium: importación en un origen LAB nuevo antes de sembrar fixtures, usando clave de vault distinta de la del origen; se recuperan confirmado y dos WAL. Reimportar el mismo archivo por API y botón de UI es idempotente: already-present, sin duplicación.
6. Chromium: mismo número de revisión confirmado con contenido diferente se rechaza (conflicto). Un WAL con **mismo opId y distinto tabId** también se rechaza aun cuando su nueva firma SHA esté correctamente calculada; ningún confirmado ni WAL anterior se sustituye.
7. Chromium: intento de restaurar archivo A en cuenta B bloqueado sin sembrar datos ajenos. El jugador B sigue pudiendo iniciar limpio.
8. Chromium: recuperación manual del primer WAL, fusión conservadora del segundo, revisión confirmada 3 con ambas sesiones ficticias sin duplicados. Un backup anterior revisión 1 se rechaza como OBSOLETO: sin downgrade ni borrado.
9. Chromium: modificación del ciphertext del archivo AES-GCM causa rechazo antes de escribir.
10. Chromium: dos pestañas de una base nueva restauran el mismo respaldo concurrentemente; una confirma, la otra es idempotente o aborta por CAS, conservando un confirmado y solo dos operaciones.

### Límites y coordinación

El almacenamiento confirmado y el journal son únicamente IndexedDB del mismo origen LAB ficticio. El archivo se cifra con una frase de exportación independiente y no persistida. La cabecera expone UUID/revisión y metadatos; puntuaciones y operaciones quedan bajo AES-GCM. No se certifica servidor real, sincronización, Safari iPhone físico, recuperación sin clave ni protección antes del acuse asíncrono.

Main observado antes de comenzar I9: 6dd7d486268a4ba23302559bebf209d531cc4964 (cambiado por otra línea de trabajo respecto al main del checkpoint I8). No se ha modificado, revertido, fusionado ni publicado main en I9. Solo se añadieron archivos I9 en la rama de laboratorio apilada.

**Estado: I9 VALIDADO SOLO EN LAB con datos ficticios; PR #28 DRAFT. No fusionar ni publicar.**
