# MI BOWLING · LAB A7 · Lectura IndexedDB y consola de restauración ficticia

**Orden de trabajo:** BOWLING-AUTH-IDB-PDF-RESTORE-LAB-A7-20261108  
**Fecha:** 8 de noviembre de 2026  
**Origen verificado:** PR #13 (`feature/auth-correo-lab-20261108`), checkpoint A6 `8803d9acf338f265d5f0647caf2f3af4c436c554` y documento `docs/AUTH_MIGRACION_RESPALDOS_LAB_A6_20261108.md`.  
**`main` al recuperar la orden:** `bb4e055fec10ec802961e8d350d01404e90a6e2b` (refinamientos VISURA).  
**PR #1, #8, #10 y #12:** intactas. **PR #13:** sigue DRAFT, sin merge ni despliegue.

## Objetivo y barreras

Preparar la futura extracción **solo lectura** de PDF antiguos de IndexedDB sin acceder ahora a ningún dato real. Probar con identidades y ficheros ficticios la secuencia completa: copiar JSON local y PDF → verificar SHA-256 → asociar al UUID expresamente elegido → guardar en documentos/file storage privados **simulados** → reabrir y comparar → restaurar únicamente con respaldo previo, revisión conocida y confirmación del usuario.

**Los únicos datos de prueba están inventados**, no contienen información personal ni credenciales. Ningún archivo A7 se carga desde la pantalla principal de MI BOWLING ni desde la PWA publicada. No se ha creado ningún proyecto o bucket real de Supabase, no se han aplicado SQL ni enviado correos.

## Código creado

- `auth-idb-pdf-reader-lab.js` — adaptador aislado de lectura por `sourceProfileId`, emplea `indexedDB.open(name)` **sin especificar nueva versión**. Cuando el nombre no existe, `onupgradeneeded` aborta su transacción para impedir crear una base persistente. Únicamente se emplea `db.transaction(['pdf'],'readonly')` y `get(patternId)`. Se cierran todas las conexiones y el lector se puede invalidar. Rechaza MIME incompatibles, cabecera diferente de `%PDF-`, valores desconocidos y archivos superiores a 20 MiB. No utiliza `put`, `delete`, `clear` ni `deleteDatabase`.
- Solo se consideran nombres de base conocidos por la PR #8: `mi-bowling-patrones-pdf-p-<perfil>` para un perfil normal, y para `legacy` primero `mi-bowling-patrones-pdf-legacy`, después la base anterior `mi-bowling-patrones-pdf`. La búsqueda nunca recorre bases o perfiles diferentes. Si falta un PDF declarado con `pdfName`, `auth-legacy-migration-lab.js` aborta todo el respaldo.
- `lab/migracion-a7.html`, `lab/migracion-a7.css`, `lab/migracion-a7-demo.js` — pantalla responsive blanco/azul con operaciones reales **contra objetos de memoria, no contra los datos del navegador ni una base externa**. Ofrece tres UUID de prueba; preparar copia, verificar, importar, simular cambio, guardar respaldo previo, restaurar, forzar cuota insuficiente, cambiar perfil y comprobar versiones. No incluye selector de archivos reales para evitar confundirla con una migración autorizada. No invoca `auth-idb-pdf-reader-lab.js` sobre bases de la persona usuaria.
- `tests/auth-indexeddb-webkit-a7.test.cjs` — prueba con navegador WebKit real (Playwright Linux, simulación iPhone 13 Pro Max, tablet y escritorio) servido desde HTTPS local con certificado temporal. Crea bases IndexedDB **ficticias en un contexto nuevo**, las lee y verifica contra SHA-256; también valida UI de tres jugadores, fallos de cuota, restauración y conflictos. Complementa la prueba con Chromium para el caso de PDF almacenado como `Blob`.
- `.github/workflows/auth-correo-lab.yml` — extiende CI A1–A6, mantiene los jobs de regresión y adjunta capturas A7.

## Cobertura de lectura y seguridad

- [x] Lectura byte a byte de PDF binario guardado en IndexedDB de prueba y verificación `%PDF-` / SHA-256.
- [x] La copia de una sesión con un patrón PDF conserva bolas, historial, puntuación y asociación de archivo.
- [x] Perfil equivocado no se consulta y no se enumeran bases o perfiles de otros jugadores.
- [x] Al abrir una base inexistente se aborta su creación automática; el lector devuelve ausencia, y el respaldo bloquea la importación cuando un patrón declara PDF inexistente.
- [x] Acceso a la base `legacy` conocida cuando falta el PDF en el almacén específico del perfil anterior.
- [x] PDF corrupto y valores inesperados rechazados; no se elimina ni sobrescribe el PDF original.
- [x] Lector cerrado rechaza nuevas operaciones.
- [x] Pantalla A/B/C: A importa historial previo, B permanece con cero partidas y bolas, C importa el suyo; documentos Liga Nacional de A/B/C sin mezclar.
- [x] Se rechazan intentos de importar otra vez sobre un destino ocupado y restauraciones con una revisión antigua.
- [x] Simulación de cuota insuficiente: la importación no queda confirmada; al reintentar con espacio disponible se completa.
- [x] Resoluciones de móvil, tablet y escritorio: controles de 44 px o más, sin desbordamiento, capturas de evidencia.
- [x] Regresión A4 (WebKit callback) y A5–A6 (RLS ficticio / copias) mantenidas en GitHub Actions.

## Importante: limitación del motor WebKit sobre PDF como Blob

En las primeras pruebas WebKit de CI **no se pudo sembrar un `Blob` en IndexedDB**: falló la transacción de escritura del propio fixture antes de que se ejecutara el lector. Las pruebas WebKit A7 se realizaron entonces con `Uint8Array` guardado en IndexedDB, que sí permitió comprobar lectura, aislamiento y reconstrucción del paquete. No debemos afirmar que esto valida en Safari la deserialización de archivos PDF originalmente guardados como `Blob`.

Se añadió una prueba complementaria de persistencia/lectura real de `Blob` en Chromium, que también se verificará en CI. La integración auténtica con el iPhone debe comprobarse más adelante con un archivo PDF ficticio creado a través de la propia aplicación en Safari/iPhone físico, con PWA instalada y sin alterar sus datos existentes.

Referencias técnicas públicas de IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB , incidencia WebKit/Playwright de archivos: https://github.com/microsoft/playwright/issues/42795 .

## Qué falta para considerarlo migración operativa

1. **No activar el lector** desde una aplicación publicada antes de confirmar el origen/usuario y una copia local recuperable, y de probar lectura de `Blob` en Safari/iPhone físico.
2. Revisar permisos RLS reales de tabla y del bucket **privado** de PDF en un laboratorio autorizado; los dobles ficticios no equivalen a protección real.
3. Diseñar archivo cifrado o traslado seguro de copias descargables; SHA-256 **no cifra** los datos ni garantiza su autenticidad.
4. Verificar en iOS tamaño de PDF, memoria durante Base64 y cuotas; hacer pruebas de error de Safari/IndexedDB, pestañas simultáneas, permisos y limpieza de temporales.
5. Integrar el motor de transferencia con la UI real, sesión Auth verificada y el `main` actual sin perder calendario, perfiles, estadísticas ni pista 3D. No conectar Liga Nacional entre cuentas sin permisos explícitos de equipo.
6. Solicitar autorización expresa **antes** de crear cuentas, servicios, aplicar SQL o publicar.

**Estado:** trabajo A7 de lector y pantalla en LAB con datos ficticios. El SHA exacto y la ejecución final de CI se registrarán una vez concluidas todas las pruebas.
