# MI BOWLING · LAB A5 · Protección de puntuaciones por UUID y Liga Nacional

**Orden:** BOWLING-AUTH-RLS-TRES-JUGADORES-LAB-A5-20261108  
**Fecha:** 8 de noviembre de 2026  
**Rama y PR:** `feature/auth-correo-lab-20261108`, PR #13 (borrador).  
**Checkpoint de partida recuperado:** `d86d5a357f490dc6c8122c0762fbe9888737efac` — documento `AUTH_WEBKIT_PWA_LAB_A4_20261108.md`.  
**`main` comprobado:** `85f09e9082512f111a70d9739964126688fc23cb` (portada VISURA/calendario CP-018), sin modificación.  
**PR #1, #8, #10, #12:** conservadas intactas y sin fusiones.

## Resultado

Se conserva el adaptador real de consultas `auth-private-repository.js` de la PR #13 y se ha probado frente a un doble aislado del servidor que implementa restricciones análogas a RLS. **No es una ejecución de SQL en PostgreSQL**: las políticas del archivo `docs/sql/BOWLING_AUTH_RLS_A1_REVIEW_ONLY.sql` únicamente se inspeccionan estáticamente, sin ejecutarlas contra Supabase ni contra otra base de datos.

### Datos ficticios: tres perfiles UUID

| Caso | Puntuaciones personales | Liga Nacional |
| --- | --- | --- |
| Jugador A | 300 y 181 | Actas con totales 195 y 200 |
| Jugador B | Cuenta nueva: 0 partidas y 0 bolas | Acta independiente con total 140 |
| Jugador C | 157 y 201 | Sin actas: documento Liga vacío |

Cada usuario obtiene dos documentos lógicos independientes por clave compuesta `(user_id, doc_type)`: `personal` y `league`. Las partidas y bolas del usuario activo se utilizan solo en su espacio personal; un acta de Liga no se importa a sus puntuaciones por defecto.

**Importante:** todavía no existe un modelo de permisos de equipo para compartir actas entre jugadores. Hasta autorizar y validar expresamente los roles de equipo, `league` también es estrictamente privado de su propietario.

### Protecciones desarrolladas

1. `auth-private-repository.js` comprueba el UUID del usuario mediante `client.auth.getUser()` antes **y después** de operaciones de almacenamiento. Si se cambia de cuenta durante una petición, el resultado queda bloqueado en vez de devolverse a otra sesión.
2. `load(owner)` rechaza filas de otros UUID, tipos de documento inesperados, revisiones inválidas, filas duplicadas y documentos malformados.
3. `write(owner,kind,payload,expectedRevision)` rechaza mezclas de contenido: `personal` no admite actas/rosters de Liga; `league` no admite sesiones, bolas ni patrones personales.
4. La creación requiere `expectedRevision=null` y solo funciona si el documento no existe. La actualización exige la revisión exacta y una única fila actualizada, evitando pisar cambios concurrentes de manera silenciosa.
5. La regla simulada del servidor comprueba simultáneamente el rol, UUID propietario y la ausencia de indicador anónimo, tanto en `SELECT` como en `INSERT` (`WITH CHECK`) y `UPDATE` (`USING` y `WITH CHECK`). No hay permiso de `DELETE` en A5.
6. Se comprueba también el rechazo de operaciones directas que intentan **evadir los filtros del cliente**: no basta que el código JavaScript seleccione `eq('user_id',owner)`; el servicio de datos debe aplicar las mismas restricciones por cuenta.
7. Ninguna ruta de autenticación ni de esta simulación contiene credenciales reales ni accede al historial publicado, localStorage, IndexedDB, Supabase o cualquier conexión de producción.

### Cobertura comprobable

**`tests/rls-mock-server.cjs`** implementa un servidor falso en memoria; no requiere bases de datos, puertos ni red externa.

**`tests/auth-three-users-rls-a5.test.cjs`** ejecuta el adaptador de repositorio real sobre los tres UUID ficticios, comprobando:

- [x] A puede leer sus sesiones y actas; B empieza con cero sesiones y bolas; C recupera únicamente sus dos partidas.
- [x] Las seis combinaciones A→B, A→C, B→A, B→C, C→A y C→B deniegan SELECT, INSERT y UPDATE cruzados.
- [x] Rechazo por intento directo de modificar `user_id` desde una sesión autenticada (simulación de `WITH CHECK`).
- [x] No se admite duplicar un documento existente por INSERT ni sobrescribirlo con revisión antigua.
- [x] Las modificaciones de Liga B no modifican ninguna puntuación B ni actas A.
- [x] Anónimo autenticado, rol `anon` sin sesión y sesión caducada denegados tanto por el repositorio como por el modelo RLS.
- [x] Email sin confirmar denegado por `getUser()` y la comprobación del repositorio.
- [x] Cambio de cuenta durante consulta pendiente: no se entrega el documento al usuario nuevo.
- [x] Rechazadas respuestas maliciosas del servidor (propietario incorrecto, tipo desconocido, duplicados o contenido de Liga en documento personal).
- [x] Contrato SQL inspeccionado: RLS activado, `SELECT/INSERT/UPDATE` limitados a `authenticated`, `auth.uid() = user_id`, verificación de usuario anónimo, `WITH CHECK` y ausencia de `DELETE` o `SECURITY DEFINER`.

### Barrera de seguridad que sigue pendiente

**RLS por UUID no demuestra que el email esté confirmado.** Un JWT con rol `authenticated` y UUID puede superar el RLS propuesto incluso si el correo no está confirmado. La aplicación exige `email_confirmed_at` en `getUser()` y el proveedor futuro deberá tener activada la confirmación obligatoria del email. Nunca atribuir a estas políticas una comprobación de correo que no codifican.

**La ejecución de SQL real aún no ha tenido lugar.** Para aprobar privacidad en un sistema real hay que crear, bajo autorización, un proyecto de LAB y realizar pruebas efectivas sobre PostgreSQL/PostgREST con JWT de A, B, C, anónimo y cuenta sin confirmar. Revisar también visibilidad de tablas, grants, políticas, expiración de tokens, funciones, views, storage/PDF y acceso a equipos antes del despliegue.

### Alcance y continuidad

- `tests/auth-three-users-rls-a5.test.cjs` y `tests/rls-mock-server.cjs` se ejecutan en `.github/workflows/auth-correo-lab.yml`, junto con los tests anteriores de autenticación, WebKit, iPhone emulado y callbacks.
- **No se han creado cuentas ni proyectos**, no se ha aplicado SQL, no se han modificado datos reales ni enviado emails, y no se ha fusionado o publicado ninguna rama.
- Continuación prioritaria: pruebas de respaldo/migración de partidas antiguas y PDF con datos ficticios, y compatibilidad aislada con `main` CP-018. La conexión real requiere autorización nueva.

**Estado:** LAB A5 de aislamiento de tres UUID preparado y probado con servidor ficticio; **RLS en PostgreSQL sigue pendiente de verificación real**.

Fuentes oficiales: https://supabase.com/docs/guides/database/postgres/row-level-security ; https://supabase.com/docs/guides/api/securing-your-api ; https://supabase.com/docs/guides/auth/auth-anonymous ; https://supabase.com/docs/reference/javascript/update .
