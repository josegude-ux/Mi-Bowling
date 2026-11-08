# MI BOWLING · LAB A8 · PDF Blob, Safari/PWA y Storage privado UUID

**Orden:** BOWLING-AUTH-STORAGE-BLOB-SAFARI-LAB-A8-20261108  
**Fecha:** 8 de noviembre de 2026  
**PR:** #13, rama `feature/auth-correo-lab-20261108`, **borrador sin fusionar**  
**Base verificada:** A7 `864cdaa688d80bf902b3ac83d725d0832d6ab270`, `docs/AUTH_INDEXEDDB_RESTAURACION_LAB_A7_20261108.md`, CI `42525402426` SUCCESS.  
**Código A8 probado:** `785f4b2920da1856f14378d2f713d7a4078f83a3`  
**CI A8 verificado:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42526414876 — jobs `auth-lab` y `webkit-ios-lab` SUCCESS.

## Objetivo y alcance

A8 prepara la futura conservación privada de PDF de patrones de aceite por UUID y amplía la validación de lectura de `Blob`, fallos IndexedDB, recuperación tras navegación y aislamiento Safari/PWA. **Todos los jugadores y archivos utilizados son ficticios**. No se han leído archivos reales del usuario ni se ha conectado ningún proveedor externo. Ningún componente A8 está enlazado desde la página publicada.

### Archivos

- `auth-idb-pdf-reader-lab.js` — lector por perfil `readonly` de A7. A8 añade un contador interno de generación: cerrar el lector invalida las lecturas de `Blob.arrayBuffer()` que hayan quedado pendientes. Nunca abre otra cuenta, ni ejecuta actualizaciones, borrados o enumeraciones de bases.
- `auth-private-pdf-storage-lab.js` — contrato para un futuro adaptador de Storage: nombre de bucket fijado `bowling-private-patterns-lab`, ruta `<UUID>/patterns/<sha256>.pdf`, tamaño máximo 20 MiB, MIME `application/pdf`, encabezado `%PDF-`, SHA-256 de ruta igual al contenido, descarga revisada, subida inmutable `upsert:false`.
- `tests/private-storage-policy-mock-a8.cjs` — doble independiente de autorización del servidor, sin red ni base de datos. Simula `auth.uid()`, `authenticated` y `is_anonymous`, bucket privado, rutas de propietario, cuotas, conflictos y borrados controlados.
- `tests/auth-storage-a8.test.cjs` — matriz A/B/C: subida y descarga de cada UUID; seis direcciones de acceso cruzado rechazadas por cliente y por servidor simulado; rutas manipuladas, checksum, duplicado, quota, propietario cambiado mientras llega la descarga, y conexión de la migración A6 con el contrato nuevo.
- `tests/auth-blob-webkit-a8.test.cjs` — motor WebKit real de Playwright Linux con iPhone 13 Pro Max emulado: Blob leído mediante una API IndexedDB **simulada**, MIME/tamaño/cabecera, abort, bloqueo, excepción de cuota y cierre durante operación; prueba exploratoria de persistencia nativa Blob; dos contextos separados Safari/PWA con IndexedDB **real de Uint8Array** y relectura después de navegación.
- `.github/workflows/auth-correo-lab.yml` — conserva los tests A1–A7 y ejecuta los nuevos de A8, con capturas.

## Qué se ha demostrado en CI

### WebKit / iPhone emulado / IndexedDB

- [x] `Blob.arrayBuffer()` en el motor WebKit devuelve exactamente los bytes esperados a través del lector, con `Blob` servido por un *doble* de IndexedDB; hash SHA-256 conservado.
- [x] MIME incorrecto, encabezado no PDF, tamaño superior al máximo permitido y archivos faltantes: rechazados.
- [x] Apertura bloqueada, transacción cancelada y error `QuotaExceededError` simulado: errores comunicados sin intentar sobrescribir datos.
- [x] Cierre del lector durante lectura asíncrona de Blob: respuesta invalidada y no entregada al contexto ya cerrado.
- [x] Dos contextos WebKit independientes: un contexto PWA ficticio conserva sus bytes `Uint8Array` en IndexedDB; Safari ficticio no los ve y no puede copiar el historial; reabrir el contexto original recupera los mismos bytes.
- [x] Regresión A7: WebKit con `Uint8Array` almacenado realmente en IndexedDB, y Chromium con `Blob` almacenado realmente en IndexedDB; UI de importación/restauración de los UUID A/B/C en móvil, tablet y escritorio, conflictos y cuotas.
- [x] Regresión A4 de correo/PKCE y A5–A6 de documentos privados, respaldos y PDF recuperables.

**Advertencia expresa:** al intentar sembrar un `Blob` PDF en IndexedDB **nativo** de WebKit Linux 27.2, el motor de CI devolvió `native Blob transaction failed no reason`. Por tanto, el circuito completo `Blob` persistido y posteriormente recuperado por Safari/iPhone físico **NO está validado**. Se ha probado por separado el código de lectura Blob en WebKit, la persistencia real de Uint8Array en WebKit y la persistencia real de Blob en Chromium. No se deben interpretar esas tres pruebas separadas como una certificación de Safari físico.

