# MI BOWLING · A6 · Respaldo, integridad y migración a UUID (solo LAB)

**Orden:** BOWLING-AUTH-MIGRACION-RESPALDOS-LAB-A6-20261108  
**Fecha:** 8 de noviembre de 2026  
**PR:** #13 · `feature/auth-correo-lab-20261108` · **draft, no fusionada**  
**Checkpoint de partida:** `f7db09889a4bb6bd465b423e908dad75ae01457f` (`AUTH_RLS_TRES_JUGADORES_LAB_A5_20261108.md`, CI `42522503633` SUCCESS).  
**`main` observado al recuperar la orden:** `bb4e055fec10ec802961e8d350d01404e90a6e2b`, incluye refinamientos visuales VISURA posteriores a CP-018. **No integrado** en PR #13.  
**PR #1, #8, #10 y #12:** intactas; no se han fusionado ni modificado.

## Estado de la implementación

Se ha creado **`auth-legacy-migration-lab.js`**, módulo de transferencia **inactivo hasta que una operación explícita invoque sus funciones**. No está importado por `index.html`, `app.js`, `auth-boot.js` ni por la PWA publicada. No abre ni modifica `localStorage`, `IndexedDB` o Supabase por sí solo. Trabaja con interfaces inyectadas (fuentes de lectura, cliente Auth ya validado, repositorio privado y almacén de PDF con control de propietario).

**Este A6 no ha migrado ningún dato real**. No existe un bucket de Storage ni un sistema de publicación. La interfaz de almacenamiento binario se ha probado únicamente con `tests/private-pdf-store-mock.cjs`; la persistencia de documentos personales se ha probado contra `tests/rls-mock-server.cjs` de A5.

### Contrato de respaldo

1. `capture({storage,readPdf,sourceProfileId,ownerId,confirmOwnerId,acknowledge})` requiere una **elección explícita y coincidente del perfil local y del UUID destino**, además de la aceptación `CONFIRMO_ASIGNACION_DE_ESTE_HISTORIAL`. Ni el nombre ni el correo local otorgan identidad. El destino definitivo deberá verificarse por Supabase Auth real antes de usar estas funciones.
2. Recupera **solo el origen seleccionado**: `mi-bowling-profile:legacy:mi-bowling-analitica-v2` (prioritario) u otra clave `mi-bowling-profile:p-...:...`. Para el perfil legado admite leer la clave original si la copia local nunca se generó. No asigna automáticamente puntuaciones a cualquier nueva cuenta.
3. Mantiene las partidas, lanzamientos con identificación de los diez bolos, bolas, patrones y preferencias existentes. Como las estadísticas visuales se calculan a partir de esos lanzamientos, conservar el historial sin alteraciones es indispensable; A6 no guarda porcentajes preinventados.
4. Las actas de Liga Nacional y preferencias de Liga antiguas quedan en **`leagueArchive` dentro del respaldo verificado**, pero **NO** se insertan en el documento personal. La importación específica de `league` queda para una fase con autorización/ACL de equipos.
5. Recupera cada PDF asociado a `patterns[].id` mediante un callback de lectura. Si un PDF declarado con `pdfName` falta o es inválido, **se bloquea el paquete entero**. No continúa a medias con documentos sin PDF.
6. Los PDF (máximo 20 MiB por archivo, cabecera `%PDF-`) se guardan en el paquete como bytes Base64 con **SHA-256 individual**. El manifiesto completo con historial, propietario, resumen de sesiones/partidas/lanzamientos/derribos y archivos tiene SHA-256 global. Es una **verificación de integridad accidental, no una firma criptográfica de origen ni una prueba de autenticación**.
7. `verify(pkg,{ownerId})` comprueba formato, UUID destino, estructura del historial, enlaces entre patrones y PDF, tamaños, bytes, hash individual, resumen y hash global **antes de realizar ninguna escritura**.

### Transferencia y recuperación

- `apply({pkg,ownerId,repository,fileStore,mode:'import',acknowledge})` exige el documento del UUID autorizado; un destino con sesiones, bolas o patrones **no puede sobrescribirse** con un import ordinario.
- Los PDF se depositarían bajo rutas privadas **`<UUID>/patterns/<SHA256>.pdf`** mediante el contrato `fileStore.putNew` que prohíbe sobrescribir un archivo existente. Se releen y verifican antes de escribir el documento personal.
- El documento personal incluye `patternPdfRefs` para enlazar IDs de patrones con sus PDF, además de `migrationReceipt` con propietario, origen y hash de paquete.
- El registro personal se escribe una sola vez con revisión esperada (**CAS optimista**); el documento `league` **no se toca**. Se vuelve a consultar el documento para comprobar revisión, hash y referencia.
- `backupRemote({ownerId,...})` obtiene una copia verificada del documento y todos sus PDF existentes **antes** de restaurar. `apply({mode:'restore',beforeBackup,expectedRevision,...})` rechaza estados modificados, respaldo corrupto o revisión antigua, y obliga a confirmar el reemplazo. No elimina nunca el estado anterior almacenado en el respaldo.
- Error de cuota o denegación de escritura **antes de confirmar la escritura del documento**: si el servidor simulado confirma que el documento no cambió, se eliminan solamente los PDF nuevos y temporales. Si se pierde la respuesta después de una escritura posiblemente confirmada, **no se eliminan los PDF ni se reintenta a ciegas**: se preservan las referencias hasta verificar manualmente el resultado. Tras una escritura confirmada pero no verificable, también se detiene la operación y se conserva el material.
- El módulo **nunca elimina** originales locales ni PDFs anteriores, ni ejecuta automáticamente migraciones al iniciar sesión.

### Resultados ficticios probados

| Identidad | Origen ficticio | Historial propio | Patrones PDF | Liga Nacional |
|---|---|---|---|---|
| A | Perfil local `legacy` | Partidas 300 y 181 | 2 PDF | Acta existente A intacta; datos Liga antiguos archivados aparte |
| B | Nueva cuenta, sin datos locales migrados | **0 partidas y 0 bolas** | 0 | Acta independiente B intacta |
| C | Perfil local `p-test-c` | Partidas 157 y 201 | 1 PDF | Documento de Liga C vacío, sin importar ninguna partida ajena |

Pruebas en `tests/auth-migration-a6.test.cjs`:

- [x] Claves originales del perfil antiguo sin ningún `setItem` ni `removeItem`; PDF recuperados mediante lectura ficticia.
- [x] Rechazo de origen de perfil incorrecto y de vinculación al UUID que no ha sido confirmado.
- [x] Integridad: alteración de puntuaciones, derribos, PDF individual, ausencia de archivo y UUID equivocado.
- [x] Importación de A y C con relectura de PDF y hashes idénticos al origen, preservación de sesiones/bolas/patrones, B vacío.
- [x] Rechazo de lectura y transferencia A→B, y conservación de las actas privadas existentes de A, B y C.
- [x] Rechazo de segunda importación sobre un historial no vacío; restauración posible **solo** con respaldo previo y revisión correcta.
- [x] Protección frente a actualización concurrente con revisión obsoleta; copia de restauración dañada, denegada.
- [x] Cuota insuficiente durante carga de PDF: confirmación de documento inalterado y retirada de archivos nuevos.
- [x] Denegación RLS ficticia tras preparar PDF: no escribe el documento y retira los archivos nuevos.
- [x] Pérdida de confirmación de respuesta tras una escritura realmente completada: no elimina los PDF referenciados; solicita revisión manual.
- [x] Regresión de autenticación/permiso A5 y WebKit A4 en GitHub Actions.

**No ejecutado ni afirmado:** pruebas de políticas reales PostgreSQL RLS, permisos reales de Supabase Storage, importaciones de archivos reales, integración con el marcador publicado, PDF binarios existentes del usuario, Safari físico, comunicaciones o cuentas de correo.

## Barreras antes de conectar servicios reales

1. Autorizar proyecto Supabase **solo LAB**, verificar autenticación/confirmación, crear políticas SQL para las tablas y un bucket privado para PDF **y probarlas en Postgres/PostgREST**, tres UUID, usuarios sin correo confirmado, anónimos y sesiones caducadas.
2. Configurar un lector de IndexedDB con manejo seguro de bases antiguas (algunos Safari pueden no exponer `indexedDB.databases()`), verificar copia local exportada antes de mapear a cuenta y evitar crear accidentalmente bases inexistentes. Este lector no está implantado todavía.
3. Desarrollar una integración de Storage con permisos `read/insert/update/delete` mínimos; verificar la semántica de `putNew` y las reglas de limpieza, cuotas, límites, consistencia e historial de revisiones. El contrato `fileStore` actual **no es todavía un adaptador del SDK real**.
4. Resolver tamaño y formato de PDF en paquete JSON/Base64 (uso de memoria, exportación/descarga en iPhone, límites y cifrado de copias locales). **Los paquetes contienen datos personales sin cifrar**; la prueba del hash no protege la confidencialidad de esas copias.
5. Corregir posibles conflictos de sincronización offline antes de activar `onReady` y cargar `app.js`. Confirmar identidad y permisos después de cambiar de cuenta y al terminar cada petición.
6. Diseñar permisos para equipos y actas compartidas de Liga Nacional por separado. **No** introducirlas automáticamente en los puntos personales.
7. Resolver compatibilidad con `main` actual (portada VISURA, calendario y ajustes visuales), preservando PR #1/#8/#10/#12; validar en Safari/iPhone real y con copias recuperables antes de autorizar publicación.

**Prohibición vigente:** no crear servicios/cuentas reales, no aplicar SQL, no importar datos propios, no fusionar PR y no publicar.

Referencias actuales para diseño del backend: https://supabase.com/docs/guides/storage/security/access-control y https://supabase.com/docs/guides/database/postgres/row-level-security .