### Contrato de Storage simulado

- [x] Tres identidades A/B/C con objetos `<UUID>/patterns/<sha256>.pdf` independientes. Un usuario no puede leer, subir ni eliminar objetos ajenos, ni siquiera cuando evita el filtro del adaptador y llama al mock del proveedor directamente.
- [x] Cliente `auth.getUser()` validado antes y después de las operaciones; correo sin confirmar, cuenta anónima, sesión caducada y UUID malformado bloqueados en el adaptador.
- [x] Rutas atravesadas (`../`), extensiones distintas, SHA mayúsculo/no coincidente, PDF inválido y tamaño excesivo rechazados.
- [x] `upsert:false`, duplicado solo aceptado si una descarga verifica que el archivo existente tiene exactamente el mismo SHA; si hay alteración, se bloquea.
- [x] Error de cuota, lectura de objeto ausente, colisión, cambio de usuario durante una petición, borrado repetido y borrado de un objeto no marcado temporal bloqueados de acuerdo con el contrato.
- [x] Importación A6 con usuario C ficticio y lectura posterior de documento personal y PDF desde el nuevo contrato; la sección `league` permanece vacía e independiente.
- [x] No se generan URL públicas ni enlaces de descarga firmados desde el contrato A8.

## Limitaciones del control de acceso

- **Es un simulador**, no una ejecución RLS de PostgreSQL o `storage.objects`. Aunque el doble rechaza accesos cruzados, el proyecto real requerirá políticas y pruebas de acceso por servidor. Un filtro en frontend no es protección suficiente.
- El modelo de RLS reproduce el propietario `auth.uid()`, el rol `authenticated` y el indicador de cuenta anónima. **No comprueba por sí solo que el correo esté confirmado**; esa restricción sigue en Auth y en el adaptador `getUser()`. Debe comprobarse también en integración real.
- `remove()` en el cliente solo acepta objetos **creados temporalmente en la misma instancia** durante una migración. **Esta regla local no puede sustituir una política SQL**: un cliente malicioso podría invocar Storage directamente si el servidor concediera DELETE general al propietario.
- Recomendación antes de producción: diseñar inicialmente permisos de bucket privado `SELECT` para el propietario y `INSERT` restringido a objetos inmutables bajo su carpeta; **no conceder UPDATE/upsert o DELETE amplios por comodidad**. El borrado de huérfanos temporales exige mecanismo autorizado, comprobación de referencias y pruebas; todavía no se ha implementado.
- Un SHA-256 **no cifra** los PDF, no prueba la identidad del archivo ni garantiza su confidencialidad. Respaldos exportables requerirán cifrado/retención gestionada aparte.
- El contrato no crea bucket, no instala un cliente Supabase, no establece políticas SQL, no genera claves, no llama a servicios ni está conectado a las partidas reales.

## Preparación del Storage privado REAL — no ejecutar en A8

Cuando exista una autorización nueva para LAB real, revisar con la documentación oficial:

1. Bucket **privado**, no público, con MIME `application/pdf` y límite de tamaño apropiado, sin URL públicas. Validar configuración de buckets y las opciones reales del SDK fijado.
2. Políticas `storage.objects` para acceso estrictamente al propio UUID (`auth.uid()` comparado con la primera carpeta de `name`) y rutas válidas de PDF. Comprobar `SELECT` de descarga y exposición de listados; configurar `INSERT` sin actualización ni enlaces públicos. **Ninguna política se ha ejecutado**.
3. Probar clientes reales A/B/C, anónimos y sesiones expiradas. No confiar en `getUser()` como único control: el servidor debe aplicar RLS.
4. Diseñar conciliación de referencias entre documentos `personal` y Storage, restauración de respaldos, limpieza autorizada de temporales y archivos conservados ante respuestas de red ambiguas.
5. Probar PDF `Blob` almacenados realmente desde Safari en iPhone físico y PWA instalada, cuotas, cierres, reanudación offline y entrega de correo, sin tocar historial personal existente.
6. Comparar la PR #13 y esta fase con el `main` actual, preservando la portada VISURA, calendario FGB y las PR #1/#8/#10/#12 antes de considerar cualquier publicación.

## Evidencia

- CI A8: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42526414876
- Logs: `OK · WebKit Blob.arrayBuffer mocked IDB ...`, `WebKit Linux native IndexedDB Blob probe: not-verified-in-linux-webkit`, `OK · 2 WebKit iPhone contexts ...`.
- Capturas: artefacto del job `mi-bowling-auth-webkit-a8`, más capturas de callbacks en `mi-bowling-auth-callback-lab`.

**Estado de seguridad:** LAB aislado con dobles ficticios. Sin cuentas/proyectos, envíos, SQL, despliegue, merge o alteración de datos personales.

**Documentación técnica oficial:** https://supabase.com/docs/guides/storage/security/access-control ; https://supabase.com/docs/guides/storage/buckets/fundamentals ; https://supabase.com/docs/guides/storage/schema/helper-functions .
